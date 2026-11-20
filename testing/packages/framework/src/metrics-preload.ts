import { afterAll } from "bun:test";
import { join } from "node:path";
import { METRICS_REPORT_DIR_ENV, RUNTIME_REGISTRY } from "@platform/constants";
import type { RuntimeMetrics } from "@platform/events";

const directory = Bun.env[METRICS_REPORT_DIR_ENV];

async function snapshotOf(runtime: RuntimeMetrics) {
  const before = (await runtime.process()).heapUsedBytes;
  const started = performance.now();
  Bun.gc(true);
  const forcedGcMs = performance.now() - started;
  return {
    forcedGcMs,
    forcedGcFreedBytes: Math.max(0, before - (await runtime.process()).heapUsedBytes),
    process: await runtime.process(),
    stages: await runtime.stages(),
    operations: await runtime.operations(),
  };
}

async function writeReport(target: string): Promise<void> {
  const registry = (globalThis as Record<string, unknown>)[RUNTIME_REGISTRY] as RuntimeMetrics[];
  const snapshots = [];
  for (const runtime of registry) {
    snapshots.push(await snapshotOf(runtime));
  }
  await Bun.write(join(target, `${Bun.nanoseconds()}.json`), JSON.stringify(snapshots));
}

if (directory !== undefined) {
  (globalThis as Record<string, unknown>)[RUNTIME_REGISTRY] = [];
  afterAll(async () => writeReport(directory));
}
