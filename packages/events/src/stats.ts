import { DEFAULT_STORE_MAX_ENTRIES, EventKind, StatsPattern } from "@platform/constants";
import { BoundedStore } from "@platform/store";
import type {
  ApiEvent,
  CapabilityStats,
  EventQuery,
  ObservabilityReader,
  RuntimeSource,
  StatsSnapshot,
} from "@platform/types";
import { all } from "@platform/util";
import type { EventBus } from "./bus.ts";
import { RuntimeMetrics } from "./runtime.ts";

const ERROR_STATUS_FLOOR = 400;

function advance(current: CapabilityStats | undefined, event: ApiEvent): CapabilityStats {
  const base = current ?? {
    count: 0,
    errors: 0,
    cacheHits: 0,
    totalLatencyMs: 0,
    firstSeen: event.time,
    lastSeen: event.time,
  };
  if (event.kind !== EventKind.Request) {
    return base;
  }
  return {
    ...base,
    lastSeen: event.time,
    count: base.count + 1,
    errors: base.errors + (event.status >= ERROR_STATUS_FLOOR ? 1 : 0),
    cacheHits: base.cacheHits + (event.cacheHit ? 1 : 0),
    totalLatencyMs: base.totalLatencyMs + event.latencyMs,
  };
}

export class StatsCollector implements ObservabilityReader {
  private readonly perCapability = new BoundedStore<CapabilityStats>({
    maxEntries: DEFAULT_STORE_MAX_ENTRIES,
  });

  constructor(
    private readonly bus: EventBus,
    private readonly runtime: RuntimeSource = new RuntimeMetrics(),
  ) {
    bus.subscribe((event) => {
      if (event.kind === EventKind.Request) {
        void this.perCapability.update(event.capability, (current) => advance(current, event));
      }
    });
  }

  async stream() {
    return this.bus.stream();
  }

  async stats(): Promise<StatsSnapshot> {
    const keys = await this.perCapability.keys();
    const entries = await all(
      keys.map((key) => async () => [key, await this.perCapability.get(key)] as const),
    );
    const byCapability = Object.fromEntries(
      entries.filter(
        (entry): entry is readonly [string, CapabilityStats] => entry[1] !== undefined,
      ),
    );
    const every = Object.values(byCapability);
    const sum = async (pick: (stats: CapabilityStats) => number) =>
      every.reduce((total, stats) => total + pick(stats), 0);
    return {
      name: StatsPattern.Stats,
      total: await sum((stats) => stats.count),
      errors: await sum((stats) => stats.errors),
      cacheHits: await sum((stats) => stats.cacheHits),
      byCapability,
      process: await this.runtime.process(),
      stages: await this.runtime.stages(),
      operations: await this.runtime.operations(),
    };
  }

  async recent(query: EventQuery): Promise<ApiEvent[]> {
    return this.bus.recent(query);
  }
}
