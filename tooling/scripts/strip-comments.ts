import { basename, join } from "node:path";
import {
  BLOCK_COMMENT_PATTERN,
  COMMENT_CHECK_FLAG,
  COMMENT_FILE_LIST,
  COMMENT_MARK,
  COMMENT_NAME_STYLES,
  COMMENT_OPENER,
  COMMENT_SUFFIX_STYLES,
  CommentStyle,
  EXTERNAL_TOOL_FILES,
  MARK_RESIDUE,
  MARKDOWN_FENCE,
  MARKED_LINE,
  MARKUP_COMMENT_PATTERN,
  MessageId,
  Runner,
  SkippedDir,
  SLASH_COMMENT_PATTERN,
  STDIN_FLAG,
  STRUCTURE_PARSER_LANG,
  Text,
  TSX_PARSER_LANG,
  YAML_COMMENT,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync, reduceAsync } from "@platform/store";
import { all } from "@platform/util";
import { parse } from "oxc-parser";
import { REPO_ROOT, run } from "./tools.ts";

const SKIPPED = Object.values(SkippedDir) as string[];

export async function styleOf(file: string): Promise<CommentStyle | undefined> {
  const name = basename(file);
  const suffix = Object.keys(COMMENT_SUFFIX_STYLES).find((candidate) => name.endsWith(candidate));
  return (
    COMMENT_NAME_STYLES[name] ?? (suffix === undefined ? undefined : COMMENT_SUFFIX_STYLES[suffix])
  );
}

export async function stripYamlComments(source: string): Promise<string> {
  return source
    .split(Text.Newline)
    .filter((line) => !YAML_COMMENT.test(line))
    .join(Text.Newline);
}

async function lineBounds(source: string, start: number, end: number) {
  const lineStart = source.lastIndexOf(Text.Newline, start - 1) + 1;
  const found = source.indexOf(Text.Newline, end);
  return { lineStart, lineEnd: found === -1 ? source.length : found };
}

async function remove(source: string, start: number, end: number): Promise<string> {
  const { lineStart, lineEnd } = await lineBounds(source, start, end);
  const before = source.slice(lineStart, start);
  const after = source.slice(end, lineEnd);
  const whole = before.trim() === Text.Empty && after.trim() === Text.Empty;
  const from = whole ? lineStart : start - (before.length - before.trimEnd().length);
  const to = whole ? Math.min(lineEnd + 1, source.length) : end;
  return source.slice(0, from) + source.slice(to);
}

export async function stripComments(file: string, source: string, isTsx = false): Promise<string> {
  const { comments } = await parse(file, source, {
    lang: isTsx ? TSX_PARSER_LANG : STRUCTURE_PARSER_LANG,
  });
  return await reduceAsync(
    [...comments].sort((a, b) => b.start - a.start),
    async (text, comment) => remove(text, comment.start, comment.end),
    source,
  );
}

async function markComments(source: string, pattern: RegExp): Promise<string> {
  return source.replace(pattern, (match) => (COMMENT_OPENER.test(match) ? COMMENT_MARK : match));
}

async function clearMarks(source: string): Promise<string> {
  return source.replace(MARKED_LINE, Text.Empty).replace(MARK_RESIDUE, Text.Empty);
}

export async function stripPatternComments(source: string, pattern: RegExp): Promise<string> {
  return clearMarks(await markComments(source, pattern));
}

export async function stripMarkupComments(source: string): Promise<string> {
  return (
    await all(
      source
        .split(MARKDOWN_FENCE)
        .map(
          (part, index) => async () =>
            index % 2 === 1 ? part : await stripPatternComments(part, MARKUP_COMMENT_PATTERN),
        ),
    )
  ).join(Text.Empty);
}

export async function stripSource(file: string, source: string): Promise<string> {
  const style = await styleOf(file);
  const strippers: Record<CommentStyle, () => Promise<string> | string> = {
    [CommentStyle.Typescript]: async () => stripComments(file, source),
    [CommentStyle.Tsx]: async () => stripComments(file, source, true),
    [CommentStyle.Hash]: async () => stripYamlComments(source),
    [CommentStyle.Markup]: async () => stripMarkupComments(source),
    [CommentStyle.Slash]: async () => stripPatternComments(source, SLASH_COMMENT_PATTERN),
    [CommentStyle.Block]: async () => stripPatternComments(source, BLOCK_COMMENT_PATTERN),
  };
  return style === undefined ? source : strippers[style]();
}

export async function firstDifferentLine(before: string, after: string): Promise<number> {
  const left = before.split(Text.Newline);
  const right = after.split(Text.Newline);
  const found = left.findIndex((line, index) => line !== right[index]);
  return found === -1 ? 0 : found + 1;
}

export async function isSkipped(path: string): Promise<boolean> {
  return (
    SKIPPED.some((dir) => path.includes(dir)) ||
    EXTERNAL_TOOL_FILES.includes(path) ||
    (await styleOf(path)) === undefined
  );
}

export async function discover(root: string = REPO_ROOT): Promise<string[]> {
  const listed = await run([Runner.Git, ...COMMENT_FILE_LIST], { cwd: root });
  return await filterAsync(
    listed.stdout.split(Text.Newline).filter((path) => path.length > 0),
    async (path) => !(await isSkipped(path)),
  );
}

async function wipe(file: string): Promise<void> {
  const source = await Bun.file(file).text();
  const next = await stripSource(file, source);
  if (next !== source) {
    await Bun.write(file, next);
  }
}

async function wipeStdin(file: string, stdin: () => Promise<string>): Promise<void> {
  const source = await stdin();
  process.stdout.write(await stripSource(file, source));
}

export async function stripFiles(
  args: readonly string[],
  stdin: () => Promise<string> = Bun.stdin.text.bind(Bun.stdin),
  root: string = REPO_ROOT,
): Promise<number> {
  const [flag, path = Text.Empty] = args;
  if (flag === STDIN_FLAG) {
    await wipeStdin(path, stdin);
    return 0;
  }
  const checking = flag === COMMENT_CHECK_FLAG;
  const selected = checking ? args.slice(1) : args;
  const named =
    selected.length > 0 ? selected : (await discover(root)).map((file) => join(root, file));
  const files = await filterAsync(named, async (file) => !(await isSkipped(file)));
  if (checking) {
    const changed = await filterAsync(files, async (file) => {
      const source = await Bun.file(file).text();
      return source !== (await stripSource(file, source));
    });
    for (const file of changed) console.error(file, message(MessageId.CommentNotAllowed));
    return changed.length === 0 ? 0 : 1;
  }
  await all(files.map((file) => async () => wipe(file)));
  return 0;
}

if (import.meta.main) process.exitCode = await stripFiles(Bun.argv.slice(2));
