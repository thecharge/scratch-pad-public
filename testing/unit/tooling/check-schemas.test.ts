import { describe, expect, test } from "bun:test";
import { STRUCTURE_PARSER_LANG } from "@platform/constants";
import type { AstNode } from "@platform/types";
import { parse } from "oxc-parser";
import {
  checkTypesPackage,
  dataShapeViolations,
  inferredNames,
} from "../../../tooling/scripts/check-schemas.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

async function violationsOf(source: string): Promise<string[]> {
  const { program } = await parse("a.ts", source, { lang: STRUCTURE_PARSER_LANG });
  const root = program as unknown as AstNode;
  const known = new Set(await inferredNames(source, root));
  return (await dataShapeViolations("a.ts", source, root, known)).map((found) => found.detail);
}

describe("data shapes are Zod schemas", () => {
  test.each([
    ["an interface of primitives", "export interface A { a: string; b?: number }"],
    ["a type literal of primitives", "export type A = { a: boolean; b: string[] };"],
    [
      "an interface that uses an inferred type",
      "export const BSchema = z.object({}); export type B = z.infer<typeof BSchema>; export interface A { b: B }",
    ],
  ])("rejects %s", async (_name, source) => {
    expect((await violationsOf(source)).length).toBe(1);
  });

  test.each([
    ["an interface with a method", "export interface A { run(): void }"],
    ["an interface with a function property", "export interface A { run: () => void }"],
    ["a generic container", "export interface A<T> { value: T }"],
    ["an inferred schema type", "export type A = z.infer<typeof ASchema>;"],
    ["an interface holding a contract", "export interface A { sink: Sink }"],
  ])("accepts %s", async (_name, source) => {
    expect(await violationsOf(source)).toEqual([]);
  });

  test("the types package has no data shape declared without a schema", async () => {
    expect(await checkTypesPackage(REPO_ROOT)).toEqual([]);
  });
});
