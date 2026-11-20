import { join } from "node:path";
import {
  ASYNC_IGNORE_FILE,
  AstNodeType,
  MessageId,
  MethodKindName,
  STRUCTURE_PARSER_LANG,
  Text,
  TYPE_PREDICATE,
  UNIT_SOURCE_EXCLUDED,
  UNIT_SOURCE_GLOBS,
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
import { all } from "@platform/util";
import { parse } from "oxc-parser";
import { childrenOf, lineOf } from "./ast.ts";
import { readSources } from "./source-files.ts";
import { finish, REPO_ROOT } from "./tools.ts";

const FUNCTION_TYPES: readonly string[] = [
  AstNodeType.FunctionDeclaration,
  AstNodeType.FunctionExpression,
  AstNodeType.ArrowFunction,
];
const CALLBACK_PARENTS: readonly string[] = [AstNodeType.Call, AstNodeType.New];
const SPECIAL_METHODS: readonly string[] = Object.values(MethodKindName);

async function keyName(node: AstNode | undefined): Promise<string> {
  const key = node?.key as AstNode | undefined;
  return (key?.name as string | undefined) ?? Text.Empty;
}

async function nameOf(node: AstNode, parent: AstNode | undefined): Promise<string> {
  const own = (node.id as AstNode | null | undefined)?.name as string | undefined;
  const declared = (parent?.id as AstNode | undefined)?.name as string | undefined;
  return own ?? declared ?? (await keyName(parent));
}

async function isPredicate(node: AstNode): Promise<boolean> {
  const returned = node.returnType as AstNode | undefined;
  return (returned?.typeAnnotation as AstNode | undefined)?.type === TYPE_PREDICATE;
}

async function isExempt(node: AstNode, parent: AstNode | undefined): Promise<boolean> {
  return (
    CALLBACK_PARENTS.includes(parent?.type ?? Text.Empty) ||
    SPECIAL_METHODS.includes((parent?.kind as string | undefined) ?? Text.Empty) ||
    (await isPredicate(node))
  );
}

async function isViolation(node: AstNode, parent: AstNode | undefined): Promise<boolean> {
  return (
    FUNCTION_TYPES.includes(node.type) && node.async !== true && !(await isExempt(node, parent))
  );
}

async function visit(
  node: AstNode,
  parent: AstNode | undefined,
  source: SourceFile,
): Promise<AsyncFinding[]> {
  const own = (await isViolation(node, parent))
    ? [
        {
          file: source.file,
          line: await lineOf(source.text, node.start),
          name: await nameOf(node, parent),
        },
      ]
    : [];
  const nested = await all(
    (await childrenOf(node)).map((child) => async () => visit(child, node, source)),
  );
  return [...own, ...nested.flat()];
}

export async function syncFunctions(source: SourceFile): Promise<AsyncFinding[]> {
  const parsed = await parse(source.file, source.text, { lang: STRUCTURE_PARSER_LANG });
  return visit(parsed.program as unknown as AstNode, undefined, source);
}

async function matches(finding: AsyncFinding, entry: AsyncIgnoreEntry): Promise<boolean> {
  return (
    new Bun.Glob(entry.path).match(finding.file) &&
    (entry.names === undefined || entry.names.includes(finding.name))
  );
}

export async function matched(
  found: readonly AsyncFinding[],
  entry: AsyncIgnoreEntry,
): Promise<AsyncFinding[]> {
  const flags = await all(found.map((finding) => async () => matches(finding, entry)));
  return found.filter((_finding, index) => flags[index]);
}

export async function isIgnored(
  finding: AsyncFinding,
  ignore: AsyncIgnore,
  found: readonly AsyncFinding[] = [finding],
): Promise<boolean> {
  const verdicts = await all(
    ignore.entries.map(
      (entry) => async () =>
        (await matches(finding, entry)) &&
        (entry.maximum === undefined || (await matched(found, entry)).length <= entry.maximum),
    ),
  );
  return verdicts.some(Boolean);
}

export async function ignoreConfig(root: string): Promise<AsyncIgnore> {
  const file = Bun.file(join(root, ASYNC_IGNORE_FILE));
  return (await file.exists()) ? AsyncIgnoreSchema.parse(await file.json()) : { entries: [] };
}

export async function allSyncFunctions(root: string): Promise<AsyncFinding[]> {
  const sources = await readSources(UNIT_SOURCE_GLOBS, root);
  const kept = sources.filter(
    (source) => !UNIT_SOURCE_EXCLUDED.some((pattern) => pattern.test(source.file)),
  );
  return (await all(kept.map((item) => async () => syncFunctions(item)))).flat();
}

export async function asyncViolations(root: string): Promise<AsyncFinding[]> {
  const ignore = await ignoreConfig(root);
  const found = await allSyncFunctions(root);
  const flags = await all(found.map((finding) => async () => isIgnored(finding, ignore, found)));
  return found.filter((_finding, index) => !flags[index]);
}

export async function staleIgnores(root: string): Promise<string[]> {
  const ignore = await ignoreConfig(root);
  const found = await allSyncFunctions(root);
  const used = await all(
    ignore.entries.map((entry) => async () => (await matched(found, entry)).length),
  );
  return ignore.entries
    .filter(
      (entry, index) =>
        used[index] === 0 || (entry.maximum !== undefined && (used[index] ?? 0) < entry.maximum),
    )
    .map((entry) => entry.path);
}

export async function checkAsyncFunctions(root: string = REPO_ROOT): Promise<number> {
  const violations = await asyncViolations(root);
  const stale = await staleIgnores(root);
  return finish(
    [
      ...violations.map(({ file, line, name }) =>
        message(MessageId.AsyncFunctionViolation, { file, line, name }),
      ),
      ...stale.map((path) => message(MessageId.AsyncIgnoreStale, { path })),
    ],
    message(MessageId.AsyncFunctionsOk),
  );
}

if (import.meta.main) process.exit(await checkAsyncFunctions());
