import { afterAll, expect, test } from "bun:test";
import { rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { VERIFY_COMMANDS } from "@platform/constants";
import { gitRepo, removeAll, writeFiles } from "@platform/test-scenarios";
import { VerificationPlanSchema } from "@platform/types";
import { REPO_ROOT, run } from "../../../tooling/scripts/tools.ts";
import { inspectVerificationTree } from "../../../tooling/scripts/verification-inputs.ts";
import { verificationPlan } from "../../../tooling/scripts/verification-plan.ts";

afterAll(removeAll);

const root = await gitRepo(
  {
    "docs/old.md": "a guide",
    "apps/api/src/deleted.ts": "old source",
    "apps/api/src/unchanged.ts": "unchanged",
  },
  true,
  true,
);
const base = (await run(["git", "rev-parse", "HEAD"], { cwd: root })).stdout.trim();
await rename(join(root, "docs/old.md"), join(root, "docs/new.md"));
await rm(join(root, "apps/api/src/deleted.ts"));
await writeFiles(root, { "testing/e2e/new.test.ts": "new test" });
await run(["git", "add", "--all"], { cwd: root });
const commit = await run(
  [
    "git",
    "-c",
    "user.name=Integration",
    "-c",
    "user.email=integration@example.test",
    "commit",
    "-qm",
    "test: update fixture",
  ],
  { cwd: root },
);
const head = (await run(["git", "rev-parse", "HEAD"], { cwd: root })).stdout.trim();
const clean = await inspectVerificationTree({ base, head }, root);
await writeFiles(root, {
  "apps/api/src/unchanged.ts": "dirty bytes",
  "testing/fixture.txt": "untracked input",
});
await run(["git", "add", "apps/api/src/unchanged.ts"], { cwd: root });
const dirty = await inspectVerificationTree({ base, head }, root);

test("a real commit range includes both sides of renames, deletion and discovery", async () => {
  expect(commit.exitCode).toBe(0);
  expect(clean.range).toEqual({ base, head });
  expect(clean.changed).toEqual([
    "apps/api/src/deleted.ts",
    "docs/new.md",
    "docs/old.md",
    "testing/e2e/new.test.ts",
  ]);
  expect(clean.dirty).toEqual([]);
  expect(clean.problems).toEqual([]);
  expect(clean.files.map(({ path }) => path)).toEqual([
    "apps/api/src/unchanged.ts",
    "docs/new.md",
    "testing/e2e/new.test.ts",
  ]);
});

test("staged source bytes and untracked fixture inputs do not certify the commit", async () => {
  expect(dirty.dirty).toEqual(["apps/api/src/unchanged.ts", "testing/fixture.txt"]);
  expect(dirty.files.map(({ path }) => path)).toContain("testing/fixture.txt");
  const plan = await verificationPlan(dirty, { e2e: ["bun", "test"] }, [Bun.version]);
  expect(plan.entries[0]).toMatchObject({ execute: true, candidate: false });
  expect(plan.fullRequired).toBe(true);
});

test.each(["not-a-commit", "f".repeat(40)])(
  "a missing or invalid base %s gives a full fallback",
  async (missing) => {
    const tree = await inspectVerificationTree({ base: missing, head }, root);
    expect(tree.problems.length).toBeGreaterThan(0);
    const plan = await verificationPlan(tree, { e2e: ["bun", "test"] }, [Bun.version]);
    expect(plan.entries[0]).toMatchObject({ execute: true, candidate: false });
  },
);

test("the explain CLI writes a diagnostic report and certifies no reuse", async () => {
  const result = await run(["bun", "run", "verify:plan", "--root", root, base, head], {
    cwd: REPO_ROOT,
  });
  const plan = VerificationPlanSchema.parse(JSON.parse(result.stdout));
  expect(result.exitCode).toBe(0);
  expect(plan.fullRequired).toBe(true);
  expect(plan.reportOnly).toBe(true);
  expect(plan.entries.map(({ step }) => step)).toEqual(Object.keys(VERIFY_COMMANDS));
  expect(plan.entries.every(({ execute }) => execute)).toBe(true);
  expect(plan.range).toEqual({ base, head });
  expect(plan.problems).toEqual([]);
  expect(plan.dirty).toEqual(["apps/api/src/unchanged.ts", "testing/fixture.txt"]);
  expect(
    VerificationPlanSchema.parse(await Bun.file(join(root, ".stack/verify/plan.json")).json()),
  ).toEqual(plan);
});

test("the explain CLI rejects an option masquerading as a commit", async () => {
  const result = await run(["bun", "run", "verify:plan", "--all", head], { cwd: REPO_ROOT });
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain("ZodError");
});
