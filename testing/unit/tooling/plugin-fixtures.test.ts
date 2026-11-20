import { afterAll, describe, expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ConfigFile, ToolBinary } from "@platform/constants";
import {
  copyPlugins,
  makeDir,
  removeAll,
  writeBiomeConfig,
  writeFiles,
} from "@platform/test-scenarios";
import { resolveTool, run } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

const STRINGS = `import { z } from "zod";
const inline = "x";                    // FLAG
const obj = { "quoted-key": 1 };
enum E { A = "init" }                  // FLAG
enum F { "B" = 2 }
const req = require("some-module");   // FLAG
const dyn = import("dyn-module");
const computed = { ["computed"]: 1 }; // FLAG
const asConst = "as-const" as const;  // FLAG
const tpl = \`template\`;                // FLAG
const tplExpr = \`\${inline}\`;
function f() { "use strict"; return 1; }
export { z, inline, obj, E, F, req, dyn, computed, asConst, tpl, tplExpr, f };
`;

const TYPES = `interface Shape { a: number }          // FLAG
type Alias = number;                   // FLAG
const f = (p: { a: number }) => p.a;  // FLAG
const g = (n: number): Alias => n;
export { f, g };
export type { Shape };
`;

const LITERAL_TYPES = `type Mode = "a" | "b";                 // FLAG
const h = (m: "c"): number => m.length; // FLAG
export { h };
export type { Mode };
`;

const REPORT = /^(.+):(\d+):\d+ plugin/;

const ENUM_DECLARATION = `export enum Mode {
  Fast = "fast",
}
`;

const ENUM_CONSUMER = `import { Mode } from "@platform/constants";
export const chosen = Mode.Fast;
`;

const NO_EXCLUSION = "!nothing/**";
const EXEMPT_PATH = "packages/sample/src/exempt/sample.ts";
const COVERED_PATH = "packages/sample/src/covered/sample.ts";

import type { PluginEntry } from "@platform/types";

async function excludeFromPlugins(dir: string, glob: string): Promise<void> {
  const file = join(dir, ConfigFile.Biome);
  const config = JSON.parse(await readFile(file, "utf8"));
  const plugins = config.plugins.map((plugin: PluginEntry) => ({
    ...plugin,
    includes: [...plugin.includes, glob],
  }));
  await writeFile(file, JSON.stringify({ ...config, plugins }));
}

async function flaggedLines(
  source: string,
  path: string,
  exclude = NO_EXCLUSION,
): Promise<number[]> {
  const dir = await makeDir();
  await writeBiomeConfig(dir, true);
  await copyPlugins(dir);
  await writeFiles(dir, { [path]: source });
  await excludeFromPlugins(dir, exclude);
  const result = await run(
    [
      await resolveTool(ToolBinary.Biome),
      "lint",
      "--only=plugin",
      "--colors=off",
      "--max-diagnostics=200",
      ".",
    ],
    { cwd: dir },
  );
  const lines = (result.stdout + result.stderr)
    .split("\n")
    .map((line) => REPORT.exec(line))
    .map((match) => (match === null ? 0 : Number(match[2])))
    .filter((line) => line > 0);
  return [...new Set(lines)].sort((a, b) => a - b);
}

const markedLines = (source: string) =>
  source
    .split("\n")
    .map((line, index) => (line.includes("// FLAG") ? index + 1 : 0))
    .filter((line) => line > 0);

describe("no-inline-strings", () => {
  test("flags exactly the marked string positions in package source", async () => {
    expect(await flaggedLines(STRINGS, "packages/sample/src/sample.ts")).toEqual(
      markedLines(STRINGS),
    );
  });

  test.each([
    ["the constants package", "packages/constants/src/sample.ts"],
    ["the messages package", "packages/messages/src/sample.ts"],
    ["a test file", "packages/sample/src/sample.test.ts"],
  ])("does not apply to %s", async (_name, path) => {
    expect(await flaggedLines(STRINGS, path)).toEqual([]);
  });

  test.each([
    ["the config package", "packages/config/src/sample.ts"],
    ["a tooling script", "tooling/scripts/sample.ts"],
  ])("applies to %s", async (_name, path) => {
    expect(await flaggedLines(STRINGS, path)).toEqual(markedLines(STRINGS));
  });
});

describe("no-local-types", () => {
  test("flags interfaces, type aliases and inline object types", async () => {
    expect(await flaggedLines(TYPES, "packages/sample/src/sample.ts")).toEqual(markedLines(TYPES));
  });

  test.each([
    ["the config package", "packages/config/src/sample.ts"],
    ["the constants package", "packages/constants/src/sample.ts"],
    ["a test file", "packages/sample/src/sample.test.ts"],
    ["a tooling script", "tooling/scripts/sample.ts"],
  ])("applies to %s", async (_name, path) => {
    expect(await flaggedLines(TYPES, path)).toEqual(markedLines(TYPES));
  });

  test("does not apply to the types package", async () => {
    expect(await flaggedLines(TYPES, "packages/types/src/sample.ts")).toEqual([]);
  });
});

describe("no-string-literal-types", () => {
  test.each([
    ["package source", "packages/sample/src/sample.ts"],
    ["the types package", "packages/types/src/sample.ts"],
    ["the constants package", "packages/constants/src/sample.ts"],
    ["a test file", "packages/sample/src/sample.test.ts"],
  ])("flags literal types and unions in %s", async (_name, path) => {
    expect(await flaggedLines(LITERAL_TYPES, path)).toContain(
      markedLines(LITERAL_TYPES)[0] as number,
    );
  });
});

describe("enums and configured exceptions", () => {
  test("an enum declared in the constants package is accepted", async () => {
    expect(await flaggedLines(ENUM_DECLARATION, "packages/constants/src/mode.ts")).toEqual([]);
  });

  test("a consumer that uses the enum is accepted", async () => {
    expect(await flaggedLines(ENUM_CONSUMER, "packages/sample/src/consumer.ts")).toEqual([]);
  });

  test("the same enum declared in package source is flagged", async () => {
    expect(await flaggedLines(ENUM_DECLARATION, "packages/sample/src/mode.ts")).toEqual([2]);
  });

  test("a path excluded in the plugin includes is not flagged", async () => {
    expect(await flaggedLines(STRINGS, EXEMPT_PATH, "!packages/sample/src/exempt/**")).toEqual([]);
  });

  test("the same code outside the excluded path is still flagged", async () => {
    expect(await flaggedLines(STRINGS, COVERED_PATH, "!packages/sample/src/exempt/**")).toEqual(
      markedLines(STRINGS),
    );
  });
});
