import { BENCH_API_LEG, BENCH_BARE_LEG } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import type { BenchReport, BenchRow } from "@platform/types";
import {
  benchProblems,
  benchTable,
  medianRow,
  rowOf,
} from "../../packages/scenarios/src/bench-report.ts";

const TOTALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const row = (overrides: Partial<BenchRow> = {}): BenchRow => ({
  operation: "read",
  leg: BENCH_API_LEG,
  repeats: 1,
  p95MinMs: 5,
  p95MaxMs: 5,
  requests: 10,
  parallel: 1,
  failures: 0,
  statuses: {},
  requestsPerSecond: 100,
  p50Ms: 2,
  p95Ms: 5,
  p99Ms: 6,
  ttfbP50Ms: 1,
  ttfbP95Ms: 4,
  ...overrides,
});
const ONE_DENIED = { "403": 1 };
const TWO_DENIED = { "403": 2 };
const FIRST_FAILED = row({ failures: 1, statuses: ONE_DENIED });
const SECOND_FAILED = row({ failures: 2, statuses: TWO_DENIED });
const REPORT: BenchReport = { rows: [row()], usage: [], stages: {}, server: {} };

unit(rowOf, {
  positive: [
    positive(
      "takes the percentiles of the sorted times",
      ["read", "leg", 1, TOTALS, TOTALS, [200, 200], 1000],
      seen((value: BenchRow) => [value.p50Ms, value.p95Ms, value.p99Ms], [6, 10, 10]),
    ),
    positive(
      "gives the requests per second from the wall time",
      ["read", "leg", 4, TOTALS, TOTALS, [200, 403, 403], 500],
      seen(
        (value: BenchRow) => [value.requestsPerSecond, value.failures, value.statuses],
        [20, 2, { "403": 2 }],
      ),
    ),
  ],
  negative: [
    negative("needs the list of times", ["read", "leg", 1, undefined, TOTALS, [], 1], {
      name: "TypeError",
    }),
    negative("needs the list of first byte times", ["read", "leg", 1, TOTALS, undefined, [], 1], {
      name: "TypeError",
    }),
  ],
});

unit(medianRow, {
  positive: [
    positive(
      "takes the middle value and the range of the 95th percentile",
      [[row({ p95Ms: 3 }), row({ p95Ms: 9 }), row({ p95Ms: 5 })]],
      seen(
        (value: BenchRow) => [value.p95Ms, value.p95MinMs, value.p95MaxMs, value.repeats],
        [5, 3, 9, 3],
      ),
    ),
    positive(
      "adds the failures and the requests of the repeats",
      [[FIRST_FAILED, SECOND_FAILED]],
      seen(
        (value: BenchRow) => [value.failures, value.requests, value.statuses],
        [3, 20, { "403": 3 }],
      ),
    ),
  ],
  negative: [
    negative("needs at least one row", [[]], { name: "TypeError" }),
    negative("needs a list", [undefined], { name: "TypeError" }),
  ],
});

unit(benchProblems, {
  positive: [
    positive("rows inside the budget have no problem", [[row()]], []),
    positive(
      "the bare Bun baseline is not judged",
      [[row({ leg: BENCH_BARE_LEG, ttfbP95Ms: 9999, failures: 5 })]],
      [],
    ),
    positive(
      "a failed request is named",
      [[row({ failures: 2 })]],
      seen((problems: string[]) => problems.length, 1),
    ),
  ],
  negative: [
    positive(
      "a first byte over the budget is named",
      [[row({ ttfbP95Ms: 400 })]],
      seen((problems: string[]) => problems.length, 1),
    ),
    negative("needs a list of rows", [undefined], { name: "TypeError" }),
  ],
});

unit(benchTable, {
  positive: [
    positive(
      "writes a head, a rule and a line per row",
      [REPORT],
      seen((text: string) => text.split("\n").length, 4),
    ),
    positive(
      "writes the range of the 95th percentile",
      [REPORT],
      seen((text: string) => text.includes("5 to 5"), true),
    ),
  ],
  negative: [
    negative("needs a report", [undefined], { name: "TypeError" }),
    negative("needs the rows", [{ ...REPORT, rows: undefined }], { name: "TypeError" }),
  ],
});
