import { afterAll, expect, test } from "bun:test";
import { join } from "node:path";
import { positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { checkFormatting } from "../../../tooling/scripts/check-formatting.ts";
import { stripFiles } from "../../../tooling/scripts/strip-comments.ts";

afterAll(removeAll);
const root = await makeDir();
const ok = async () => ({ exitCode: 0, stdout: "", stderr: "" });
const failed = async () => ({ exitCode: 2, stdout: "", stderr: "" });
const clean = async () => 0;
const commented = async () => 1;
unit(checkFormatting, {
  positive: [
    positive("both mandatory checks pass", [root, ok, clean], 0),
    positive("empty formatter output is valid", [root, ok, async () => 0], 0),
  ],
  negative: [
    rejected("a comment blocks formatting acceptance", [root, ok, commented], 1),
    rejected("a formatting failure blocks acceptance", [root, failed, clean], 1),
  ],
});

test.each([
  ["a.ts", "export const x = 1;\n", 0],
  ["a.json", '{"value":"https://example.test"}\n', 0],
  ["a.ts", "export const x = 1; // comment\n", 1],
  ["a.json", '{"value":1} // comment\n', 1],
])("batch checking preserves %s bytes, exit=%s", async (name, source, expected) => {
  await writeFiles(root, { [name]: source });
  const file = join(root, name);
  expect(await stripFiles(["--check", file])).toBe(expected);
  expect(await Bun.file(file).text()).toBe(source);
});

test.each([0, 1])("both checks execute even after comment result %s", async (code) => {
  const calls: string[] = [];
  const comments = async () => {
    calls.push("comments");
    return code;
  };
  const execute = async (command: readonly string[]) => {
    calls.push(...command);
    return { exitCode: 0, stdout: "", stderr: "" };
  };
  expect(await checkFormatting(root, execute, comments)).toBe(code);
  expect(calls).toEqual([
    "comments",
    "bunx",
    "--no-install",
    "dprint",
    "check",
    "--incremental=false",
  ]);
});
