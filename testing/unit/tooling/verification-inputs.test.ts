import { afterAll, expect, test } from "bun:test";
import { mkdir, symlink } from "node:fs/promises";
import { join } from "node:path";
import { VERIFY_COMMANDS, VerificationReason } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { VerificationPlan, VerificationTree } from "@platform/types";
import type { run } from "../../../tooling/scripts/tools.ts";
import { inspectVerificationTree } from "../../../tooling/scripts/verification-inputs.ts";
import {
  explainVerification,
  reportVerificationPlan,
} from "../../../tooling/scripts/verification-report.ts";

afterAll(removeAll);

const range = { base: "a".repeat(40), head: "b".repeat(40) };
const root = await makeDir();
await writeFiles(root, {
  "README.md": "guide",
  "packages/lib/a.ts": "code",
  "fixture data.txt": "fixture",
});
await mkdir(join(root, "directory"));
await symlink("README.md", join(root, "link"));
const outside = await makeDir();
await writeFiles(outside, { "secret.txt": "outside" });
await symlink(outside, join(root, "outside"));
const baseCommand = `git rev-parse --verify --end-of-options ${range.base}^{commit}`;
const headCommand = `git rev-parse --verify --end-of-options ${range.head}^{commit}`;
const filesCommand = "git ls-files --cached --others --exclude-standard -z";
const untrackedCommand = "git ls-files --others --exclude-standard -z";
const dirtyCommand = `git diff --name-only --no-renames -z ${range.head} --`;
const changedCommand = `git diff --name-only --no-renames -z ${range.base} ${range.head} --`;
const outputs = {
  [baseCommand]: `${range.base}\n`,
  [headCommand]: `${range.head}\n`,
  "git rev-parse --verify HEAD": `${range.head}\n`,
  [filesCommand]: "README.md\0packages/lib/a.ts\0fixture data.txt\0README.md\0",
  [untrackedCommand]: "",
  [dirtyCommand]: "",
  [changedCommand]: "README.md\0",
};
const gitResults =
  async (values: Readonly<Record<string, string>>): Promise<typeof run> =>
  async (command) => ({
    exitCode: Number(values[command.join(" ")] === undefined),
    stdout: values[command.join(" ")] ?? "",
    stderr: "",
  });
const successful = await gitResults(outputs);
const unstaged = await gitResults({
  ...outputs,
  [dirtyCommand]: "packages/lib/a.ts\0",
  [untrackedCommand]: "fixture data.txt\0",
});
const failure = await gitResults({});
const wrongCommit = await gitResults({ ...outputs, [baseCommand]: `${range.head}\n` });
const view = async (tree: VerificationTree) => ({
  changed: tree.changed,
  dirty: tree.dirty,
  paths: tree.files.map(({ path }) => path),
  problems: tree.problems,
});
const cleanView = {
  changed: ["README.md"],
  dirty: [],
  paths: ["README.md", "fixture data.txt", "packages/lib/a.ts"],
  problems: [],
};
const dirtyView = {
  changed: [],
  dirty: ["fixture data.txt", "packages/lib/a.ts"],
  paths: cleanView.paths,
  problems: [],
};
const failedView = {
  changed: [],
  dirty: [],
  paths: [],
  problems: [VerificationReason.InspectionFailed],
};

unit(inspectVerificationTree, {
  positive: [
    positive(
      "inspects a supplied range without starting a process",
      [range, root, successful],
      seen(view, cleanView),
    ),
    positive(
      "retains dirty and untracked inventory without assuming a range",
      [undefined, root, unstaged],
      seen(view, dirtyView),
    ),
  ],
  negative: [
    rejected(
      "a Git failure gives an incomplete full-run input",
      [range, root, failure],
      seen(view, failedView),
    ),
    rejected(
      "a range that does not resolve exactly cannot certify inputs",
      [range, root, wrongCommit],
      seen(view, failedView),
    ),
  ],
});

test.each([
  "../outside",
  "/absolute",
  "docs/../README.md",
  "docs//file",
  "./README.md",
  "missing.ts",
  "directory",
  "outside/secret.txt",
])("an unsafe or unreadable input %s makes inspection incomplete", async (path) => {
  const execute = await gitResults({ ...outputs, [filesCommand]: `${path}\0` });
  const tree = await inspectVerificationTree(range, root, execute);
  expect(await view(tree)).toEqual(failedView);
});

test("a symbolic dependency is recorded but never considered resolved", async () => {
  const execute = await gitResults({ ...outputs, [filesCommand]: "link\0" });
  const tree = await inspectVerificationTree(range, root, execute);
  expect(tree.problems).toEqual(["link"]);
  expect(tree.files[0]).toMatchObject({ path: "link", kind: "symlink" });
  expect(tree.files[0]?.hash).toMatch(/^[a-f0-9]{64}$/);
});

test.each(["not-a-commit", "--all"])("an invalid range value %s cannot reach Git", async (base) => {
  const calls: string[][] = [];
  const execute: typeof run = async (command) => {
    calls.push([...command]);
    return { exitCode: 0, stdout: "", stderr: "" };
  };
  expect(
    (await inspectVerificationTree({ base, head: range.head }, root, execute)).problems,
  ).not.toEqual([]);
  expect(calls).toEqual([]);
});

const blocked = await makeDir();
await writeFiles(blocked, { ".stack": "blocked" });
const directoryReport = await makeDir();
await mkdir(join(directoryReport, ".stack/verify/plan.json"), { recursive: true });
const reportView = async (plan: VerificationPlan) => [
  plan.reportOnly,
  plan.fullRequired,
  plan.entries.map(({ step }) => step),
];

unit(reportVerificationPlan, {
  positive: [
    positive(
      "a report accounts for every mandatory command",
      [range, root, successful],
      seen(reportView, [true, true, Object.keys(VERIFY_COMMANDS)]),
    ),
    positive(
      "an incomplete inspection remains a full-execution report",
      [range, root, failure, { audit: ["bun", "audit"] }],
      seen(reportView, [true, true, ["audit"]]),
    ),
  ],
  negative: [
    negative("a blocked report directory fails visibly", [range, blocked, failure], {
      code: "ENOTDIR",
    }),
    negative("an invalid report destination fails visibly", [range, directoryReport, failure], {
      code: "EISDIR",
    }),
  ],
});

const quiet = async () => undefined;
unit(explainVerification, {
  positive: [
    positive(
      "explains missing push information without certifying it",
      [[], root, successful, quiet],
      0,
    ),
    positive(
      "explains an exact comparison",
      [[range.base, range.head], root, successful, quiet],
      0,
    ),
    positive(
      "writes only below an explicitly selected fixture root",
      [["--root", root, range.base, range.head], blocked, successful, quiet],
      0,
    ),
    positive(
      "a selected root can omit the comparison range",
      [["--root", root], blocked, successful, quiet],
      0,
    ),
  ],
  negative: [
    negative(
      "an option cannot become a commit argument",
      [["--all", range.head], root, successful, quiet],
      { name: "ZodError" },
    ),
    negative(
      "extra arguments are rejected",
      [[range.base, range.head, "extra"], root, successful, quiet],
      { name: "ZodError" },
    ),
  ],
});
