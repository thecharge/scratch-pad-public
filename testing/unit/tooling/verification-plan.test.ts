import { expect, test } from "bun:test";
import {
  VERIFY_COMMANDS,
  VerificationArea,
  VerificationInputKind,
  VerificationReason,
} from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import type { VerificationPlan, VerificationTree } from "@platform/types";
import { VerificationPlanSchema } from "@platform/types";
import { verificationArea, verificationPlan } from "../../../tooling/scripts/verification-plan.ts";
import type { reportVerificationPlan } from "../../../tooling/scripts/verification-report.ts";
import type { runSteps } from "../../../tooling/scripts/verify.ts";
import { verify } from "../../../tooling/scripts/verify.ts";

const range = { base: "a".repeat(40), head: "b".repeat(40) };
const source = {
  path: "apps/api/src/main.ts",
  hash: "a".repeat(64),
  mode: 33188,
  kind: VerificationInputKind.File,
};
const guide = {
  path: "docs/testing.md",
  hash: "b".repeat(64),
  mode: 33188,
  kind: VerificationInputKind.File,
};
const clean: VerificationTree = {
  range,
  changed: [guide.path],
  dirty: [],
  files: [source, guide],
  problems: [],
};
const empty: VerificationTree = { changed: [], dirty: [], files: [], problems: [] };
const commands = {
  e2e: ["bun", "test", "suite"],
  coverage: ["bun", "run", "coverage"],
  audit: ["bun", "audit"],
  kb: ["bun", "run", "kb"],
};
const identity = ["bun-version", "node-version", "linux", "x64"];
const view = async (plan: VerificationPlan) => [
  VerificationPlanSchema.safeParse(plan).success,
  plan.fullRequired,
  plan.entries.map(({ execute }) => execute),
  plan.entries.map(({ candidate }) => candidate),
];

unit(verificationArea, {
  positive: [
    positive(
      "a developer guide has explicit ownership",
      ["docs/testing.md"],
      VerificationArea.Guide,
    ),
    positive(
      "an OpenSpec requirement has explicit ownership",
      ["openspec/changes/change/specs/a/spec.md"],
      VerificationArea.Guide,
    ),
  ],
  negative: [
    rejected("a shared schema is broad", ["packages/types/src/books.ts"], VerificationArea.Broad),
    rejected("an unfamiliar folder is unknown", ["private/fixture.bin"], VerificationArea.Unknown),
  ],
});

test.each([
  ["README.md", VerificationArea.Guide],
  ["AGENTS.md", VerificationArea.Guide],
  [".claude/skills/project-testing/SKILL.md", VerificationArea.Guide],
  [".claude/commands/dev/test.md", VerificationArea.Guide],
  ["openspec/changes/change/evidence/proof.json", VerificationArea.Guide],
  ["bun.lock", VerificationArea.Broad],
  ["apps/api/package.json", VerificationArea.Broad],
  [".claude/skills/skill-paths.json", VerificationArea.Broad],
  ["openspec/config.yaml", VerificationArea.Broad],
  ["tooling/scripts/verification-plan.ts", VerificationArea.Broad],
  ["apps/infra/containers/checks/Containerfile", VerificationArea.Broad],
  ["testing/e2e/api/books.test.ts", VerificationArea.Source],
  ["apps/console/src/main.tsx", VerificationArea.Source],
  ["docs/e2e/protocols.md", VerificationArea.Unknown],
  [".codex/config.toml", VerificationArea.Unknown],
  [".env", VerificationArea.Unknown],
])("classifies %s conservatively", async (path, area) => {
  expect(await verificationArea(path)).toBe(area);
});

const invalidDigest = { ...clean, files: [{ ...source, hash: "invalid" }] };
const invalidRange = { ...clean, range: { base: "--all", head: range.head } };

unit(verificationPlan, {
  positive: [
    positive(
      "a guide-only comparison still executes every check",
      [clean, commands, identity],
      seen(view, [true, true, [true, true, true, true], [true, false, false, true]]),
    ),
    positive(
      "an unchanged comparison is diagnostic only",
      [{ ...clean, changed: [] }, commands, identity],
      seen(view, [true, true, [true, true, true, true], [true, false, false, true]]),
    ),
  ],
  negative: [
    rejected(
      "an absent range cannot nominate reusable checks",
      [empty, commands, identity],
      seen(view, [true, true, [true, true, true, true], [false, false, false, false]]),
    ),
    rejected(
      "a dirty input cannot nominate reusable checks",
      [{ ...clean, dirty: [source.path] }, commands, identity],
      seen(view, [true, true, [true, true, true, true], [false, false, false, false]]),
    ),
    negative("an invalid input digest is rejected", [invalidDigest, commands, identity], {
      name: "ZodError",
    }),
    negative("an invalid range is rejected", [invalidRange, commands, identity], {
      name: "ZodError",
    }),
  ],
});

test.each([
  ["shared schema", ["packages/types/src/books.ts"], [], VerificationReason.BroadChange],
  [
    "renamed guide into unknown ownership",
    ["docs/old.md", "private/new.md"],
    [],
    VerificationReason.UnknownPath,
  ],
  ["deleted source", ["apps/api/src/deleted.ts"], [], VerificationReason.SourceChange],
  ["new suite", ["testing/e2e/api/new.test.ts"], [], VerificationReason.SourceChange],
  [
    "unresolved symbolic input",
    ["docs/testing.md"],
    ["external-link"],
    VerificationReason.InspectionFailed,
  ],
])("%s requires full execution", async (_name, changed, problems, reason) => {
  const plan = await verificationPlan({ ...clean, changed, problems }, VERIFY_COMMANDS, identity);
  expect(plan.reasons).toContain(reason);
  expect(plan.entries).toHaveLength(Object.keys(VERIFY_COMMANDS).length);
  expect(plan.entries.every(({ execute, candidate }) => execute && !candidate)).toBe(true);
});

test.each([
  ["fixture bytes", [{ ...source, hash: "c".repeat(64) }, guide]],
  ["newly discovered file", [source, guide, { ...source, path: "testing/fixtures/new.bin" }]],
  ["deleted file", [guide]],
  ["executable bit", [{ ...source, mode: 33261 }, guide]],
  ["symbolic input", [{ ...source, kind: VerificationInputKind.Symlink }, guide]],
])("%s invalidates all runtime candidates", async (_name, files) => {
  const baseline = await verificationPlan(clean, commands, identity);
  const mutated = await verificationPlan({ ...clean, files }, commands, identity);
  expect(mutated.entries.map(({ fingerprint }) => fingerprint)).not.toEqual(
    baseline.entries.map(({ fingerprint }) => fingerprint),
  );
});

test("a guide edit leaves only the runtime comparison fingerprint unchanged", async () => {
  const baseline = await verificationPlan(clean, commands, identity);
  const files = [source, { ...guide, hash: "d".repeat(64) }];
  const mutated = await verificationPlan({ ...clean, files }, commands, identity);
  expect(mutated.entries[0]?.fingerprint).toBe(baseline.entries[0]?.fingerprint);
  expect(mutated.entries[1]?.fingerprint).not.toBe(baseline.entries[1]?.fingerprint);
  expect(mutated.entries[2]?.fingerprint).not.toBe(baseline.entries[2]?.fingerprint);
  expect(mutated.entries[3]?.fingerprint).toBe(baseline.entries[3]?.fingerprint);
});

test.each([
  ["runtime identity", commands, [...identity, "different-runtime"]],
  ["launcher command", { ...commands, e2e: ["different-runner", "suite"] }, identity],
])(
  "a changed %s invalidates the comparison fingerprint",
  async (_name, nextCommands, nextIdentity) => {
    const baseline = await verificationPlan(clean, commands, identity);
    const mutated = await verificationPlan(clean, nextCommands, nextIdentity);
    expect(mutated.entries[0]?.fingerprint).not.toBe(baseline.entries[0]?.fingerprint);
  },
);

test("inventory order does not affect the fingerprint", async () => {
  const baseline = await verificationPlan(clean, commands, identity);
  const reordered = await verificationPlan(
    { ...clean, files: [guide, source] },
    commands,
    identity,
  );
  expect(reordered.entries).toEqual(baseline.entries);
});

test.each([
  undefined,
  null,
  {},
  { fullAfterAttempts: 0, fullMaxAgeMs: 86400000 },
  { fullAfterAttempts: 5, fullMaxAgeMs: -1 },
  { fullAfterAttempts: 1.5, fullMaxAgeMs: 86400000 },
])("an invalid cadence configuration %j cannot nominate reuse", async (policy) => {
  const plan = await verificationPlan(clean, commands, identity, policy ?? null);
  expect(plan.reasons).toContain(VerificationReason.InvalidPolicy);
  expect(plan.entries.every(({ execute, candidate }) => execute && !candidate)).toBe(true);
});

test("the validated default cadence is five attempts or twenty-four hours", async () => {
  const plan = await verificationPlan(clean, commands, identity);
  expect(plan.policy).toEqual({ fullAfterAttempts: 5, fullMaxAgeMs: 86400000 });
});

const ranges: unknown[] = [];
const offeredPush = {
  updates: [],
  range: { base: "a".repeat(40), head: "b".repeat(40) },
  reasons: [],
};
const reported: Readonly<Record<string, readonly string[]>>[] = [];
const executed: Readonly<Record<string, readonly string[]>>[] = [];
const reportStub: typeof reportVerificationPlan = async (_range, _root, _execute, supplied) => {
  ranges.push(_range);
  reported.push(supplied ?? {});
  return verificationPlan(empty, supplied ?? {}, identity);
};
const executeStub: typeof runSteps = async (supplied) => {
  executed.push(supplied);
  return 0;
};
const failedExecution = async () => 23;
const failedReport = async (): Promise<VerificationPlan> => {
  throw new Error("report write failed");
};
const executedAfterFailure: Readonly<Record<string, readonly string[]>>[] = [];
const executeAfterReportFailure: typeof runSteps = async (supplied) => {
  executedAfterFailure.push(supplied);
  return 0;
};
const verifyView = async (status: number) => [
  status,
  JSON.stringify(reported.at(-1)) === JSON.stringify(executed.at(-1)),
];

unit(verify, {
  positive: [
    positive(
      "the full planner receives the offered push range",
      [commands, reportStub, executeStub, offeredPush],
      seen(async () => ranges.at(-1), { base: "a".repeat(40), head: "b".repeat(40) }),
    ),
    positive(
      "reports and executes the same complete command set",
      [undefined, reportStub, executeStub],
      seen(verifyView, [0, true]),
    ),
    positive(
      "keeps explicit host orchestration in both report and execution",
      [commands, reportStub, executeStub],
      seen(verifyView, [0, true]),
    ),
  ],
  negative: [
    rejected(
      "a failed required phase keeps its failing status",
      [commands, reportStub, failedExecution],
      23,
    ),
    rejected(
      "a missing report fails while all mandatory phases still execute",
      [commands, failedReport, executeAfterReportFailure],
      seen(async (status: number) => [status, executedAfterFailure.length], [1, 1]),
    ),
  ],
});
