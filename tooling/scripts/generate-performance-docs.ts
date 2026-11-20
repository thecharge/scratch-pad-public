import { join } from "node:path";
import {
  BENCH_EVIDENCE_DIR,
  BENCH_EVIDENCE_FILE,
  BENCH_TABLE_COLUMNS,
  CONTAINERS_FILE,
  METRICS_REPORT_FILE,
  METRICS_ROOT_DIR,
  OPERATION_KEY_SEPARATOR,
  PERFORMANCE_BENCH_HEAD,
  PERFORMANCE_E2E_USAGE_HEAD,
  PERFORMANCE_FRONT,
  PERFORMANCE_INTRO,
  PERFORMANCE_OPERATIONS_COLUMNS,
  PERFORMANCE_OPERATIONS_HEAD,
  PERFORMANCE_PAGE,
  PERFORMANCE_PROCESS_COLUMNS,
  PERFORMANCE_PROCESS_HEAD,
  PERFORMANCE_SLOW_COLUMNS,
  PERFORMANCE_SLOW_STEPS_HEAD,
  PERFORMANCE_SLOW_TESTS_HEAD,
  PERFORMANCE_STEP_COLUMNS,
  PERFORMANCE_USAGE_COLUMNS,
  PERFORMANCE_USAGE_HEAD,
  PROTOCOL_REPORT_DIR,
  SLOWEST_TESTS_FILE,
  TestTier,
  Text,
  VERIFY_REPORT_DIR,
  VERIFY_STEPS_FILE,
} from "@platform/constants";
import {
  type BenchReport,
  BenchReportSchema,
  type ContainerUsage,
  ContainerUsageSchema,
  type MetricsReport,
  MetricsReportSchema,
  type SlowTest,
  SlowTestSchema,
  type StepTiming,
  StepTimingSchema,
} from "@platform/types";
import { benchRows, markdownTable } from "@platform/util";
import { z } from "zod";

const DIGITS = 2;

async function operationRows(report: MetricsReport) {
  return Object.entries(report.operations).map(([key, stats]) => {
    const [capability = Text.Empty, form = Text.Empty, version = Text.Empty] =
      key.split(OPERATION_KEY_SEPARATOR);
    return [
      capability,
      form,
      version,
      stats.count,
      (report.requestsPerSecond[key] ?? 0).toFixed(DIGITS),
      report.firstByteP95Ms[key] ?? 0,
      report.p95Ms[key] ?? 0,
      stats.errors,
      stats.bytes,
    ];
  });
}

export async function performancePage(
  report: MetricsReport,
  bench?: BenchReport,
  slowTests: readonly SlowTest[] = [],
  steps: readonly StepTiming[] = [],
  containers: readonly ContainerUsage[] = [],
): Promise<string> {
  const lines = [
    ...PERFORMANCE_FRONT,
    Text.Empty,
    PERFORMANCE_INTRO,
    Text.Empty,
    PERFORMANCE_OPERATIONS_HEAD,
    Text.Empty,
    ...(await markdownTable(PERFORMANCE_OPERATIONS_COLUMNS, await operationRows(report))),
    PERFORMANCE_PROCESS_HEAD,
    Text.Empty,
    ...(await markdownTable(PERFORMANCE_PROCESS_COLUMNS, [
      [
        report.rssBytes,
        report.rssGrowthBytes,
        report.heapUsedBytes,
        report.eventLoopDelayMaxMs.toFixed(DIGITS),
        report.heapCollections,
        report.forcedGcMs.toFixed(DIGITS),
      ],
    ])),
  ];
  if (slowTests.length > 0) {
    lines.push(
      PERFORMANCE_SLOW_TESTS_HEAD,
      Text.Empty,
      ...(await markdownTable(
        PERFORMANCE_SLOW_COLUMNS,
        slowTests.map((test) => [test.seconds, test.name, test.file]),
      )),
    );
  }
  if (steps.length > 0) {
    lines.push(
      PERFORMANCE_SLOW_STEPS_HEAD,
      Text.Empty,
      ...(await markdownTable(
        PERFORMANCE_STEP_COLUMNS,
        [...steps]
          .sort((left, right) => right.seconds - left.seconds)
          .map((step) => [step.seconds.toFixed(DIGITS), step.step]),
      )),
    );
  }
  if (containers.length > 0) {
    lines.push(
      PERFORMANCE_E2E_USAGE_HEAD,
      Text.Empty,
      ...(await markdownTable(
        PERFORMANCE_USAGE_COLUMNS,
        containers.map((item) => [
          item.name,
          item.cpu_percent,
          item.mem_usage,
          item.net_io,
          item.pids,
        ]),
      )),
    );
  }
  if (bench !== undefined) {
    lines.push(
      PERFORMANCE_BENCH_HEAD,
      Text.Empty,
      ...(await markdownTable(BENCH_TABLE_COLUMNS, await benchRows(bench))),
      PERFORMANCE_USAGE_HEAD,
      Text.Empty,
      ...(await markdownTable(
        PERFORMANCE_USAGE_COLUMNS,
        bench.usage.map((item) => [
          item.name,
          item.cpu_percent,
          item.mem_usage,
          item.net_io,
          item.pids,
        ]),
      )),
    );
  }
  return lines.join(Text.Newline);
}

async function readJson<T>(path: string, schema: z.ZodType<T>): Promise<T | undefined> {
  const file = Bun.file(path);
  return (await file.exists()) ? schema.parse(await file.json()) : undefined;
}

export async function generatePerformanceDocs(content: string, root: string): Promise<boolean> {
  const report = await readJson(
    join(root, METRICS_ROOT_DIR, TestTier.E2e, METRICS_REPORT_FILE),
    MetricsReportSchema,
  );
  if (report === undefined) {
    return false;
  }
  const bench = await readJson(
    join(root, BENCH_EVIDENCE_DIR, BENCH_EVIDENCE_FILE),
    BenchReportSchema,
  );
  const slow = await readJson(
    join(root, VERIFY_REPORT_DIR, SLOWEST_TESTS_FILE),
    z.array(SlowTestSchema),
  );
  const steps = await readJson(
    join(root, VERIFY_REPORT_DIR, VERIFY_STEPS_FILE),
    z.array(StepTimingSchema),
  );
  const containers = await readJson(
    join(root, PROTOCOL_REPORT_DIR, CONTAINERS_FILE),
    z.array(ContainerUsageSchema),
  );
  await Bun.write(
    join(content, PERFORMANCE_PAGE),
    await performancePage(report, bench, slow, steps, containers),
  );
  return true;
}
