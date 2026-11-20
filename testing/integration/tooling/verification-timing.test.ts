import { afterAll, expect, test } from "bun:test";
import { join } from "node:path";
import {
  DOCS_TIMINGS_FILE,
  DocumentationPhase,
  E2E_METRICS_PHASE,
  E2E_TIMINGS_FILE,
  TestTier,
  VERIFY_REPORT_DIR,
} from "@platform/constants";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { StepTiming } from "@platform/types";
import { buildDocs } from "../../../tooling/scripts/build-docs.ts";
import { runTier } from "../../../tooling/scripts/run-tier.ts";

afterAll(removeAll);

const command = async (files: readonly string[]) => [
  "bun",
  "test",
  ...files.map((file) => `./${file}`),
];
const metricsOk = async () => 0;
const metricsFail = async () => 1;
const passing =
  'import { test, expect } from "bun:test"; test("fixture", () => expect(2 + 2).toBe(4));';
const failing =
  'import { test, expect } from "bun:test"; test("fixture", () => expect(2 + 2).toBe(5));';

test.each([
  {
    name: "passing suites include documentation",
    source: passing,
    metric: metricsOk,
    code: 0,
    docs: 1,
    phases: 3,
    statuses: [true, true, true],
    steps: ["testing/e2e/fixture.test.ts", E2E_METRICS_PHASE, DocumentationPhase.Complete],
  },
  {
    name: "a failed suite blocks documentation",
    source: failing,
    metric: metricsOk,
    code: 1,
    docs: 0,
    phases: 1,
    statuses: [false],
    steps: ["testing/e2e/fixture.test.ts"],
  },
  {
    name: "a failed metric budget blocks documentation",
    source: passing,
    metric: metricsFail,
    code: 1,
    docs: 0,
    phases: 2,
    statuses: [true, false],
    steps: ["testing/e2e/fixture.test.ts", E2E_METRICS_PHASE],
  },
])("suite timing: $name", async ({ source, metric, code, docs, phases, statuses, steps }) => {
  const root = await makeDir();
  const file = join(root, VERIFY_REPORT_DIR, E2E_TIMINGS_FILE);
  await writeFiles(root, {
    "testing/e2e/fixture.test.ts": source,
    [join(VERIFY_REPORT_DIR, E2E_TIMINGS_FILE)]: '[{"step":"stale"}]',
  });
  const calls: string[] = [];
  const produce = async () => {
    calls.push("docs");
    return 0;
  };
  expect(await runTier([TestTier.E2e], root, command, produce, metric)).toBe(code);
  const report: StepTiming[] = await Bun.file(file).json();
  expect(report).toHaveLength(phases);
  expect(report.map((phase) => phase.step)).toEqual([...steps]);
  expect(report.map((phase) => phase.ok)).toEqual([...statuses]);
  expect(calls).toHaveLength(docs);
  expect(report.every((phase) => phase.seconds >= 0)).toBe(true);
});

test.each(["record scenarios", "second record failure"])(
  "documentation timing preserves %s",
  async (detail) => {
    const root = await makeDir();
    const record = async (): Promise<never> => {
      throw new RangeError(detail);
    };
    await expect(buildDocs(root, record)).rejects.toThrow(detail);
    const report: StepTiming[] = await Bun.file(
      join(root, VERIFY_REPORT_DIR, DOCS_TIMINGS_FILE),
    ).json();
    expect(report).toHaveLength(1);
    expect(report[0]?.step).toBe(DocumentationPhase.Record);
    expect(report[0]?.ok).toBe(false);
  },
);
