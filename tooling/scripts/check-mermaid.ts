import { relative } from "node:path";
import {
  FileGlob,
  FileSuffix,
  MERMAID_FENCE,
  MERMAID_HTML,
  MessageId,
  Separator,
  SkippedDir,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { flatMapAsync } from "@platform/store";
import type { MermaidBlock, MermaidFailure } from "@platform/types";
import { all } from "@platform/util";
import { JSDOM } from "jsdom";
import { REPO_ROOT } from "./tools.ts";

const SKIPPED = Object.values(SkippedDir) as string[];
const FIRST_LINES = 3;

export async function extractBlocks(file: string, text: string): Promise<MermaidBlock[]> {
  return [...text.matchAll(MERMAID_FENCE)].map((match, index) => ({
    file,
    index: index + 1,
    source: match[1] ?? Text.Empty,
  }));
}

async function parser(): Promise<(source: string) => Promise<unknown>> {
  const dom = new JSDOM(MERMAID_HTML);
  Object.assign(globalThis, { window: dom.window, document: dom.window.document });
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({ startOnLoad: false });
  return async (source) => mermaid.parse(source);
}

async function failureOf(
  parse: (source: string) => Promise<unknown>,
  block: MermaidBlock,
): Promise<MermaidFailure | undefined> {
  return parse(block.source).then(
    () => undefined,
    (error: unknown) => ({
      block,
      message: (error instanceof Error ? error.message : String(error))
        .split(Text.Newline)
        .slice(0, FIRST_LINES)
        .join(Separator.Detail),
    }),
  );
}

export async function checkBlocks(blocks: MermaidBlock[]): Promise<MermaidFailure[]> {
  const parse = await parser();
  const results = await all(blocks.map((block) => async () => failureOf(parse, block)));
  return results.filter((result): result is MermaidFailure => result !== undefined);
}

async function defaultFiles(): Promise<string[]> {
  const found = await Array.fromAsync(new Bun.Glob(FileGlob.Markdown).scan({ cwd: REPO_ROOT }));
  return found
    .filter(
      (path) =>
        !SKIPPED.some(
          (dir) =>
            path.startsWith(dir) || path.includes([Separator.Resource, dir].join(Text.Empty)),
        ),
    )
    .sort();
}

export async function checkMermaid(args: readonly string[] = []): Promise<number> {
  const marked = args.filter((arg) => arg.endsWith(FileSuffix.Markdown));
  const files = marked.length > 0 ? marked : await defaultFiles();
  const texts = await all(files.map((file) => async () => Bun.file(file).text()));
  const blocks = await flatMapAsync(files, async (file, index) =>
    extractBlocks(relative(REPO_ROOT, file) || file, texts[index] ?? Text.Empty),
  );
  const failures = await checkBlocks(blocks);
  for (const { block, message: detail } of failures) {
    console.error(
      message(MessageId.MermaidFailure, { file: block.file, index: block.index, detail }),
    );
  }
  console.log(
    message(MessageId.MermaidSummary, {
      parsed: blocks.length - failures.length,
      total: blocks.length,
    }),
  );
  return failures.length > 0 ? 1 : 0;
}

if (import.meta.main) process.exit(await checkMermaid(Bun.argv.slice(2)));
