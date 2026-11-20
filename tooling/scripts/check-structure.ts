import { relative } from "node:path";
import {
  AstNodeType,
  CommentStyle,
  FileSuffix,
  MAX_NESTING_DEPTH,
  MAX_OBJECT_DEPTH,
  MessageId,
  NESTING_EXEMPT_FUNCTIONS,
  STRUCTURE_PARSER_LANG,
  StructureRule,
  TEST_FILE_SUFFIXES,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync, flatMapAsync } from "@platform/store";
import type { AstNode, StructureScope, StructureViolation } from "@platform/types";
import { all } from "@platform/util";
import { parse } from "oxc-parser";
import { childrenOf, lineOf } from "./ast.ts";
import { commentViolations, hygieneViolations, lazyWarnings } from "./rules-hygiene.ts";
import { discover, firstDifferentLine, isSkipped, stripSource, styleOf } from "./strip-comments.ts";
import { REPO_ROOT } from "./tools.ts";

const CONTROL_FLOW: readonly string[] = [
  AstNodeType.If,
  AstNodeType.For,
  AstNodeType.ForIn,
  AstNodeType.ForOf,
  AstNodeType.While,
  AstNodeType.DoWhile,
  AstNodeType.Switch,
  AstNodeType.Try,
];
const FUNCTIONS: readonly string[] = [
  AstNodeType.FunctionDeclaration,
  AstNodeType.FunctionExpression,
  AstNodeType.ArrowFunction,
];

async function isBlockCallback(node: AstNode, parent: AstNode | undefined): Promise<boolean> {
  const isCall = parent?.type === AstNodeType.Call;
  const isFunction =
    node.type === AstNodeType.FunctionExpression || node.type === AstNodeType.ArrowFunction;
  const body = node.body as AstNode | undefined;
  const callee = (parent?.callee as AstNode | undefined)?.name as string | undefined;
  const exempt = NESTING_EXEMPT_FUNCTIONS.some((name) => name === callee);
  return isCall && isFunction && body?.type === AstNodeType.Block && !exempt;
}

async function scopeFor(
  node: AstNode,
  parent: AstNode | undefined,
  scope: StructureScope,
): Promise<StructureScope> {
  if (FUNCTIONS.includes(node.type)) {
    return (await isBlockCallback(node, parent))
      ? { depth: scope.depth + 1, objects: 0 }
      : { depth: 0, objects: 0 };
  }
  if (node.type === AstNodeType.Object) {
    return { ...scope, objects: scope.objects + 1 };
  }
  const elseIf =
    node.type === AstNodeType.If && parent?.type === AstNodeType.If && parent.alternate === node;
  return CONTROL_FLOW.includes(node.type) && !elseIf ? { ...scope, depth: scope.depth + 1 } : scope;
}

async function violation(
  file: string,
  source: string,
  node: AstNode,
  rule: StructureRule,
  detail: string,
): Promise<StructureViolation> {
  return { file, line: await lineOf(source, node.start), rule, detail };
}

async function walk(
  file: string,
  source: string,
  node: AstNode,
  parent: AstNode | undefined,
  outer: StructureScope,
  cache: WeakMap<AstNode, AstNode[]>,
): Promise<StructureViolation[]> {
  const scope = await scopeFor(node, parent, outer);
  const found: StructureViolation[] = [];
  if (
    CONTROL_FLOW.includes(node.type) &&
    scope.depth === MAX_NESTING_DEPTH + 1 &&
    outer.depth < scope.depth
  ) {
    const detail = message(MessageId.NestingTooDeep, {
      depth: scope.depth,
      max: MAX_NESTING_DEPTH,
    });
    found.push(await violation(file, source, node, StructureRule.NestingDepth, detail));
  }
  if (node.type === AstNodeType.Object && scope.objects === MAX_OBJECT_DEPTH + 1) {
    const detail = message(MessageId.ObjectNestingTooDeep, {
      depth: scope.objects,
      max: MAX_OBJECT_DEPTH,
    });
    found.push(await violation(file, source, node, StructureRule.ObjectDepth, detail));
  }
  const below = await flatMapAsync(await childrenOf(node, cache), async (child) =>
    walk(file, source, child, node, scope, cache),
  );
  return [...found, ...below];
}

async function controlFlowIn(
  file: string,
  source: string,
  node: AstNode,
  cache: WeakMap<AstNode, AstNode[]>,
): Promise<StructureViolation[]> {
  const own = CONTROL_FLOW.includes(node.type)
    ? [
        await violation(
          file,
          source,
          node,
          StructureRule.TestControlFlow,
          message(MessageId.TestControlFlow, { construct: node.type }),
        ),
      ]
    : [];
  return [
    ...own,
    ...(await flatMapAsync(await childrenOf(node, cache), async (child) =>
      controlFlowIn(file, source, child, cache),
    )),
  ];
}

export async function checkSource(
  file: string,
  source: string,
  warnings?: StructureViolation[],
): Promise<StructureViolation[]> {
  const parsed = await parse(file, source, { lang: STRUCTURE_PARSER_LANG });
  const root = parsed.program as unknown as AstNode;
  const cache = new WeakMap<AstNode, AstNode[]>();
  if (warnings !== undefined)
    warnings.push(...(await lazyWarnings(file, source, root, false, cache)));
  const nesting = await walk(file, source, root, undefined, { depth: 0, objects: 0 }, cache);
  const isTest = TEST_FILE_SUFFIXES.some((suffix) => file.endsWith(suffix));
  return [
    ...nesting,
    ...(isTest ? await controlFlowIn(file, source, root, cache) : []),
    ...(await commentViolations(file, source, parsed.comments)),
    ...(await hygieneViolations(file, source, root, false, false, cache)),
  ];
}

export async function warnSource(file: string, source: string): Promise<StructureViolation[]> {
  const parsed = await parse(file, source, { lang: STRUCTURE_PARSER_LANG });
  return lazyWarnings(file, source, parsed.program as unknown as AstNode);
}

async function commentFinding(
  name: string,
  source: string,
  stripped: string,
): Promise<StructureViolation[]> {
  return stripped === source
    ? []
    : [
        {
          file: name,
          line: await firstDifferentLine(source, stripped),
          rule: StructureRule.NoComments,
          detail: message(MessageId.CommentNotAllowed),
        },
      ];
}

async function checkFile(
  file: string,
  warnings: StructureViolation[],
): Promise<StructureViolation[]> {
  const name = relative(REPO_ROOT, file) || file;
  const source = await Bun.file(file).text();
  return (await styleOf(file)) === CommentStyle.Typescript
    ? checkSource(name, source, warnings)
    : await commentFinding(name, source, await stripSource(file, source));
}

async function allFiles(): Promise<string[]> {
  return (await discover()).filter((path) => !path.endsWith(FileSuffix.Generated));
}

export async function checkStructure(args: readonly string[] = []): Promise<number> {
  const candidates = args.length > 0 ? args : await allFiles();
  const files = await filterAsync(candidates, async (path) => !(await isSkipped(path)));
  const warnings: StructureViolation[] = [];
  const violations = (await all(files.map((item) => async () => checkFile(item, warnings)))).flat();
  for (const found of violations) {
    console.error(message(MessageId.StructureViolation, { ...found, detail: found.detail }));
  }
  for (const found of warnings) {
    console.warn(message(MessageId.StructureViolation, { ...found, detail: found.detail }));
  }
  if (warnings.length > 0) {
    console.warn(message(MessageId.StructureWarnings, { count: warnings.length }));
  }
  console.log(
    violations.length === 0
      ? message(MessageId.StructureOk)
      : message(MessageId.StructureSummary, { count: violations.length }),
  );
  return violations.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(await checkStructure(Bun.argv.slice(2)));
