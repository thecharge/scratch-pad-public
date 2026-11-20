import {
  TABLE_CELL_JOIN,
  TABLE_RANGE,
  TABLE_ROW_CLOSE,
  TABLE_ROW_OPEN,
  TABLE_RULE,
  Text,
} from "@platform/constants";
import type { BenchReport } from "@platform/types";

export async function markdownTable(
  head: readonly string[],
  rows: readonly (readonly (string | number)[])[],
): Promise<string[]> {
  const lines = [head, head.map(() => TABLE_RULE), ...rows].map(
    (cells) => TABLE_ROW_OPEN + cells.join(TABLE_CELL_JOIN) + TABLE_ROW_CLOSE,
  );
  return [...lines, Text.Empty];
}

export async function benchRows(report: BenchReport): Promise<(string | number)[][]> {
  return report.rows.map((row) => [
    row.operation,
    row.leg,
    row.parallel,
    row.requestsPerSecond,
    row.p50Ms,
    row.p95Ms,
    row.p99Ms,
    row.ttfbP95Ms,
    [row.p95MinMs, row.p95MaxMs].join(TABLE_RANGE),
    row.failures,
  ]);
}
