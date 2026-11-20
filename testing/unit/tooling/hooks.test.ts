import { afterAll, describe, expect, test } from "bun:test";
import { dirname, join, resolve } from "node:path";
import { RepoPath, VERIFY_COMMANDS, VerifyStep } from "@platform/constants";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { LefthookSchema } from "@platform/types";
import { REPO_ROOT, run } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

const lefthookText = await Bun.file(join(REPO_ROOT, RepoPath.Lefthook)).text();
const hookConfig = LefthookSchema.parse(Bun.YAML.parse(lefthookText));
const verificationPushJob = {
  name: "verify",
  run: "bun run verify",
  use_stdin: true,
  env: { PLATFORM_VERIFY_PUSH: "1" },
};
const jobs = hookConfig["pre-commit"].jobs;
const jobNamed = (name: string) => jobs.find((job) => job.name === name);
const BARE_PATH = `${dirname(process.execPath)}:/usr/bin:/bin`;

async function hookExitCode(command: string): Promise<number> {
  const dir = await makeDir();
  await writeFiles(dir, { "a.ts": "export const a = 1;\n" });
  const result = await run(["sh", "-c", command], { cwd: dir, env: { PATH: BARE_PATH } });
  return result.exitCode;
}

const finalCommand = (name: string) =>
  (jobNamed(name)?.run ?? "").split(" && ").at(-1)?.replace("{staged_files}", "a.ts") ?? "";

describe("hooks installed", () => {
  test("push runs the complete verification pipeline exactly once", () => {
    expect(hookConfig["pre-push"]?.jobs).toEqual([verificationPushJob]);
  });

  test("verification builds documentation through end-to-end without a duplicate command", () => {
    expect(VERIFY_COMMANDS[VerifyStep.E2e]).toEqual([
      "bun",
      "run",
      "tooling/scripts/run-tier.ts",
      "e2e",
    ]);
    expect(
      Object.values(VERIFY_COMMANDS).filter((command) =>
        command.includes("tooling/scripts/build-docs.ts"),
      ),
    ).toEqual([]);
  });

  test.each(["docs", "kb"])("commit does not repeat the expensive %s generation", (name) => {
    expect(jobNamed(name)).toBeUndefined();
  });
  test("prepare installs lefthook", async () => {
    const manifest = await Bun.file(join(REPO_ROOT, "package.json")).json();
    expect(manifest.scripts.prepare).toBe("lefthook install");
  });

  test("the pre-commit hook exists and runs lefthook", async () => {
    const located = await run(["git", "rev-parse", "--git-path", "hooks/pre-commit"]);
    const hook = await Bun.file(resolve(REPO_ROOT, located.stdout.trim())).text();
    expect(hook).toContain("lefthook");
  });
});

describe("formatter hooks fail closed", () => {
  test.each([["biome"], ["dprint"]])("%s runs from local binaries only", async (name) => {
    const manifest = await Bun.file(join(REPO_ROOT, "package.json")).json();
    expect(jobNamed(name)?.run).toContain(`bun run check:run bun run tool:${name}`);
    expect(manifest.scripts[`tool:${name}`]).toBe(`bunx --no-install ${name}`);
  });

  test.each([["biome"], ["dprint"], ["cspell"], ["secretlint"]])(
    "%s has no fallback that swallows failure",
    (name) => {
      expect(jobNamed(name)?.run).not.toMatch(/\|\||;\s*true|\bexit 0\b/);
    },
  );

  test("the biome job fixes and restages", () => {
    expect(jobNamed("biome")).toMatchObject({ stage_fixed: true });
    expect(jobNamed("biome")?.run).toContain("--write");
  });

  test.each([["biome"], ["dprint"]])(
    "the real %s command exits non-zero when the binary is missing",
    async (name) => {
      expect(await hookExitCode(finalCommand(name))).not.toBe(0);
    },
  );

  test("an unknown tool run the same way exits non-zero", async () => {
    expect(await hookExitCode("bunx --no-install nonexistent-tool")).not.toBe(0);
  });
});
