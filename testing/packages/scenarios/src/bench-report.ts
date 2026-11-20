import {
  BENCH_BARE_LEG,
  BENCH_BASELINE_LEG,
  BENCH_ROUND_DIGITS,
  BENCH_TABLE_COLUMNS,
  METRIC_BUDGET_OPERATION_P95_MS,
  MessageId,
  MS_PER_SECOND,
  PERCENTILE_95,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { BenchReport, BenchRow } from "@platform/types";
import { benchRows, markdownTable } from "@platform/util";

const OK_STATUS = 200;
const MEDIAN = 0.5;
const P99 = 0.99;

async function at(sorted: readonly number[], fraction: number): Promise<number> {
  return sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))] ?? 0;
}

async function round(value: number): Promise<number> {
  return Number(value.toFixed(BENCH_ROUND_DIGITS));
}

export async function rowOf(
  operation: string,
  leg: string,
  parallel: number,
  totals: readonly number[],
  firsts: readonly number[],
  statuses: readonly number[],
  wallMs: number,
): Promise<BenchRow> {
  const sortedTotal = [...totals].sort((left, right) => left - right);
  const sortedFirst = [...firsts].sort((left, right) => left - right);
  const failed = statuses.filter((status) => status !== OK_STATUS);
  const counts: Record<string, number> = {};
  for (const status of failed) {
    counts[String(status)] = (counts[String(status)] ?? 0) + 1;
  }
  const p95 = await round(await at(sortedTotal, PERCENTILE_95));
  return {
    operation,
    leg,
    repeats: 1,
    p95MinMs: p95,
    p95MaxMs: p95,
    requests: totals.length,
    parallel,
    failures: failed.length,
    statuses: counts,
    requestsPerSecond: Math.round((totals.length / wallMs) * MS_PER_SECOND),
    p50Ms: await round(await at(sortedTotal, MEDIAN)),
    p95Ms: p95,
    p99Ms: await round(await at(sortedTotal, P99)),
    ttfbP50Ms: await round(await at(sortedFirst, MEDIAN)),
    ttfbP95Ms: await round(await at(sortedFirst, PERCENTILE_95)),
  };
}

export async function medianRow(rows: readonly BenchRow[]): Promise<BenchRow> {
  const first = rows[0];
  if (first === undefined) {
    throw new TypeError(message(MessageId.BenchNoRows));
  }
  const middle = async (pick: (row: BenchRow) => number) =>
    round(
      await at(
        rows.map(pick).sort((left, right) => left - right),
        MEDIAN,
      ),
    );
  const p95s = rows.map((row) => row.p95Ms);
  return {
    ...first,
    repeats: rows.length,
    requests: rows.reduce((sum, row) => sum + row.requests, 0),
    failures: rows.reduce((sum, row) => sum + row.failures, 0),
    statuses: rows.reduce<Record<string, number>>((all, row) => {
      for (const [status, count] of Object.entries(row.statuses)) {
        all[status] = (all[status] ?? 0) + count;
      }
      return all;
    }, {}),
    requestsPerSecond: await middle((row) => row.requestsPerSecond),
    p50Ms: await middle((row) => row.p50Ms),
    p95Ms: await middle((row) => row.p95Ms),
    p99Ms: await middle((row) => row.p99Ms),
    ttfbP50Ms: await middle((row) => row.ttfbP50Ms),
    ttfbP95Ms: await middle((row) => row.ttfbP95Ms),
    p95MinMs: Math.min(...p95s),
    p95MaxMs: Math.max(...p95s),
  };
}

export async function benchProblems(rows: readonly BenchRow[]): Promise<string[]> {
  const measured = rows.filter(
    (row) => row.leg !== BENCH_BARE_LEG && row.leg !== BENCH_BASELINE_LEG,
  );
  const problems: string[] = [];
  for (const row of measured) {
    const named = { operation: row.operation, leg: row.leg, parallel: row.parallel };
    if (row.failures > 0) {
      problems.push(
        message(MessageId.BenchFailed, {
          ...named,
          failures: row.failures,
          statuses: JSON.stringify(row.statuses),
        }),
      );
    }
    if (row.ttfbP95Ms > METRIC_BUDGET_OPERATION_P95_MS) {
      problems.push(
        message(MessageId.BenchOverBudget, {
          ...named,
          value: row.ttfbP95Ms,
          budget: METRIC_BUDGET_OPERATION_P95_MS,
        }),
      );
    }
  }
  return problems;
}

export async function benchTable(report: BenchReport): Promise<string> {
  return (await markdownTable(BENCH_TABLE_COLUMNS, await benchRows(report))).join(Text.Newline);
}
