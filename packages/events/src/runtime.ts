import { monitorEventLoopDelay } from "node:perf_hooks";
import { cpuUsage, memoryUsage, uptime } from "node:process";
import {
  DEFAULT_STORE_MAX_ENTRIES,
  HEAP_SAMPLE_INTERVAL_MS,
  HttpStage,
  NANOSECONDS_PER_MILLISECOND,
  OPERATION_BUCKETS_MS,
  OPERATION_ERROR_STATUS_FLOOR,
  OPERATION_KEY_SEPARATOR,
  RUNTIME_REGISTRY,
} from "@platform/constants";
import { BoundedStore } from "@platform/store";
import type {
  OperationSample,
  OperationStats,
  ProcessMetrics,
  RuntimeSource,
  StageRecorder,
  StageStats,
  StreamTracker,
} from "@platform/types";
import { all } from "@platform/util";

async function bucketOf(elapsedMs: number): Promise<number> {
  const found = OPERATION_BUCKETS_MS.findIndex((bound) => elapsedMs <= bound);
  return found < 0 ? OPERATION_BUCKETS_MS.length : found;
}

export class RuntimeMetrics implements RuntimeSource, StageRecorder, StreamTracker {
  private readonly delay = monitorEventLoopDelay();
  private readonly perStage = new BoundedStore<StageStats>({
    maxEntries: Object.keys(HttpStage).length,
  });
  private readonly perOperation = new BoundedStore<OperationStats>({
    maxEntries: DEFAULT_STORE_MAX_ENTRIES,
  });
  private inFlight = 0;
  private streams = 0;
  private collections = 0;
  private freedBytes = 0;
  private lastHeap = memoryUsage().heapUsed;
  private readonly startRss = memoryUsage().rss;

  constructor(private readonly running: () => Promise<number> = async () => 0) {
    this.delay.enable();
    setInterval(() => {
      const heap = memoryUsage().heapUsed;
      if (heap < this.lastHeap) {
        this.collections += 1;
        this.freedBytes += this.lastHeap - heap;
      }
      this.lastHeap = heap;
    }, HEAP_SAMPLE_INTERVAL_MS).unref();
    const registry = (globalThis as Record<string, unknown>)[RUNTIME_REGISTRY] as
      | RuntimeMetrics[]
      | undefined;
    registry?.push(this);
  }

  async record(stage: HttpStage, elapsedMs: number): Promise<void> {
    await this.perStage.update(stage, (current) => ({
      count: (current?.count ?? 0) + 1,
      totalMs: (current?.totalMs ?? 0) + elapsedMs,
      maxMs: Math.max(current?.maxMs ?? 0, elapsedMs),
    }));
  }

  async operation(sample: OperationSample): Promise<void> {
    const bucket = await bucketOf(sample.elapsedMs);
    const firstBucket = await bucketOf(sample.firstByteMs);
    const emptyBuckets = Array.from({ length: OPERATION_BUCKETS_MS.length + 1 }, () => 0);
    const key = [sample.capability, sample.form, sample.version].join(OPERATION_KEY_SEPARATOR);
    await this.perOperation.update(key, (current) => ({
      count: (current?.count ?? 0) + 1,
      errors: (current?.errors ?? 0) + (sample.status >= OPERATION_ERROR_STATUS_FLOOR ? 1 : 0),
      totalMs: (current?.totalMs ?? 0) + sample.elapsedMs,
      maxMs: Math.max(current?.maxMs ?? 0, sample.elapsedMs),
      bytes: (current?.bytes ?? 0) + sample.bytes,
      buckets: (current?.buckets ?? emptyBuckets).map(
        (count, index) => count + (index === bucket ? 1 : 0),
      ),
      firstByteTotalMs: (current?.firstByteTotalMs ?? 0) + sample.firstByteMs,
      firstByteMaxMs: Math.max(current?.firstByteMaxMs ?? 0, sample.firstByteMs),
      firstByteBuckets: (current?.firstByteBuckets ?? emptyBuckets).map(
        (count, index) => count + (index === firstBucket ? 1 : 0),
      ),
    }));
  }

  async operations(): Promise<Record<string, OperationStats>> {
    const keys = await this.perOperation.keys();
    const entries = await all(
      keys.map((key) => async () => [key, await this.perOperation.get(key)] as const),
    );
    return Object.fromEntries(
      entries.filter((entry): entry is readonly [string, OperationStats] => entry[1] !== undefined),
    );
  }

  async enter(): Promise<void> {
    this.inFlight += 1;
  }

  async leave(): Promise<void> {
    this.inFlight -= 1;
  }

  async opened(): Promise<void> {
    this.streams += 1;
  }

  async closed(): Promise<void> {
    this.streams -= 1;
  }

  async process(): Promise<ProcessMetrics> {
    const memory = memoryUsage();
    const cpu = cpuUsage();
    return {
      rssBytes: memory.rss,
      heapTotalBytes: memory.heapTotal,
      heapUsedBytes: memory.heapUsed,
      externalBytes: memory.external,
      cpuUserMicros: cpu.user,
      cpuSystemMicros: cpu.system,
      eventLoopDelayMaxMs: this.delay.max / NANOSECONDS_PER_MILLISECOND,
      uptimeSeconds: uptime(),
      requestsInFlight: this.inFlight,
      startRssBytes: this.startRss,
      openStreams: this.streams,
      runningOperations: await this.running(),
      heapCollections: this.collections,
      heapFreedBytes: this.freedBytes,
    };
  }

  async stages(): Promise<Record<string, StageStats>> {
    const keys = await this.perStage.keys();
    const entries = await all(
      keys.map((key) => async () => [key, await this.perStage.get(key)] as const),
    );
    return Object.fromEntries(
      entries.filter((entry): entry is readonly [string, StageStats] => entry[1] !== undefined),
    );
  }
}
