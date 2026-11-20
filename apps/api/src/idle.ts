import { StatsPattern } from "@platform/constants";
import type { CapabilitySource, ObservabilityReader, SkillAppOptions } from "@platform/types";

export const IDLE_OBSERVABILITY: ObservabilityReader = {
  stats: async () => ({
    name: StatsPattern.Stats,
    total: 0,
    errors: 0,
    cacheHits: 0,
    byCapability: {},
    process: {
      rssBytes: 0,
      heapTotalBytes: 0,
      heapUsedBytes: 0,
      externalBytes: 0,
      cpuUserMicros: 0,
      cpuSystemMicros: 0,
      eventLoopDelayMaxMs: 0,
      uptimeSeconds: 0,
      requestsInFlight: 0,
      startRssBytes: 0,
      openStreams: 0,
      runningOperations: 0,
      heapCollections: 0,
      heapFreedBytes: 0,
    },
    stages: {},
    operations: {},
  }),
  recent: async () => [],
  stream: async () => new ReadableStream({ start: async (controller) => controller.close() }),
};

export async function idleSkillOptions(source: CapabilitySource): Promise<SkillAppOptions> {
  return {
    source,
    visible: async () => false,
    allowed: async () => false,
    authEnabled: false,
    skillDirs: [],
  };
}
