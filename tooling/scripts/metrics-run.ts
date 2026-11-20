import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  DIAGNOSIS_DIGITS,
  DIAGNOSIS_FILE,
  DIAGNOSIS_SLOWEST_COUNT,
  FileSuffix,
  JUNIT_TESTCASE_PATTERN,
  LONG_RUNNING_OPERATIONS,
  METRIC_BUDGET_EVENT_LOOP_DELAY_MS,
  METRIC_BUDGET_HEAP_USED_BYTES,
  METRIC_BUDGET_LONG_RUNNING_P95_MS,
  METRIC_BUDGET_OPERATION_P95_MS,
  METRICS_REPORT_DIR_ENV,
  METRICS_REPORT_FILE,
  METRICS_ROOT_DIR,
  MessageId,
  MetricsSubject,
  OPERATION_KEY_SEPARATOR,
  PERCENTILE_95,
  SLOWEST_TESTS_COUNT,
  Text,
} from "@platform/constants";
import { percentileMs } from "@platform/events";
import { message } from "@platform/messages";
import type { MetricsReport, MetricsSnapshot, OperationStats, SlowTest } from "@platform/types";
import { MetricsSnapshotListSchema } from "@platform/types";

export async function metricsDir(root: string, label: string): Promise<string> {
  return join(root, METRICS_ROOT_DIR, label);
}

export async function prepareMetrics(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  Bun.env[METRICS_REPORT_DIR_ENV] = dir;
}

export async function discardMetrics(dir: string): Promise<void> {
  delete Bun.env[METRICS_REPORT_DIR_ENV];
  await rm(dir, { recursive: true, force: true });
}

async function snapshotsIn(dir: string): Promise<MetricsSnapshot[]> {
  const names = (await readdir(dir).catch(() => [])).filter(
    (name) => name.endsWith(FileSuffix.Json) && name !== METRICS_REPORT_FILE,
  );
  const lists = [];
  for (const name of names) {
    lists.push(MetricsSnapshotListSchema.parse(await Bun.file(join(dir, name)).json()));
  }
  return lists.flat();
}

async function combined(
  left: OperationStats | undefined,
  right: OperationStats,
): Promise<OperationStats> {
  return {
    count: (left?.count ?? 0) + right.count,
    errors: (left?.errors ?? 0) + right.errors,
    totalMs: (left?.totalMs ?? 0) + right.totalMs,
    maxMs: Math.max(left?.maxMs ?? 0, right.maxMs),
    bytes: (left?.bytes ?? 0) + right.bytes,
    buckets: right.buckets.map((count, index) => count + (left?.buckets[index] ?? 0)),
    firstByteTotalMs: (left?.firstByteTotalMs ?? 0) + right.firstByteTotalMs,
    firstByteMaxMs: Math.max(left?.firstByteMaxMs ?? 0, right.firstByteMaxMs),
    firstByteBuckets: right.firstByteBuckets.map(
      (count, index) => count + (left?.firstByteBuckets[index] ?? 0),
    ),
  };
}

export async function mergeSnapshots(
  snapshots: readonly MetricsSnapshot[],
): Promise<MetricsReport> {
  const operations: Record<string, OperationStats> = {};
  for (const snapshot of snapshots) {
    for (const [key, stats] of Object.entries(snapshot.operations)) {
      operations[key] = await combined(operations[key], stats);
    }
  }
  const processes = snapshots.map((snapshot) => snapshot.process);
  const percentiles: Record<string, number> = {};
  const firstBytes: Record<string, number> = {};
  const rates: Record<string, number> = {};
  const seconds = Math.max(1, ...processes.map((value) => value.uptimeSeconds));
  for (const [key, stats] of Object.entries(operations)) {
    percentiles[key] = await percentileMs(stats.buckets, PERCENTILE_95);
    firstBytes[key] = await percentileMs(stats.firstByteBuckets, PERCENTILE_95);
    rates[key] = stats.count / seconds;
  }
  return {
    snapshots: snapshots.length,
    rssBytes: Math.max(0, ...processes.map((value) => value.rssBytes)),
    heapUsedBytes: Math.max(0, ...processes.map((value) => value.heapUsedBytes)),
    eventLoopDelayMaxMs: Math.max(0, ...processes.map((value) => value.eventLoopDelayMaxMs)),
    rssGrowthBytes: Math.max(0, ...processes.map((value) => value.rssBytes - value.startRssBytes)),
    heapCollections: processes.reduce((sum, value) => sum + value.heapCollections, 0),
    heapFreedBytes: processes.reduce((sum, value) => sum + value.heapFreedBytes, 0),
    forcedGcMs: Math.max(0, ...snapshots.map((value) => value.forcedGcMs)),
    operations,
    p95Ms: percentiles,
    firstByteP95Ms: firstBytes,
    requestsPerSecond: rates,
  };
}

export async function metricsProblems(report: MetricsReport): Promise<string[]> {
  const problems: string[] = [];
  if (report.snapshots === 0) {
    problems.push(message(MessageId.MetricsMissing, { what: MetricsSubject.Report }));
  }
  if (report.snapshots > 0 && Object.keys(report.operations).length === 0) {
    problems.push(message(MessageId.MetricsMissing, { what: MetricsSubject.Operation }));
  }
  if (report.snapshots > 0 && report.rssBytes === 0) {
    problems.push(message(MessageId.MetricsMissing, { what: MetricsSubject.Memory }));
  }
  for (const [key, value] of Object.entries(report.firstByteP95Ms)) {
    const long = LONG_RUNNING_OPERATIONS.includes(
      key.split(OPERATION_KEY_SEPARATOR)[0] ?? Text.Empty,
    );
    const budget = long ? METRIC_BUDGET_LONG_RUNNING_P95_MS : METRIC_BUDGET_OPERATION_P95_MS;
    if (value > budget) {
      problems.push(
        message(MessageId.MetricsOverBudget, {
          what: MetricsSubject.OperationP95,
          detail: key,
          value,
          budget,
        }),
      );
    }
  }
  if (report.eventLoopDelayMaxMs > METRIC_BUDGET_EVENT_LOOP_DELAY_MS) {
    problems.push(
      message(MessageId.MetricsOverBudget, {
        what: MetricsSubject.EventLoop,
        detail: Text.Empty,
        value: report.eventLoopDelayMaxMs,
        budget: METRIC_BUDGET_EVENT_LOOP_DELAY_MS,
      }),
    );
  }
  if (report.heapUsedBytes > METRIC_BUDGET_HEAP_USED_BYTES) {
    problems.push(
      message(MessageId.MetricsOverBudget, {
        what: MetricsSubject.Heap,
        detail: Text.Empty,
        value: report.heapUsedBytes,
        budget: METRIC_BUDGET_HEAP_USED_BYTES,
      }),
    );
  }
  return problems;
}

export async function slowTestsOf(xml: string): Promise<SlowTest[]> {
  return [...xml.matchAll(JUNIT_TESTCASE_PATTERN)].map(
    ([, name = Text.Empty, seconds = Text.Empty, file = Text.Empty]) => ({
      name,
      file,
      seconds: Number(seconds),
    }),
  );
}

export async function slowestOf(tests: readonly SlowTest[]): Promise<SlowTest[]> {
  return [...tests]
    .sort((left, right) => right.seconds - left.seconds)
    .slice(0, SLOWEST_TESTS_COUNT);
}

export async function diagnosisOf(report: MetricsReport): Promise<string[]> {
  const keys = Object.keys(report.operations);
  if (keys.length === 0) {
    return [message(MessageId.DiagnosisNone)];
  }
  const slowest = keys
    .sort((left, right) => (report.firstByteP95Ms[right] ?? 0) - (report.firstByteP95Ms[left] ?? 0))
    .slice(0, DIAGNOSIS_SLOWEST_COUNT);
  return [
    message(MessageId.DiagnosisTitle, { operations: keys.length, files: report.snapshots }),
    ...slowest.map((key, index) =>
      message(MessageId.DiagnosisSlowest, {
        rank: index + 1,
        operation: key,
        firstByte: report.firstByteP95Ms[key] ?? 0,
        total: report.p95Ms[key] ?? 0,
        rate: (report.requestsPerSecond[key] ?? 0).toFixed(DIAGNOSIS_DIGITS),
      }),
    ),
    message(MessageId.DiagnosisMemory, {
      growth: report.rssGrowthBytes,
      heap: report.heapUsedBytes,
    }),
    message(MessageId.DiagnosisGc, {
      collections: report.heapCollections,
      freed: report.heapFreedBytes,
      forced: report.forcedGcMs.toFixed(DIAGNOSIS_DIGITS),
    }),
  ];
}

export async function enforceMetrics(dir: string): Promise<number> {
  delete Bun.env[METRICS_REPORT_DIR_ENV];
  const report = await mergeSnapshots(await snapshotsIn(dir));
  await Bun.write(join(dir, METRICS_REPORT_FILE), JSON.stringify(report, null, 2));
  const diagnosis = await diagnosisOf(report);
  await Bun.write(join(dir, DIAGNOSIS_FILE), diagnosis.join(Text.Newline) + Text.Newline);
  for (const line of diagnosis) {
    console.log(line);
  }
  const problems = await metricsProblems(report);
  for (const problem of problems) {
    console.error(problem);
  }
  if (problems.length === 0) {
    console.log(
      message(MessageId.MetricsOk, {
        operations: Object.keys(report.operations).length,
        files: report.snapshots,
      }),
    );
  }
  return problems.length === 0 ? 0 : 1;
}
