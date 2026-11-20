import { afterEach, describe, expect, test } from "bun:test";
import { processEnvScenarios } from "@platform/test-framework";
import { gitRepo, removeAll } from "@platform/test-scenarios";
import { run } from "../../../tooling/scripts/tools.ts";

const HOOK_GIT_DIR = "/nonexistent/.git";
const MISSING_REPOSITORY = 128;
const HOOK_ENV = { GIT_DIR: HOOK_GIT_DIR };

processEnvScenarios(["GIT_DIR"], [HOOK_ENV, HOOK_ENV]);

afterEach(removeAll);

describe("the git variables a hook sets", () => {
  test("they do not reach a command that runs in another folder", async () => {
    const fixture = await gitRepo({ "a.txt": "text\n" }, false, false);
    const result = await run(["git", "rev-parse", "--is-inside-work-tree"], { cwd: fixture });
    expect([result.exitCode, result.stdout.trim()]).toEqual([0, "true"]);
  });

  test("they still reach a command that runs in the repository itself", async () => {
    const result = await run(["git", "rev-parse", "--git-dir"]);
    expect(result.exitCode).toBe(MISSING_REPOSITORY);
  });
});
