import { afterAll, describe, expect, test } from "bun:test";
import { CONSOLE_BUNDLE_ENTRY } from "@platform/constants";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { CheckRun } from "@platform/types";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

const SCRIPT = "tooling/scripts/check-package-graph.ts";
const TIMEOUT_MS = 120_000;
const manifest = (name: string, dependency: string) =>
  JSON.stringify({ name, dependencies: { [dependency]: "1" } });

async function runCheck(root?: string): Promise<CheckRun> {
  const child = Bun.spawn(["bun", "run", SCRIPT, ...(root === undefined ? [] : [root])], {
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(child.stdout).text();
  const err = await new Response(child.stderr).text();
  return { code: await child.exited, text: out + err };
}

async function brokenRoot(): Promise<string> {
  const dir = await makeDir();
  await writeFiles(dir, {
    "packages/a/package.json": manifest("@platform/a", "@platform/b"),
    "packages/b/package.json": manifest("@platform/b", "@platform/a"),
    [CONSOLE_BUNDLE_ENTRY]: "export const value = process.env.SECRET_PLACE;\n",
  });
  return dir;
}

describe("package graph and console bundle check", () => {
  test(
    "the repository has no package cycle and its console bundle has no config loader or process.env",
    async () => {
      const result = await runCheck();
      expect(result.code).toBe(0);
    },
    TIMEOUT_MS,
  );

  test(
    "a cycle and a bundle that reads process.env fail the check and are named",
    async () => {
      const result = await runCheck(await brokenRoot());
      expect(result.code).toBe(1);
      expect(result.text).toMatch(
        /dependency cycle: @platform\/(a -> @platform\/b -> @platform\/a|b -> @platform\/a -> @platform\/b)/,
      );
      expect(result.text).toContain("console bundle contains process.env");
    },
    TIMEOUT_MS,
  );
});
