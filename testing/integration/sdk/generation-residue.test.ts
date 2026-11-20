import { afterAll, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { checkUntracked } from "../../../tooling/scripts/check-untracked.ts";
import { REPO_ROOT, run } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

const config = join(REPO_ROOT, "packages/sdk/openapi-ts.config.ts");
const cli = join(REPO_ROOT, "packages/sdk/node_modules/@hey-api/openapi-ts/bin/run.js");

test.each([
  ["invalid JSON", "{"],
  ["unsupported document", '{"openapi":"0.0.0","paths":{}}'],
])("a generator failure for %s leaves diagnostics only in output", async (_name, input) => {
  const root = await makeDir();
  await writeFiles(root, { "input.json": input });
  const result = await run(
    ["bun", cli, "--file", config, "--input", "input.json", "--output", "generated"],
    { cwd: root },
  );
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr + result.stdout).toContain("error");
  expect(await readdir(root)).toEqual(["input.json"]);
});

test.each([
  ["a normal leftover", "leftover.txt"],
  ["an SDK crash log", "packages/sdk/openapi-ts-error-test.log"],
])("the real Git gate rejects %s", async (_name, file) => {
  const root = await makeDir();
  expect((await run(["git", "init", "--quiet"], { cwd: root })).exitCode).toBe(0);
  expect(await checkUntracked(root)).toBe(0);
  await writeFiles(root, { [file]: "left behind" });
  expect(await checkUntracked(root)).toBe(1);
  expect(await Bun.file(join(root, file)).text()).toBe("left behind");
  expect((await run(["git", "add", "."], { cwd: root })).exitCode).toBe(0);
  expect(await checkUntracked(root)).toBe(0);
});
