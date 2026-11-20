import {
  AstNodeType,
  CONSTRUCTOR_KIND,
  EAGER_COLLECTIONS,
  HEAVY_MODULES,
  LAZY_IGNORED_PATHS,
  MessageId,
  STORE_PACKAGE_PATH,
  StructureRule,
  SYNC_API_SUFFIX,
  Text,
  YAML_COMMENT,
} from "@platform/constants";
import { message } from "@platform/messages";
import { flatMapAsync } from "@platform/store";
import type { AstNode, ParsedComment, StructureViolation } from "@platform/types";
import { all } from "@platform/util";
import { childrenOf, lineOf } from "./ast.ts";

const FUNCTION_TYPES: readonly string[] = [
  AstNodeType.FunctionDeclaration,
  AstNodeType.FunctionExpression,
  AstNodeType.ArrowFunction,
];

export async function commentViolations(
  file: string,
  source: string,
  comments: readonly ParsedComment[],
): Promise<StructureViolation[]> {
  return all(
    comments.map((comment) => async () => ({
      file,
      line: await lineOf(source, comment.start),
      rule: StructureRule.NoComments,
      detail: message(MessageId.CommentNotAllowed),
    })),
  );
}

async function calleeName(node: AstNode): Promise<string | undefined> {
  const callee = node.callee as AstNode | undefined;
  const target = callee?.type === AstNodeType.Member ? (callee.property as AstNode) : callee;
  return target?.name as string | undefined;
}

async function constructedName(node: AstNode): Promise<string | undefined> {
  return (node.callee as AstNode | undefined)?.name as string | undefined;
}

async function syncCall(node: AstNode): Promise<string | undefined> {
  const name = node.type === AstNodeType.Call ? await calleeName(node) : undefined;
  return name?.endsWith(SYNC_API_SUFFIX) ? name : undefined;
}

async function eagerCollection(node: AstNode, inFunction: boolean, inConstructor: boolean) {
  const name = node.type === AstNodeType.New ? await constructedName(node) : undefined;
  const isCollection = EAGER_COLLECTIONS.some((collection) => collection === name);
  return isCollection && (!inFunction || inConstructor) ? name : undefined;
}

async function nodeViolation(
  file: string,
  source: string,
  node: AstNode,
  rule: StructureRule,
  detail: string,
): Promise<StructureViolation> {
  return { file, line: await lineOf(source, node.start), rule, detail };
}

async function hygieneAt(
  file: string,
  source: string,
  node: AstNode,
  inFunction: boolean,
  inConstructor: boolean,
): Promise<StructureViolation[]> {
  if (node.type !== AstNodeType.Call && node.type !== AstNodeType.New) return [];
  const sync = await syncCall(node);
  const eager = file.includes(STORE_PACKAGE_PATH)
    ? undefined
    : await eagerCollection(node, inFunction, inConstructor);
  return [
    ...(sync === undefined
      ? []
      : [
          await nodeViolation(
            file,
            source,
            node,
            StructureRule.SyncApi,
            message(MessageId.SyncApiUsed, { name: sync }),
          ),
        ]),
    ...(eager === undefined
      ? []
      : [
          await nodeViolation(
            file,
            source,
            node,
            StructureRule.EagerCollection,
            message(MessageId.EagerCollection, { name: eager }),
          ),
        ]),
  ];
}

export async function hygieneViolations(
  file: string,
  source: string,
  node: AstNode,
  inFunction = false,
  inConstructor = false,
  cache?: WeakMap<AstNode, AstNode[]>,
): Promise<StructureViolation[]> {
  const isConstructor = node.type === AstNodeType.Method && node.kind === CONSTRUCTOR_KIND;
  const nextFunction = inFunction || FUNCTION_TYPES.includes(node.type);
  const nextConstructor = inConstructor || isConstructor;
  const own = await hygieneAt(file, source, node, inFunction, inConstructor);
  const below = await flatMapAsync(await childrenOf(node, cache), async (child) =>
    hygieneViolations(file, source, child, nextFunction, nextConstructor, cache),
  );
  return [...own, ...below];
}

export async function yamlCommentViolations(
  file: string,
  source: string,
): Promise<StructureViolation[]> {
  return source
    .split(Text.Newline)
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => YAML_COMMENT.test(line))
    .map(({ number }) => ({
      file,
      line: number,
      rule: StructureRule.NoComments,
      detail: message(MessageId.CommentNotAllowed),
    }));
}

async function declaratorCall(node: AstNode): Promise<string | undefined> {
  const init = node.type === AstNodeType.Declarator ? (node.init as AstNode | null) : null;
  const isCall = init?.type === AstNodeType.Call || init?.type === AstNodeType.New;
  return isCall
    ? ((await calleeName(init as AstNode)) ?? (await constructedName(init as AstNode)))
    : undefined;
}

async function heavyImport(node: AstNode): Promise<string | undefined> {
  const source = node.type === AstNodeType.Import ? (node.source as AstNode) : undefined;
  const name = source?.value as string | undefined;
  return HEAVY_MODULES.find((heavy) => name?.startsWith(heavy));
}

async function warningsAt(file: string, source: string, node: AstNode, inFunction: boolean) {
  if (node.type !== AstNodeType.Declarator && node.type !== AstNodeType.Import) return [];
  const call = inFunction ? undefined : await declaratorCall(node);
  const heavy = await heavyImport(node);
  return [
    ...(call === undefined
      ? []
      : [
          await nodeViolation(
            file,
            source,
            node,
            StructureRule.EagerInvocation,
            message(MessageId.EagerInvocation, { name: call }),
          ),
        ]),
    ...(heavy === undefined
      ? []
      : [
          await nodeViolation(
            file,
            source,
            node,
            StructureRule.HeavyImport,
            message(MessageId.HeavyImport, { name: heavy }),
          ),
        ]),
  ];
}

export async function lazyWarnings(
  file: string,
  source: string,
  node: AstNode,
  inFunction = false,
  cache?: WeakMap<AstNode, AstNode[]>,
): Promise<StructureViolation[]> {
  if (LAZY_IGNORED_PATHS.some((ignored) => file.includes(ignored))) {
    return [];
  }
  const nextFunction = inFunction || FUNCTION_TYPES.includes(node.type);
  const below = await flatMapAsync(await childrenOf(node, cache), async (child) =>
    lazyWarnings(file, source, child, nextFunction, cache),
  );
  return [...(await warningsAt(file, source, node, inFunction)), ...below];
}
