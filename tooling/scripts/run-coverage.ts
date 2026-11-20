import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  COVERAGE_BLOCKING,
  COVERAGE_DIR_FLAG,
  COVERAGE_FLAGS,
  COVERAGE_METRICS_LABEL,
  COVERAGE_REPORT_GLOB,
  COVERAGE_TEMP_PREFIX,
  COVERAGE_TIMINGS_FILE,
  Glyph,
  JUNIT_FILE,
  JUNIT_FLAG,
  JUNIT_OUTFILE_FLAG,
  JUNIT_REPORT_GLOB,
  METRICS_REPORT_DIR_ENV,
  MessageId,
  MILLISECONDS_PER_SECOND,
  SLOWEST_TESTS_FILE,
  StdioMode,
  TEST_CHILD_REPORT_DIR_ENV,
  TestTier,
  Text,
  VERIFY_REPORT_DIR,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync } from "@platform/store";
import type { CoverageGap, CoverageRun, StepTiming } from "@platform/types";
import { all } from "@platform/util";
import { unitDebt } from "./check-unit-cases.ts";
import { coverageGaps, mergeLcov, parseLcov, productFiles, unloadedProducts } from "./coverage.ts";
import {
  discardMetrics,
  enforceMetrics,
  metricsDir,
  prepareMetrics,
  slowestOf,
  slowTestsOf,
} from "./metrics-run.ts";
import { testCommand } from "./run-tier.ts";
import { groupsOf, testFiles, tierOf } from "./test-tiers.ts";
import { REPO_ROOT } from "./tools.ts";
import { writeTimings } from "./verification-timing.ts";

async function groupEnvironment(
  group: readonly string[],
  target: string,
): Promise<Record<string, string>> {
  const units = await filterAsync(group, async (file) => (await tierOf(file)) === TestTier.Unit);
  const environment = { ...Bun.env, [TEST_CHILD_REPORT_DIR_ENV]: target } as Record<string, string>;
  if (units.length > 0) {
    delete environment[METRICS_REPORT_DIR_ENV];
  }
  return environment;
}

export async function runGroup(group: readonly string[], target: string): Promise<CoverageRun> {
  await mkdir(target, { recursive: true });
  const junit = join(target, JUNIT_FILE);
  const flags = [
    ...COVERAGE_FLAGS,
    `${COVERAGE_DIR_FLAG}${target}`,
    JUNIT_FLAG,
    `${JUNIT_OUTFILE_FLAG}${junit}`,
  ];
  const child = Bun.spawn(await testCommand(group, flags), {
    env: await groupEnvironment(group, target),
    stdout: StdioMode.Inherit,
    stderr: StdioMode.Inherit,
  });
  const ok = (await child.exited) === 0;
  const sources = await Array.fromAsync(
    new Bun.Glob(COVERAGE_REPORT_GLOB).scan({ cwd: target, absolute: true }),
  );
  const timings = await Array.fromAsync(
    new Bun.Glob(JUNIT_REPORT_GLOB).scan({ cwd: target, absolute: true }),
  );
  const reports = await all(
    sources.map((file) => async () => parseLcov(await Bun.file(file).text())),
  );
  const slow = await all(
    timings.map((file) => async () => slowTestsOf(await Bun.file(file).text())),
  );
  return { lcov: await mergeLcov(reports), ok, slow: slow.flat() };
}

async function report(gaps: readonly CoverageGap[], failed: readonly string[]): Promise<void> {
  for (const group of failed) {
    console.error(message(MessageId.CoverageTestsFailed, { group }));
  }
  for (const gap of gaps) {
    console.error(
      message(MessageId.CoverageGap, {
        file: gap.file,
        lines: gap.uncoveredLines.length,
        lineList: gap.uncoveredLines.join(Glyph.Comma),
        functions: gap.functionsMissing,
      }),
    );
  }
}

async function discardAndPass(dir: string): Promise<number> {
  await discardMetrics(dir);
  return 0;
}

export async function runCoverage(
  tiers: readonly TestTier[],
  group: typeof runGroup = runGroup,
  blocking: boolean = COVERAGE_BLOCKING,
  root: string = REPO_ROOT,
  enforce: (dir: string) => Promise<number> = enforceMetrics,
): Promise<number> {
  const timings: StepTiming[] = [];
  await writeTimings(timings, root, COVERAGE_TIMINGS_FILE);
  const metrics = await metricsDir(root, COVERAGE_METRICS_LABEL);
  const measured = tiers.includes(TestTier.Integration);
  if (measured) {
    await prepareMetrics(metrics);
  }
  const dir = await mkdtemp(join(tmpdir(), COVERAGE_TEMP_PREFIX));
  const files = await filterAsync(await testFiles(root), async (file) =>
    tiers.includes((await tierOf(file)) as TestTier),
  );
  const runs = [];
  for (const [index, names] of (await groupsOf(files)).entries()) {
    const started = performance.now();
    const result = await group(names, join(dir, String(index)));
    runs.push({ group: names, ...result });
    timings.push({
      step: names.join(Glyph.Space),
      ok: result.ok,
      seconds: (performance.now() - started) / MILLISECONDS_PER_SECOND,
    });
    await writeTimings(timings, root, COVERAGE_TIMINGS_FILE);
  }
  await rm(dir, { recursive: true, force: true });
  const slowest = await slowestOf(runs.flatMap((run) => run.slow ?? []));
  for (const [index, test] of slowest.entries()) {
    console.log(
      message(MessageId.SlowTest, {
        rank: index + 1,
        seconds: test.seconds,
        name: test.name,
        file: test.file,
      }),
    );
  }
  await Bun.write(
    join(root, VERIFY_REPORT_DIR, SLOWEST_TESTS_FILE),
    JSON.stringify(slowest, null, 2),
  );
  const merged = await mergeLcov(runs.map((run) => run.lcov));
  const gaps = [...(await coverageGaps(merged, root)), ...(await unloadedProducts(merged, root))];
  const failed = runs.filter((run) => !run.ok).map((run) => run.group.join(Glyph.Space));
  await report(gaps, failed);
  console.log(message(MessageId.CoverageBranchesUnmeasured));
  const ok = gaps.length === 0 && failed.length === 0;
  const measuredCode = measured ? await (ok ? enforce(metrics) : discardAndPass(metrics)) : 0;
  const covered = (await productFiles(merged)).length;
  console.log(ok ? message(MessageId.CoverageOk, { files: covered }) : Text.Empty);
  console.log(message(MessageId.CoverageDebt, { debt: (await unitDebt(root)).length }));
  console.log(blocking ? Text.Empty : message(MessageId.CoverageReportOnly));
  return (ok || !blocking) && measuredCode === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(await runCoverage(Bun.argv.slice(2) as TestTier[]));
