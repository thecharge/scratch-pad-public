import { describe, expect, test } from "bun:test";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  MaskStrategy,
  MethodKind,
  PrincipalKind,
  SensitivePath,
} from "@platform/constants";
import { PathMasker, sensitivePaths } from "@platform/masking";
import type { MaskRule, Principal } from "@platform/types";
import { z } from "zod";

const READER: Principal = { kind: PrincipalKind.User, subject: "u", scopes: ["read"], roles: [] };
const PII: Principal = { ...READER, scopes: ["read", "pii"] };
const masker = new PathMasker();
const OUTPUT = { name: "Ada", email: "ada@example.com", author: { phone: "0123456789" } };

async function mask(rules: MaskRule[], principal: Principal = READER, output: unknown = OUTPUT) {
  return masker.apply(output, principal, { rules });
}

describe("strategies", () => {
  test.each<[string, MaskRule, unknown]>([
    [
      "remove drops the key",
      { path: "email", strategy: MaskStrategy.Remove },
      { name: "Ada", author: OUTPUT.author },
    ],
    [
      "replace uses the default",
      { path: "email", strategy: MaskStrategy.Replace },
      { ...OUTPUT, email: "***" },
    ],
    [
      "replace uses the given text",
      { path: "email", strategy: MaskStrategy.Replace, replacement: "[hidden]" },
      { ...OUTPUT, email: "[hidden]" },
    ],
    [
      "partial keeps the tail",
      { path: "author.phone", strategy: MaskStrategy.Partial, visibleChars: 4 },
      { ...OUTPUT, author: { phone: "******6789" } },
    ],
    [
      "partial never shows more than half",
      { path: "name", strategy: MaskStrategy.Partial, visibleChars: 9 },
      { ...OUTPUT, name: "**a" },
    ],
    [
      "partial with no visible chars hides all",
      { path: "name", strategy: MaskStrategy.Partial },
      { ...OUTPUT, name: "***" },
    ],
  ])("%s", async (_name, rule, expected) => {
    expect((await mask([rule])).output).toEqual(expected);
  });

  test("partial on a non-string falls back to the replacement", async () => {
    const result = await mask([{ path: "n", strategy: MaskStrategy.Partial }], READER, { n: 42 });
    expect(result.output).toEqual({ n: "***" });
  });
});

describe("paths", () => {
  test("a path walks through every array element", async () => {
    const output = { items: [{ email: "a" }, { email: "b" }, { other: 1 }] };
    const result = await mask(
      [{ path: "items.email", strategy: MaskStrategy.Remove }],
      READER,
      output,
    );
    expect(result.output).toEqual({ items: [{}, {}, { other: 1 }] });
  });

  test("a path that does not exist changes nothing and is not reported", async () => {
    const result = await mask([{ path: "missing.deep", strategy: MaskStrategy.Remove }]);
    expect(result).toEqual({ output: OUTPUT, maskedPaths: [] });
  });

  test("the input is never mutated", async () => {
    const before = structuredClone(OUTPUT);
    await mask([{ path: "email", strategy: MaskStrategy.Remove }]);
    expect(OUTPUT).toEqual(before);
  });
});

describe("unlessScope", () => {
  const rule: MaskRule = { path: "email", strategy: MaskStrategy.Remove, unlessScope: "pii" };

  test.each<[string, Principal, string[]]>([
    ["a principal without the scope is masked", READER, ["email"]],
    ["a principal holding the scope sees the field", PII, []],
  ])("%s", async (_name, principal, maskedPaths) => {
    expect((await mask([rule], principal)).maskedPaths).toEqual(maskedPaths);
  });
});

const DECLARED_RULES: MaskRule[] = [
  { path: "email", strategy: MaskStrategy.Remove },
  { path: "password", strategy: MaskStrategy.Remove },
];

describe("sensitivePaths", async () => {
  const capability = await defineCapability({
    id: "books.get",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: "books/{book}",
    summary: "s",
    description: "d",
    auth: AuthMode.Optional,
    input: z.object({}),
    output: z.object({}),
    handler: () => ({}),
    mask: { rules: DECLARED_RULES },
  });

  test("lists built-in credential paths and declared mask paths once each", async () => {
    const paths = await sensitivePaths([capability, capability]);
    expect(paths).toEqual([...Object.values(SensitivePath), "email"]);
  });
});
