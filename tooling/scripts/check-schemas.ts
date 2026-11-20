import { relative } from "node:path";
import {
  DATA_CONTAINER_TYPES,
  DataNodeType,
  MessageId,
  SCHEMA_INFER_MARKER,
  STRUCTURE_PARSER_LANG,
  StructureRule,
  TYPES_SOURCE_GLOB,
} from "@platform/constants";
import { message } from "@platform/messages";
import { everyAsync, filterAsync, flatMapAsync } from "@platform/store";
import type { AstNode, StructureViolation } from "@platform/types";
import { all } from "@platform/util";
import { parse } from "oxc-parser";
import { lineOf } from "./ast.ts";
import { finish, REPO_ROOT } from "./tools.ts";

const DATA_KEYWORDS: readonly string[] = [
  DataNodeType.StringKeyword,
  DataNodeType.NumberKeyword,
  DataNodeType.BooleanKeyword,
  DataNodeType.NullKeyword,
  DataNodeType.UndefinedKeyword,
  DataNodeType.UnknownKeyword,
  DataNodeType.LiteralType,
];

async function nodes(value: unknown): Promise<AstNode[]> {
  return Array.isArray(value) ? (value as AstNode[]) : [];
}

async function declarationOf(statement: AstNode): Promise<AstNode> {
  return statement.type === DataNodeType.ExportNamed
    ? ((statement.declaration as AstNode | null) ?? statement)
    : statement;
}

async function nameOf(declaration: AstNode): Promise<string> {
  return (declaration.id as AstNode).name as string;
}

async function textOf(source: string, node: AstNode): Promise<string> {
  return source.slice(node.start, node.end);
}

export async function inferredNames(source: string, program: AstNode): Promise<string[]> {
  return all(
    (
      await filterAsync(
        (
          await all((await nodes(program.body)).map((item) => async () => declarationOf(item)))
        ).filter((declaration) => declaration.type === DataNodeType.TypeAlias),
        async (declaration) =>
          (
            await textOf(source, declaration.typeAnnotation as AstNode)
          ).includes(SCHEMA_INFER_MARKER),
      )
    ).map((item) => async () => nameOf(item)),
  );
}

async function isData(type: AstNode, known: ReadonlySet<string>): Promise<boolean> {
  if (DATA_KEYWORDS.includes(type.type)) {
    return true;
  }
  if (type.type === DataNodeType.ArrayType) {
    return isData(type.elementType as AstNode, known);
  }
  if (type.type === DataNodeType.UnionType) {
    return await everyAsync(await nodes(type.types), async (member) => isData(member, known));
  }
  return type.type === DataNodeType.TypeReference ? await isDataReference(type, known) : false;
}

async function isDataReference(type: AstNode, known: ReadonlySet<string>): Promise<boolean> {
  const name = (type.typeName as AstNode).name as string;
  const params = await nodes(((type.typeArguments as AstNode | null)?.params as unknown) ?? []);
  return (
    known.has(name) ||
    (DATA_CONTAINER_TYPES.includes(name) &&
      (await everyAsync(params, async (p) => isData(p, known))))
  );
}

async function isDataMember(member: AstNode, known: ReadonlySet<string>): Promise<boolean> {
  const annotation = (member.typeAnnotation as AstNode | null)?.typeAnnotation as
    | AstNode
    | undefined;
  return (
    member.type === DataNodeType.PropertySignature &&
    annotation !== undefined &&
    (await isData(annotation, known))
  );
}

async function membersOf(declaration: AstNode): Promise<AstNode[]> {
  if (declaration.type === DataNodeType.Interface) {
    return nodes((declaration.body as AstNode).body);
  }
  const annotation = declaration.typeAnnotation as AstNode | undefined;
  return annotation?.type === DataNodeType.TypeLiteral ? await nodes(annotation.members) : [];
}

async function holdsOnlyData(declaration: AstNode, known: ReadonlySet<string>): Promise<boolean> {
  const members = await membersOf(declaration);
  return (
    members.length > 0 && (await everyAsync(members, async (member) => isDataMember(member, known)))
  );
}

export async function dataShapeViolations(
  file: string,
  source: string,
  program: AstNode,
  known: ReadonlySet<string>,
): Promise<StructureViolation[]> {
  return all(
    (
      await filterAsync(
        await all((await nodes(program.body)).map((item) => async () => declarationOf(item))),
        async (declaration) => holdsOnlyData(declaration, known),
      )
    ).map((declaration) => async () => ({
      file,
      line: await lineOf(source, declaration.start),
      rule: StructureRule.DataShapeNotSchema,
      detail: message(MessageId.DataShapeNotSchema, { name: await nameOf(declaration) }),
    })),
  );
}

async function parsed(file: string) {
  const source = await Bun.file(file).text();
  const { program } = await parse(file, source, { lang: STRUCTURE_PARSER_LANG });
  return { file, source, program: program as unknown as AstNode };
}

export async function checkTypesPackage(root: string): Promise<StructureViolation[]> {
  const files = await Array.fromAsync(
    new Bun.Glob(TYPES_SOURCE_GLOB).scan({ cwd: root, absolute: true }),
  );
  const trees = await all(files.map((item) => async () => parsed(item)));
  const known = new Set(
    await flatMapAsync(trees, async ({ source, program }) => inferredNames(source, program)),
  );
  return await flatMapAsync(trees, async ({ file, source, program }) =>
    dataShapeViolations(relative(root, file), source, program, known),
  );
}

export async function checkSchemas(root: string = REPO_ROOT): Promise<number> {
  const violations = await checkTypesPackage(root);
  return finish(
    violations.map((found) =>
      message(MessageId.StructureViolation, { ...found, detail: found.detail }),
    ),
    message(MessageId.SchemasOk),
  );
}

if (import.meta.main) process.exit(await checkSchemas());
