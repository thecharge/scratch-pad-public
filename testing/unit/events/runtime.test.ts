import { describe, expect, test } from "bun:test";
import { HttpStage } from "@platform/constants";
import { RuntimeMetrics } from "../../../packages/events/src/runtime.ts";

describe("RuntimeMetrics", () => {
  test("keeps the count, the total and the largest time of a stage", async () => {
    const metrics = new RuntimeMetrics();
    await metrics.record(HttpStage.Route, 2);
    await metrics.record(HttpStage.Route, 6);
    expect((await metrics.stages())[HttpStage.Route]).toEqual({ count: 2, totalMs: 8, maxMs: 6 });
  });

  test("reports no stage that was not recorded", async () => {
    expect(await new RuntimeMetrics().stages()).toEqual({});
  });

  test("counts the requests that are in flight", async () => {
    const metrics = new RuntimeMetrics();
    await metrics.enter();
    await metrics.enter();
    await metrics.leave();
    expect((await metrics.process()).requestsInFlight).toBe(1);
  });

  test("reads the memory, the processor time and the uptime of the process", async () => {
    const reading = await new RuntimeMetrics().process();
    expect([reading.rssBytes > 0, reading.heapUsedBytes > 0, reading.uptimeSeconds > 0]).toEqual([
      true,
      true,
      true,
    ]);
  });

  test("reports an event loop delay after the loop was blocked", async () => {
    const metrics = new RuntimeMetrics();
    await Bun.sleep(30);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 80);
    await Bun.sleep(30);
    expect((await metrics.process()).eventLoopDelayMaxMs).toBeGreaterThan(20);
  });

  test("keeps the count, the errors, the time and the bytes of an operation by form and version", async () => {
    const metrics = new RuntimeMetrics();
    const sample = { capability: "books.get", form: "application/json", version: "2.0", bytes: 10 };
    await metrics.operation({ ...sample, status: 200, elapsedMs: 4, firstByteMs: 1 });
    await metrics.operation({ ...sample, status: 404, elapsedMs: 8, firstByteMs: 3 });
    expect((await metrics.operations())["books.get|application/json|2.0"]).toEqual({
      count: 2,
      errors: 1,
      totalMs: 12,
      maxMs: 8,
      bytes: 20,
      buckets: [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      firstByteTotalMs: 4,
      firstByteMaxMs: 3,
      firstByteBuckets: [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  });

  test("keeps the same operation apart by version", async () => {
    const metrics = new RuntimeMetrics();
    const sample = {
      capability: "a",
      form: "f",
      status: 200,
      elapsedMs: 1,
      firstByteMs: 1,
      bytes: 0,
    };
    await metrics.operation({ ...sample, version: "1.1" });
    await metrics.operation({ ...sample, version: "3" });
    expect(Object.keys(await metrics.operations()).sort()).toEqual(["a|f|1.1", "a|f|3"]);
  });

  test("counts the streams that are open", async () => {
    const metrics = new RuntimeMetrics();
    await metrics.opened();
    await metrics.opened();
    await metrics.closed();
    expect((await metrics.process()).openStreams).toBe(1);
  });

  test("reads the number of running operations from its source", async () => {
    const metrics = new RuntimeMetrics(async () => 4);
    expect((await metrics.process()).runningOperations).toBe(4);
  });

  test("counts a collection when the heap shrinks", async () => {
    const metrics = new RuntimeMetrics();
    let garbage: unknown[] | undefined = Array.from({ length: 400_000 }, () => ({ value: 1 }));
    await Bun.sleep(120);
    garbage = undefined;
    Bun.gc(true);
    await Bun.sleep(120);
    const reading = await metrics.process();
    expect([garbage, reading.heapCollections > 0, reading.heapFreedBytes > 0]).toEqual([
      undefined,
      true,
      true,
    ]);
  });

  test("keeps the memory the process had when it started", async () => {
    expect((await new RuntimeMetrics().process()).startRssBytes).toBeGreaterThan(0);
  });
});
