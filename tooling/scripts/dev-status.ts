import { dirname, join } from "node:path";
import {
  COVERAGE_BLOCKING,
  CoverageMode,
  DevStatusSource,
  GIT_AHEAD_BEHIND_COMMAND,
  MessageId,
  OPEN_CHANGES_DIR,
  OPEN_CHANGES_GLOB,
  TASK_ANY_PATTERN,
  TASK_DONE_PATTERN,
  TASKS_FILE,
  TestTier,
  Text,
  UNIT_DEBT_FILE,
  WHITESPACE,
} from "@platform/constants";
import { message } from "@platform/messages";
import {
  type DevStatusSection,
  type GitPosition,
  GitPositionSchema,
  type OpenChange,
  type TaskCounts,
} from "@platform/types";
import { all } from "@platform/util";
import { commandNames, projectSkills } from "./check-agent-knowledge.ts";
import { testFiles, tierOf } from "./test-tiers.ts";
import { REPO_ROOT, run } from "./tools.ts";

export async function taskCounts(text: string): Promise<TaskCounts> {
  return {
    completedTasks: (text.match(TASK_DONE_PATTERN) ?? []).length,
    totalTasks: (text.match(TASK_ANY_PATTERN) ?? []).length,
  };
}

export async function readOpenChanges(root: string): Promise<OpenChange[]> {
  const base = join(root, OPEN_CHANGES_DIR);
  const found = await Array.fromAsync(new Bun.Glob(OPEN_CHANGES_GLOB).scan({ cwd: base }));
  const names = found.map((file) => dirname(file)).sort();
  const texts = await all(
    names.map((name) => async () => Bun.file(join(base, name, TASKS_FILE)).text()),
  );
  return await all(
    names.map((name, index) => async () => ({
      name,
      ...(await taskCounts(texts[index] ?? Text.Empty)),
    })),
  );
}

export async function parseGitPosition(text: string): Promise<GitPosition> {
  const [behind, ahead] = text.trim().split(WHITESPACE).map(Number);
  return GitPositionSchema.parse({ behind, ahead });
}

export async function changeLines(changes: readonly OpenChange[]): Promise<string[]> {
  return changes.length === 0
    ? [message(MessageId.DevStatusNoChange)]
    : changes.map(({ name, completedTasks, totalTasks }) =>
        message(MessageId.DevStatusChange, { name, done: completedTasks, total: totalTasks }),
      );
}

export async function debtCount(text: string): Promise<number> {
  const listed: unknown = JSON.parse(text);
  if (!Array.isArray(listed)) {
    throw new Error(message(MessageId.DevStatusUnavailable, { source: UNIT_DEBT_FILE }));
  }
  return listed.length;
}

export async function coverageMode(blocking: boolean = COVERAGE_BLOCKING): Promise<CoverageMode> {
  return blocking ? CoverageMode.Blocking : CoverageMode.ReportOnly;
}

export async function tierCounts(files: readonly string[]): Promise<Record<TestTier, number>> {
  const tiers = await all(files.map((file) => async () => tierOf(file)));
  return {
    [TestTier.Unit]: tiers.filter((tier) => tier === TestTier.Unit).length,
    [TestTier.Integration]: tiers.filter((tier) => tier === TestTier.Integration).length,
    [TestTier.E2e]: tiers.filter((tier) => tier === TestTier.E2e).length,
  };
}

async function output(command: readonly string[], root: string): Promise<string> {
  const result = await run(command, { cwd: root });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr);
  }
  return result.stdout;
}

async function section(
  source: DevStatusSource,
  read: () => Promise<string[]>,
): Promise<DevStatusSection> {
  try {
    return { lines: await read(), ok: true };
  } catch {
    return { lines: [message(MessageId.DevStatusUnavailable, { source })], ok: false };
  }
}

async function openSpecLines(root: string): Promise<string[]> {
  return changeLines(await readOpenChanges(root));
}

async function debtLines(root: string): Promise<string[]> {
  const count = await debtCount(await Bun.file(join(root, UNIT_DEBT_FILE)).text());
  return [
    message(MessageId.DevStatusUnitDebt, { count }),
    message(MessageId.DevStatusCoverage, { mode: await coverageMode() }),
  ];
}

async function testLines(root: string): Promise<string[]> {
  const counts = await tierCounts(await testFiles(root));
  return [
    message(MessageId.DevStatusTests, {
      unit: counts[TestTier.Unit],
      integration: counts[TestTier.Integration],
      e2e: counts[TestTier.E2e],
    }),
  ];
}

async function inventoryLines(root: string): Promise<string[]> {
  const [skills, commands] = await all([
    async () => projectSkills(root),
    async () => commandNames(root),
  ]);
  return [
    message(MessageId.DevStatusInventory, {
      skills: skills?.length ?? 0,
      commands: commands?.length ?? 0,
    }),
  ];
}

async function gitLines(root: string): Promise<string[]> {
  const { behind, ahead } = await parseGitPosition(await output(GIT_AHEAD_BEHIND_COMMAND, root));
  return [message(MessageId.DevStatusGit, { behind, ahead })];
}

export async function devStatus(root: string = REPO_ROOT): Promise<number> {
  const sections = await all([
    async () => section(DevStatusSource.OpenSpec, async () => openSpecLines(root)),
    async () => section(DevStatusSource.UnitDebt, async () => debtLines(root)),
    async () => section(DevStatusSource.Tests, async () => testLines(root)),
    async () => section(DevStatusSource.Inventory, async () => inventoryLines(root)),
    async () => section(DevStatusSource.Git, async () => gitLines(root)),
  ]);
  console.log(sections.flatMap(({ lines }) => lines).join(Text.Newline));
  return sections.every(({ ok }) => ok) ? 0 : 1;
}

if (import.meta.main) process.exit(await devStatus());
