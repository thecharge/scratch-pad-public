import { join } from "node:path";
import {
  AstNodeType,
  MessageId,
  PROMISE_ALL_GLOBS,
  PROMISE_ALL_IGNORE_FILE,
  PROMISE_ALL_METHOD,
  PROMISE_OBJECT,
  STRUCTURE_PARSER_LANG,
  UNIT_SOURCE_EXCLUDED,
} from "@platform/constants";
import { message } from "@platform/messages";
import {
  type AstNode,
  type AsyncFinding,
  type AsyncIgnore,
  type AsyncIgnoreEntry,
  AsyncIgnoreSchema,
  type SourceFile,
} from "@platform/types";
import { parse } from "oxc-parser";
import { childrenOf, lineOf } from "./ast.ts";
import { readSources } from "./source-files.ts";
import { finish, REPO_ROOT } from "./tools.ts";

async function isPromiseAll(node: AstNode): Promise<boolean> {
  const object = node.object as AstNode | undefined;
  const property = node.property as AstNode | undefined;
  return (
    node.type === AstNodeType.Member &&
    object?.name === PROMISE_OBJECT &&
    property?.name === PROMISE_ALL_METHOD
  );
}

async function visit(node: AstNode, source: SourceFile): Promise<AsyncFinding[]> {
  const found: AsyncFinding[] = [];
  const pending = [node];
  while (pending.length > 0) {
    const current = pending.pop() as AstNode;
    if (current.type === AstNodeType.Member && (await isPromiseAll(current))) {
      found.push({
        file: source.file,
        line: await lineOf(source.text, current.start),
        name: PROMISE_ALL_METHOD,
      });
    }
    pending.push(...(await childrenOf(current)).reverse());
  }
  return found;
}

export async function promiseAllUses(source: SourceFile): Promise<AsyncFinding[]> {
  const parsed = await parse(source.file, source.text, { lang: STRUCTURE_PARSER_LANG });
  return visit(parsed.program as unknown as AstNode, source);
}

export async function ignoreConfig(root: string): Promise<AsyncIgnore> {
  const file = Bun.file(join(root, PROMISE_ALL_IGNORE_FILE));
  return (await file.exists()) ? AsyncIgnoreSchema.parse(await file.json()) : { entries: [] };
}

export async function allUses(root: string): Promise<AsyncFinding[]> {
  const sources = await readSources(PROMISE_ALL_GLOBS, root);
  const kept = sources.filter(
    (source) => !UNIT_SOURCE_EXCLUDED.some((pattern) => pattern.test(source.file)),
  );
  const found: AsyncFinding[] = [];
  for (const source of kept) {
    found.push(...(await promiseAllUses(source)));
  }
  return found;
}

async function usesOf(found: readonly AsyncFinding[], entry: AsyncIgnoreEntry) {
  return found.filter((finding) => new Bun.Glob(entry.path).match(finding.file));
}

async function covered(
  finding: AsyncFinding,
  ignore: AsyncIgnore,
  found: readonly AsyncFinding[],
): Promise<boolean> {
  for (const entry of ignore.entries) {
    const uses = await usesOf(found, entry);
    if (uses.includes(finding) && (entry.maximum === undefined || uses.length <= entry.maximum)) {
      return true;
    }
  }
  return false;
}

export async function promiseAllViolations(
  root: string,
  findings?: readonly AsyncFinding[],
): Promise<AsyncFinding[]> {
  const ignore = await ignoreConfig(root);
  const found = findings ?? (await allUses(root));
  const violations: AsyncFinding[] = [];
  for (const finding of found) {
    if (!(await covered(finding, ignore, found))) {
      violations.push(finding);
    }
  }
  return violations;
}

export async function staleIgnores(
  root: string,
  findings?: readonly AsyncFinding[],
): Promise<string[]> {
  const ignore = await ignoreConfig(root);
  const found = findings ?? (await allUses(root));
  const stale: string[] = [];
  for (const entry of ignore.entries) {
    const used = (await usesOf(found, entry)).length;
    if (used === 0 || (entry.maximum !== undefined && used < entry.maximum)) {
      stale.push(entry.path);
    }
  }
  return stale;
}

export async function checkPromiseAll(root: string = REPO_ROOT): Promise<number> {
  const found = await allUses(root);
  const violations = await promiseAllViolations(root, found);
  const stale = await staleIgnores(root, found);
  return finish(
    [
      ...violations.map(({ file, line }) => message(MessageId.PromiseAllViolation, { file, line })),
      ...stale.map((path) => message(MessageId.PromiseAllIgnoreStale, { path })),
    ],
    message(MessageId.PromiseAllOk),
  );
}

if (import.meta.main) process.exit(await checkPromiseAll());
