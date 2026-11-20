import { describe, expect, test } from "bun:test";
import { StructureRule } from "@platform/constants";
import { checkSource, warnSource } from "../../../tooling/scripts/check-structure.ts";
import {
  stripComments,
  stripSource,
  stripYamlComments,
} from "../../../tooling/scripts/strip-comments.ts";

const rulesOf = async (file: string, source: string) =>
  (await checkSource(file, source)).map((found) => found.rule);

describe("nesting depth", () => {
  test.each([
    ["one if", "function f(a) { if (a) { return 1; } return 2; }"],
    ["an if inside a loop", "function f(xs) { for (const x of xs) { if (x) { use(x); } } }"],
    [
      "an else-if chain",
      "function f(a) { if (a === 1) { one(); } else if (a === 2) { two(); } else { three(); } }",
    ],
    [
      "sequential blocks",
      "function f(a) { if (a) { x(); } if (a) { y(); } for (const b of a) { z(b); } }",
    ],
    [
      "a nested function resets the depth",
      "function f(a) { if (a) { for (const b of a) { g(() => 1); } } }\nfunction h(a) { if (a) { for (const b of a) { use(b); } } }",
    ],
  ])("accepts %s", async (_name, source) => {
    expect(await rulesOf("a.ts", source)).toEqual([]);
  });

  test.each([
    [
      "a loop in a loop in an if",
      "function f(a) { if (a) { for (const x of a) { for (const y of x) { use(y); } } } }",
    ],
    [
      "an if in a callback in a loop",
      "function f(xs) { for (const x of xs) { xs.map((y) => { if (y) { use(y); } }); } }",
    ],
    [
      "a try in a switch in a loop",
      "function f(xs) { for (const x of xs) { switch (x) { case 1: try { use(x); } catch {} } } }",
    ],
  ])("rejects %s", async (_name, source) => {
    expect(await rulesOf("a.ts", source)).toEqual([StructureRule.NestingDepth]);
  });

  test("an expression-bodied callback does not count as a level", async () => {
    expect(
      await rulesOf(
        "a.ts",
        "function f(xs) { for (const x of xs) { if (x) { xs.map((y) => y + 1); } } }",
      ),
    ).toEqual([]);
  });

  test("a callback to expect does not count as a level", async () => {
    expect(
      await rulesOf(
        "a.ts",
        "function f(xs) { for (const x of xs) { expect(() => { if (x) { use(x); } }).toThrow(); } }",
      ),
    ).toEqual([]);
  });
});

describe("object nesting", () => {
  test("two levels are fine", async () => {
    expect(await rulesOf("a.ts", "const a = { b: { c: 1 } };")).toEqual([]);
  });

  test("three levels are rejected, even through arrays and calls", async () => {
    expect(await rulesOf("a.ts", "const a = { b: [{ c: call({ d: 1 }) }] };")).toEqual([
      StructureRule.ObjectDepth,
    ]);
  });

  test("a function boundary resets the object depth", async () => {
    expect(await rulesOf("a.ts", "const a = { b: { c: () => ({ d: { e: 1 } }) } };")).toEqual([]);
  });
});

describe("test files", () => {
  test.each([
    ["a for loop", "for (const x of xs) { use(x); }"],
    ["an if", "if (a) { use(a); }"],
    ["a try block", "try { use(1); } catch {}"],
    ["a switch", "switch (a) { default: use(a); }"],
  ])("reject %s", async (_name, source) => {
    expect(await rulesOf("a.test.ts", source)).toContain(StructureRule.TestControlFlow);
  });

  test("allow the same code outside a test file", async () => {
    expect(await rulesOf("a.ts", "if (a) { use(a); }")).toEqual([]);
  });

  test("allow flat describe and test.each", async () => {
    const source =
      'describe("x", () => { test.each([[1]])("y", (n) => { expect(n).toBe(1); }); });';
    expect(await rulesOf("a.test.ts", source)).toEqual([]);
  });
});

describe("comments", () => {
  test.each([
    ["a line comment", "// note\nconst a = 1;"],
    ["a block comment", "/* note */ const a = 1;"],
    ["a doc comment", "/** note */\nfunction f() {}"],
    ["a biome-ignore directive", "// biome-ignore lint/plugin: reason\nconst a = 1;"],
    ["a cspell directive", "// cspell:ignore zzyzx\nconst a = 1;"],
    ["a ts-expect-error directive", "// @ts-expect-error reason\nconst a = 1;"],
    ["a trailing comment", "const a = 1; // note"],
  ])("rejects %s", async (_name, source) => {
    expect(await rulesOf("a.ts", source)).toEqual([StructureRule.NoComments]);
  });

  test("accepts a hashbang and a string that looks like a comment", async () => {
    expect(await rulesOf("a.ts", '#!/usr/bin/env bun\nconst a = "// not a comment";')).toEqual([]);
  });
});

describe("comment removal", () => {
  test.each([
    ["a full-line comment", "// note\nconst a = 1;\n", "const a = 1;\n"],
    ["a trailing comment", "const a = 1; // note\n", "const a = 1;\n"],
    ["a block comment", "/** note */\nfunction f() {}\n", "function f() {}\n"],
    ["a directive", "// biome-ignore lint/plugin: r\nconst a = 1;\n", "const a = 1;\n"],
    ["a string that looks like a comment", 'const a = "// x";\n', 'const a = "// x";\n'],
  ])("%s", async (_name, source, expected) => {
    expect(await stripComments("a.ts", source)).toBe(expected);
  });

  test.each([
    ["a full-line comment", "# note\nkey: value\n", "key: value\n"],
    ["an indented comment", "a:\n  # note\n  b: 1\n", "a:\n  b: 1\n"],
  ])("yaml: %s", async (_name, source, expected) => {
    expect(await stripYamlComments(source)).toBe(expected);
  });
});

describe("comment removal in every file type", () => {
  test.each([
    [
      "a tsx comment",
      "a.tsx",
      "// note\nexport const a = <div />;\n",
      "export const a = <div />;\n",
    ],
    ["a markdown comment", "a.md", "# T\n\n<!-- note -->\n\ntext\n", "# T\n\n\ntext\n"],
    ["an mdx comment", "a.mdx", "text {/* note */}\n", "text\n"],
    ["an html comment", "a.html", "<p>a</p>\n<!-- note -->\n", "<p>a</p>\n"],
    [
      "a markdown comment inside a fence",
      "a.md",
      "```\n<!-- keep -->\n```\n",
      "```\n<!-- keep -->\n```\n",
    ],
    [
      "a markdown comment inside inline code",
      "a.md",
      "use `<!-- x -->` here\n",
      "use `<!-- x -->` here\n",
    ],
    ["a json line comment", "a.json", '{\n  // note\n  "a": 1\n}\n', '{\n  "a": 1\n}\n'],
    [
      "a json string holding slashes",
      "a.json",
      '{"a": "https://x.test/*"}\n',
      '{"a": "https://x.test/*"}\n',
    ],
    ["a grit comment", "a.grit", "// note\nlanguage js\n", "language js\n"],
    ["a css comment", "a.css", "/* note */\na { color: red; }\n", "a { color: red; }\n"],
    [
      "a css url",
      "a.css",
      "a { background: url(http://x.test/a.png); }\n",
      "a { background: url(http://x.test/a.png); }\n",
    ],
    ["a toml comment", "a.toml", "# note\na = 1\n", "a = 1\n"],
    ["an env example comment", ".env.example", "# note\nA=1\n", "A=1\n"],
    ["a gitignore comment", ".gitignore", "# note\ndist/\n", "dist/\n"],
    ["a CODEOWNERS comment", "CODEOWNERS", "# note\n* @owner\n", "* @owner\n"],
    ["a file type without comments", "a.txt", "# kept\n", "# kept\n"],
  ])("%s", async (_name, file, source, expected) => {
    expect(await stripSource(file, source)).toBe(expected);
  });
});

describe("synchronous APIs", () => {
  test.each([
    ["readFileSync", "function f() { return readFileSync(p); }"],
    ["a member Sync call", "function f() { return Bun.spawnSync(c); }"],
    ["existsSync", "const a = existsSync(p);"],
  ])("rejects %s", async (_name, source) => {
    expect(await rulesOf("a.ts", source)).toEqual([StructureRule.SyncApi]);
  });

  test("accepts the asynchronous equivalent", async () => {
    expect(await rulesOf("a.ts", "async function f() { return await readFile(p); }")).toEqual([]);
  });
});

describe("eager collections", () => {
  test.each([
    ["a module-level Map", "const a = new Map();"],
    ["a module-level Set", "const a = new Set([1]);"],
    ["a class field", "class A { items = new Map(); }"],
    ["a constructor assignment", "class A { constructor() { this.items = new WeakMap(); } }"],
  ])("rejects %s", async (_name, source) => {
    expect(await rulesOf("a.ts", source)).toEqual([StructureRule.EagerCollection]);
  });

  test.each([
    ["a local inside a function", "function f() { const seen = new Set(); return seen; }"],
    ["a local inside a method", "class A { run() { return new Map(); } }"],
  ])("accepts %s", async (_name, source) => {
    expect(await rulesOf("a.ts", source)).toEqual([]);
  });

  test("the store package is the one place that may hold one", async () => {
    expect(await rulesOf("packages/store/src/a.ts", "class A { items = new Map(); }")).toEqual([]);
  });
});

describe("lazy-loading warnings", () => {
  const rules = async (file: string, source: string) =>
    (await warnSource(file, source)).map((found) => found.rule);

  test.each([
    [
      "a module-level call",
      "packages/a/src/a.ts",
      "const a = build();",
      StructureRule.EagerInvocation,
    ],
    [
      "a module-level new",
      "packages/a/src/a.ts",
      "const a = new Thing();",
      StructureRule.EagerInvocation,
    ],
    [
      "a heavy static import",
      "packages/a/src/a.ts",
      'import { x } from "better-auth/plugins";',
      StructureRule.HeavyImport,
    ],
  ])("warns about %s", async (_name, file, source, rule) => {
    expect(await rules(file, source)).toEqual([rule]);
  });

  test.each([
    [
      "a call inside a function",
      "packages/a/src/a.ts",
      "function f() { const a = build(); return a; }",
    ],
    ["a dynamic import", "packages/a/src/a.ts", 'async function f() { return import("mermaid"); }'],
    ["an ignored path", "packages/types/src/a.ts", "const a = build();"],
    ["a test file", "packages/a/src/a.test.ts", "const a = build();"],
  ])("stays quiet for %s", async (_name, file, source) => {
    expect(await rules(file, source)).toEqual([]);
  });
});
