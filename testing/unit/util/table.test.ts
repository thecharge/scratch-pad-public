import { negative, positive, unit } from "@platform/test-factories";
import { benchRows, markdownTable } from "../../../packages/util/src/table.ts";

unit(markdownTable, {
  positive: [
    positive(
      "writes the head, a rule and a line per row",
      [["a", "b"], [[1, "x"]]],
      ["| a | b |", "| --- | --- |", "| 1 | x |", ""],
    ),
    positive(
      "a table without rows has the head and the rule",
      [["a"], []],
      ["| a |", "| --- |", ""],
    ),
  ],
  negative: [
    negative("needs the head", [undefined, []], { name: "TypeError" }),
    negative("needs the rows", [["a"], undefined], { name: "TypeError" }),
  ],
});

const ROW = {
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
const REPORT = { rows: [ROW], usage: [], stages: {}, server: {} };

unit(benchRows, {
  positive: [
    positive(
      "gives a line per row with the range of the 95th percentile",
      [REPORT],
      [["read", "api", 2, 50, 1, 2, 3, 2, "1 to 3", 0]],
    ),
    positive("a report without rows gives no line", [{ ...REPORT, rows: [] }], []),
  ],
  negative: [
    negative("needs a report", [undefined], { name: "TypeError" }),
    negative("needs the rows", [{ ...REPORT, rows: undefined }], { name: "TypeError" }),
  ],
});
