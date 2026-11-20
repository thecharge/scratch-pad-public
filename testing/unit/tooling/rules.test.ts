import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  DevRule,
  HookJob,
  JOB_VERIFY_STEPS,
  PRE_PUSH_ONLY_STEPS,
  RepoPath,
  RULE_JOBS,
  VerifyStep,
} from "@platform/constants";
import { packagesWithoutReadme } from "../../../tooling/scripts/check-readmes.ts";
import { jobsIn, missingJobs } from "../../../tooling/scripts/check-rules.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

const lefthook = await Bun.file(join(REPO_ROOT, RepoPath.Lefthook)).text();
const commitSection = lefthook.split("\npre-push:")[0] ?? "";
const commitCommands = [...commitSection.matchAll(/^\s+run: (.+)$/gm)].map(
  (match) => match[1] as string,
);

test.each(commitCommands)("commit checks run in the checks container: %s", async (command) => {
  expect(command.split(" && ").every((part) => part.startsWith("bun run check:run "))).toBe(true);
});

describe("rule registry", () => {
  test("every development rule is backed by a job that exists in lefthook.yml", async () => {
    expect(await missingJobs(lefthook)).toEqual([]);
  });

  test("every rule names at least one job", () => {
    expect(Object.values(DevRule).filter((rule) => RULE_JOBS[rule].length === 0)).toEqual([]);
  });

  test("a missing hook job is reported with the rule that depends on it", async () => {
    const withoutStructure = lefthook
      .replace("bun run verify", "bun run incomplete")
      .replace(/- name: structure/g, "- name: renamed");
    expect((await missingJobs(withoutStructure)).join("\n")).toContain(HookJob.Structure);
  });

  test.each(Object.values(VerifyStep).map((step) => [step] as const))(
    "verify step %s is a pre-commit job or listed as pre-push only",
    async (step) => {
      const jobs = await jobsIn(lefthook);
      const backed = Object.entries(JOB_VERIFY_STEPS).some(
        ([job, jobStep]) => jobStep === step && jobs.has(job),
      );
      expect(backed || PRE_PUSH_ONLY_STEPS.includes(step)).toBe(true);
    },
  );

  test("a verify step without a pre-commit job is reported", async () => {
    const without = await jobsIn(lefthook.replace(/- name: rules/g, "- name: renamed"));
    expect(without.has(HookJob.Rules)).toBe(false);
  });

  test("no job runs in warn-only mode", () => {
    expect(lefthook).not.toMatch(/fail_text|skip:\s*true|\|\|\s*true/);
  });
});

describe("package READMEs", () => {
  test("every package has one", async () => {
    expect(await packagesWithoutReadme(join(REPO_ROOT, RepoPath.Packages))).toEqual([]);
  });
});
