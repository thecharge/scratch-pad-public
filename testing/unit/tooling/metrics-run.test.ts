import { afterAll } from "bun:test";
import { join } from "node:path";
import { METRICS_REPORT_DIR_ENV, METRICS_REPORT_FILE } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { SlowTest } from "@platform/types";
import {
  diagnosisOf,
  discardMetrics,
  enforceMetrics,
  mergeSnapshots,
  metricsDir,
  metricsProblems,
  prepareMetrics,
  slowestOf,
  slowTestsOf,
} from "../../../tooling/scripts/metrics-run.ts";

afterAll(removeAll);

const PROCESS = {
  rssBytes: 100,
  heapTotalBytes: 1,
  heapUsedBytes: 50,
  externalBytes: 1,
  cpuUserMicros: 1,
  cpuSystemMicros: 1,
  eventLoopDelayMaxMs: 5,
  uptimeSeconds: 1,
  requestsInFlight: 0,
  startRssBytes: 50,
  openStreams: 0,
  runningOperations: 0,
  heapCollections: 3,
  heapFreedBytes: 1000,
};
const FAST = [10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const SLOW = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10];
const stats = (buckets: number[]) => ({
  count: 10,
  errors: 0,
  totalMs: 10,
  maxMs: 1,
  bytes: 0,
  buckets,
  firstByteTotalMs: 10,
  firstByteMaxMs: 1,
  firstByteBuckets: buckets,
});
const snapshot = (buckets: number[], overrides = {}) => ({
  forcedGcMs: 2,
  forcedGcFreedBytes: 10,
  process: { ...PROCESS, ...overrides },
  stages: {},
  operations: { "a.get|application/json|1.1": stats(buckets) },
});

async function folder(snapshots: object[]): Promise<string> {
  const dir = await makeDir();
  await writeFiles(dir, { "one.json": JSON.stringify(snapshots) });
  return dir;
}

const LONG_POLL = {
  ...snapshot(SLOW),
  operations: { "operations.wait|application/json|1.1": stats(SLOW) },
};
const TWO_OPERATIONS = {
  ...snapshot(FAST),
  operations: {
    "a.get|application/json|1.1": stats(FAST),
    "b.get|application/json|1.1": stats(SLOW),
  },
};
const NO_OPERATIONS = { ...snapshot(FAST), operations: {} };
const fastDir = await folder([snapshot(FAST)]);
const slowDir = await folder([snapshot(SLOW)]);
const emptyDir = await makeDir();
const bareDir = await folder([NO_OPERATIONS]);
const reportOf = async (dir: string) => Bun.file(join(dir, METRICS_REPORT_FILE)).exists();

unit(mergeSnapshots, {
  positive: [
    positive(
      "adds the counts and buckets of the same operation",
      [[snapshot(FAST), snapshot(FAST)]],
      seen(
        (report: Awaited<ReturnType<typeof mergeSnapshots>>) =>
          report.operations["a.get|application/json|1.1"]?.count,
        20,
      ),
    ),
    positive(
      "adds the collections and keeps the largest growth of memory",
      [[snapshot(FAST, { rssBytes: 160 }), snapshot(FAST)]],
      seen(
        (report: Awaited<ReturnType<typeof mergeSnapshots>>) => [
          report.heapCollections,
          report.rssGrowthBytes,
          report.forcedGcMs,
        ],
        [6, 110, 2],
      ),
    ),
    positive(
      "keeps the highest memory of the snapshots",
      [[snapshot(FAST, { rssBytes: 5 }), snapshot(FAST, { rssBytes: 9 })]],
      seen((report: Awaited<ReturnType<typeof mergeSnapshots>>) => report.rssBytes, 9),
    ),
  ],
  negative: [
    rejected(
      "no snapshots give an empty report",
      [[]],
      seen((report: Awaited<ReturnType<typeof mergeSnapshots>>) => report.snapshots, 0),
    ),
    negative("needs a list of snapshots", [undefined], { name: "TypeError" }),
  ],
});

const JUNIT = [
  '<testcase name="fast" classname="a" time="0.002" file="x.test.ts" line="1" />',
  '<testcase name="slow" classname="a" time="4.5" file="y.test.ts" line="2" />',
].join("\n");

unit(slowTestsOf, {
  positive: [
    positive(
      "reads the name, the file and the seconds of each test",
      [JUNIT],
      seen(
        (tests: SlowTest[]) => tests.map((test) => [test.name, test.file, test.seconds]),
        [
          ["fast", "x.test.ts", 0.002],
          ["slow", "y.test.ts", 4.5],
        ],
      ),
    ),
    positive("an empty report has no test", [""], []),
  ],
  negative: [
    rejected("text without a test has no test", ["<testsuites />"], []),
    negative("needs the text", [undefined], { name: "TypeError" }),
  ],
});

unit(slowestOf, {
  positive: [
    positive(
      "puts the slowest first",
      [
        [
          { name: "a", file: "f", seconds: 1 },
          { name: "b", file: "f", seconds: 3 },
        ],
      ],
      seen((tests: SlowTest[]) => tests.map((test) => test.name), ["b", "a"]),
    ),
    positive(
      "keeps only the ten slowest",
      [
        Array.from({ length: 12 }, (_value, index) => ({
          name: String(index),
          file: "f",
          seconds: index,
        })),
      ],
      seen((tests: SlowTest[]) => tests.length, 10),
    ),
  ],
  negative: [
    rejected("no test gives an empty list", [[]], []),
    negative("needs a list", [undefined], { name: "TypeError" }),
  ],
});

unit(diagnosisOf, {
  positive: [
    positive(
      "names the operations, the memory growth and the collections",
      [await mergeSnapshots([snapshot(FAST)])],
      seen((lines: string[]) => lines.length, 4),
    ),
    positive(
      "orders several operations by their first byte time",
      [await mergeSnapshots([TWO_OPERATIONS])],
      seen((lines: string[]) => lines[1]?.includes("b.get"), true),
    ),
    positive(
      "puts the slowest operation first",
      [await mergeSnapshots([snapshot(SLOW)])],
      seen((lines: string[]) => lines[1]?.includes("a.get|application/json|1.1"), true),
    ),
  ],
  negative: [
    rejected(
      "a run with no operation says so",
      [await mergeSnapshots([])],
      seen((lines: string[]) => lines.length, 1),
    ),
    negative("needs a report", [undefined], { name: "TypeError" }),
  ],
});

unit(metricsProblems, {
  positive: [
    positive(
      "a report inside every budget has no problem",
      [await mergeSnapshots([snapshot(FAST)])],
      [],
    ),
    positive(
      "a long running operation may take longer than an ordinary one",
      [await mergeSnapshots([LONG_POLL])],
      [],
    ),
    positive(
      "a delayed event loop is named",
      [await mergeSnapshots([snapshot(FAST, { eventLoopDelayMaxMs: 5000 })])],
      seen((problems: string[]) => problems.length, 1),
    ),
    positive(
      "a heap over its budget is named",
      [await mergeSnapshots([snapshot(FAST, { heapUsedBytes: 2_000_000_000 })])],
      seen((problems: string[]) => problems.length, 1),
    ),
    positive(
      "a slow operation is named with its 95th percentile",
      [await mergeSnapshots([snapshot(SLOW)])],
      seen((problems: string[]) => problems.length, 1),
    ),
  ],
  negative: [
    rejected(
      "a run that measured nothing is a problem",
      [await mergeSnapshots([])],
      seen((problems: string[]) => problems.length, 1),
    ),
    rejected(
      "a run whose API served no operation is a problem",
      [await mergeSnapshots([NO_OPERATIONS])],
      seen((problems: string[]) => problems.length, 1),
    ),
    rejected(
      "memory that was not read is a problem",
      [await mergeSnapshots([snapshot(FAST, { rssBytes: 0 })])],
      seen((problems: string[]) => problems.length, 1),
    ),
  ],
});

unit(enforceMetrics, {
  positive: [
    positive("reports inside the budget pass", [fastDir], 0),
    positive(
      "the merged report is written next to the snapshots",
      [fastDir],
      seen(() => reportOf(fastDir), true),
    ),
  ],
  negative: [
    rejected("a slow operation fails the run", [slowDir], 1),
    rejected("a folder without reports fails the run", [emptyDir], 1),
    rejected("a folder that does not exist fails the run", [join(emptyDir, "absent")], 1),
    rejected("a run without a measured operation fails", [bareDir], 1),
  ],
});

const workDir = await makeDir();
const target = join(workDir, "metrics");

unit(prepareMetrics, {
  positive: [
    positive("the folder is created and named for the child processes", [target], undefined),
    positive(
      "the environment names the folder",
      [target],
      seen(() => Bun.env[METRICS_REPORT_DIR_ENV], target),
    ),
  ],
  negative: [
    negative("needs a folder", [undefined], { name: "TypeError" }),
    negative("a folder under a file cannot be created", [join(import.meta.path, "x")], {
      code: "ENOTDIR",
    }),
  ],
});

unit(discardMetrics, {
  positive: [
    positive(
      "removes the folder",
      [target],
      seen(() => Bun.file(target).exists(), false),
    ),
    positive(
      "forgets the environment",
      [target],
      seen(() => Bun.env[METRICS_REPORT_DIR_ENV], undefined),
    ),
  ],
  negative: [
    rejected("a folder that is not there is not an error", [join(workDir, "none")], undefined),
    negative("needs a folder", [undefined], { name: "TypeError" }),
  ],
});

unit(metricsDir, {
  positive: [
    positive("puts the label under the metrics root", ["/work", "e2e"], "/work/.stack/metrics/e2e"),
    positive("keeps another label apart", ["/work", "coverage"], "/work/.stack/metrics/coverage"),
  ],
  negative: [
    negative("needs a root", [undefined, "e2e"], { name: "TypeError" }),
    negative("needs a label", ["/work", undefined], { name: "TypeError" }),
  ],
});
