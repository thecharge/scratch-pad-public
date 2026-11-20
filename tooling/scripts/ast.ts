import { AST_NODE_FIELDS, Text, TYPEOF_OBJECT } from "@platform/constants";
import { type AstNode, AstNodeSchema } from "@platform/types";

export function isNode(value: unknown): value is AstNode {
  return (
    value !== null &&
    typeof value === TYPEOF_OBJECT &&
    AST_NODE_FIELDS.every((field) => field in (value as object)) &&
    AstNodeSchema.safeParse(value).success
  );
}

export async function childrenOf(
  node: AstNode,
  cache?: WeakMap<AstNode, AstNode[]>,
): Promise<AstNode[]> {
  const known = cache?.get(node);
  if (known !== undefined) return known;
  const children = Object.values(node)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter(isNode);
  cache?.set(node, children);
  return children;
}

export async function lineOf(source: string, offset: number): Promise<number> {
  return source.slice(0, offset).split(Text.Newline).length;
}
