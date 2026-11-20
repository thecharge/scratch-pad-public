import { afterAll } from "bun:test";
import { join } from "node:path";
import { PERFORMANCE_PAGE } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { MetricsReport } from "@platform/types";
import {
  generatePerformanceDocs,
  performancePage,
} from "../../../tooling/scripts/generate-performance-docs.ts";

afterAll(removeAll);

const BUCKETS = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const STATS = {
  count: 7,
  errors: 1,
  totalMs: 7,
  maxMs: 2,
  bytes: 70,
  buckets: BUCKETS,
  firstByteTotalMs: 5,
  firstByteMaxMs: 1,
  firstByteBuckets: BUCKETS,
};
const REPORT: MetricsReport = {
  snapshots: 1,
  rssBytes: 100,
  heapUsedBytes: 50,
  eventLoopDelayMaxMs: 3,
  rssGrowthBytes: 10,
  heapCollections: 4,
  heapFreedBytes: 99,
  forcedGcMs: 2,
  operations: { "books.get|application/json|2.0": STATS },
  p95Ms: { "books.get|application/json|2.0": 1 },
  firstByteP95Ms: { "books.get|application/json|2.0": 1 },
  requestsPerSecond: { "books.get|application/json|2.0": 3.5 },
};
const SLOW = [{ name: "a slow test", file: "x.test.ts", seconds: 9 }];
const STEPS = [
  { step: "coverage", ok: true, seconds: 400 },
  { step: "lint", ok: true, seconds: 3 },
];
const USAGE = {
  name: "api",
  cpu_percent: "1%",
  mem_usage: "10MB / 1GB",
  net_io: "1B / 2B",
  pids: "3",
};
const BENCH_ROW = {
  operation: "read",
  leg: "api",
  repeats: 3,
  p95MinMs: 1,
  p95MaxMs: 3,
  requests: 10,
  parallel: 2,
  failures: 0,
  statuses: {},
  requestsPerSecond: 50,
  p50Ms: 1,
  p95Ms: 2,
  p99Ms: 3,
  ttfbP50Ms: 1,
  ttfbP95Ms: 2,
};
const BENCH = { rows: [BENCH_ROW], usage: [USAGE], stages: {}, server: {} };
const text = (page: unknown) => String(page);

async function folderWith(files: Record<string, string>): Promise<string[]> {
  const root = await makeDir();
  await writeFiles(root, files);
  return [join(root, "content"), root];
}

const withReport = await folderWith({
  ".stack/metrics/e2e/metrics-report.json": JSON.stringify(REPORT),
});
const withBenchmark = await folderWith({
  ".stack/metrics/e2e/metrics-report.json": JSON.stringify(REPORT),
  ".stack/benchmarks/7.4-benchmark.json": JSON.stringify(BENCH),
});
const withoutReport = await folderWith({ "other.txt": "x" });
const brokenReport = await folderWith({ ".stack/metrics/e2e/metrics-report.json": "{}" });
const written = async () => Bun.file(join(withReport[0] as string, PERFORMANCE_PAGE)).text();

unit(performancePage, {
  positive: [
    positive(
      "names each operation with its form, version and first byte time",
      [REPORT],
      seen(
        (page: unknown) =>
          text(page).includes("| books.get | application/json | 2.0 | 7 | 3.50 | 1 | 1 | 1 | 70 |"),
        true,
      ),
    ),
    positive(
      "adds the slowest tests and steps when there are some",
      [REPORT, undefined, SLOW, STEPS],
      seen(
        (page: unknown) => [
          text(page).includes("a slow test"),
          text(page).indexOf("coverage") < text(page).indexOf("lint"),
        ],
        [true, true],
      ),
    ),
    positive(
      "adds the benchmark and the usage of the containers when there are some",
      [REPORT, BENCH, SLOW, STEPS, [USAGE]],
      seen(
        (page: unknown) => [
          text(page).includes("| read | api | 2 | 50 |"),
          text(page).includes("| api | 1% | 10MB / 1GB |"),
        ],
        [true, true],
      ),
    ),
  ],
  negative: [
    negative("needs a report", [undefined], { name: "TypeError" }),
    negative("needs the operations", [{ ...REPORT, operations: undefined }], { name: "TypeError" }),
  ],
});

unit(generatePerformanceDocs, {
  positive: [
    positive("writes the page from the report of the end-to-end run", withReport, true),
    positive(
      "the page holds the operations of the run",
      withReport,
      seen(async () => (await written()).includes("books.get"), true),
    ),
    positive(
      "reads current benchmark evidence outside archived changes",
      withBenchmark,
      seen(
        async () =>
          (await Bun.file(join(withBenchmark[0] as string, PERFORMANCE_PAGE)).text()).includes(
            "| read | api | 2 | 50 |",
          ),
        true,
      ),
    ),
    positive(
      "preserves the complete benchmark recording while generating its report",
      withBenchmark,
      seen(
        async () =>
          Bun.file(join(withBenchmark[1] as string, ".stack/benchmarks/7.4-benchmark.json")).json(),
        BENCH,
      ),
    ),
  ],
  negative: [
    positive("publishes nothing when the run left no report", withoutReport, false),
    negative("refuses a report with the wrong shape", brokenReport, { name: "ZodError" }),
  ],
});
