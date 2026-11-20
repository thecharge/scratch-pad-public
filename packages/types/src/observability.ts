import type { Meter, Tracer } from "@opentelemetry/api";
import { EventKind, LogLevel } from "@platform/constants";
import { z } from "zod";
import { type ApiEvent, ApiEventSchema } from "./events/api-event.ts";

export const CapabilityStatsSchema = z.object({
  count: z.number().int(),
  errors: z.number().int(),
  cacheHits: z.number().int(),
  totalLatencyMs: z.number(),
  firstSeen: z.string(),
  lastSeen: z.string(),
});
export type CapabilityStats = z.infer<typeof CapabilityStatsSchema>;

export const ProcessMetricsSchema = z.object({
  rssBytes: z.number(),
  heapTotalBytes: z.number(),
  heapUsedBytes: z.number(),
  externalBytes: z.number(),
  cpuUserMicros: z.number(),
  cpuSystemMicros: z.number(),
  eventLoopDelayMaxMs: z.number(),
  uptimeSeconds: z.number(),
  requestsInFlight: z.number().int(),
  startRssBytes: z.number(),
  openStreams: z.number().int(),
  runningOperations: z.number().int(),
  heapCollections: z.number().int(),
  heapFreedBytes: z.number(),
});
export type ProcessMetrics = z.infer<typeof ProcessMetricsSchema>;

export const StageStatsSchema = z.object({
  count: z.number().int(),
  totalMs: z.number(),
  maxMs: z.number(),
});
export type StageStats = z.infer<typeof StageStatsSchema>;

export const OperationStatsSchema = z.object({
  count: z.number().int(),
  errors: z.number().int(),
  totalMs: z.number(),
  maxMs: z.number(),
  bytes: z.number(),
  buckets: z.array(z.number().int()),
  firstByteTotalMs: z.number(),
  firstByteMaxMs: z.number(),
  firstByteBuckets: z.array(z.number().int()),
});
export type OperationStats = z.infer<typeof OperationStatsSchema>;

export interface RuntimeSource {
  process(): Promise<ProcessMetrics>;
  stages(): Promise<Record<string, StageStats>>;
  operations(): Promise<Record<string, OperationStats>>;
}

export const StatsSnapshotSchema = z.object({
  name: z.string(),
  total: z.number().int(),
  errors: z.number().int(),
  cacheHits: z.number().int(),
  byCapability: z.record(z.string(), CapabilityStatsSchema),
  process: ProcessMetricsSchema,
  stages: z.record(z.string(), StageStatsSchema),
  operations: z.record(z.string(), OperationStatsSchema),
});
export type StatsSnapshot = z.infer<typeof StatsSnapshotSchema>;

export const EventQuerySchema = z.object({
  kind: z.enum(EventKind).optional(),
  capability: z.string().optional(),
  limit: z.number().int().positive().optional(),
});
export type EventQuery = z.infer<typeof EventQuerySchema>;

export const EventListSchema = z.object({ events: z.array(ApiEventSchema) });
export type EventList = z.infer<typeof EventListSchema>;

export const LogListInputSchema = z.strictObject({
  kind: z.enum(EventKind).optional(),
  capability: z.string().optional(),
  pageSize: z.number().int().optional(),
  pageToken: z.string().optional(),
});
export type LogListInput = z.infer<typeof LogListInputSchema>;

export const LogListSchema = EventListSchema.extend({ nextPageToken: z.string() });
export type LogList = z.infer<typeof LogListSchema>;

export const LoggerLevelSchema = z.enum(LogLevel);

export interface ObservabilityReader {
  stats(): Promise<StatsSnapshot>;
  recent(query: EventQuery): Promise<ApiEvent[]>;
  stream(): Promise<ReadableStream<ApiEvent>>;
}

export interface LogSink {
  write(line: string): void;
}

export interface LoggerOptions {
  level: LogLevel;
  redact: string[];
  sink?: LogSink;
}

export type EventListener = (event: ApiEvent) => void;

export interface LogWriter {
  info(fields: Record<string, unknown>, message: string): void;
}

export interface TelemetryDeps {
  tracer: Tracer;
  meter: Meter;
  logger?: LogWriter;
}

export interface TelemetryHandle extends TelemetryDeps {
  shutdown(): Promise<void>;
}

export const ExpositionSampleSchema = z.tuple([z.string(), z.number()]);
export type ExpositionSample = z.infer<typeof ExpositionSampleSchema>;

export const MetricsSnapshotSchema = z.object({
  forcedGcMs: z.number(),
  forcedGcFreedBytes: z.number(),
  process: ProcessMetricsSchema,
  stages: z.record(z.string(), StageStatsSchema),
  operations: z.record(z.string(), OperationStatsSchema),
});
export type MetricsSnapshot = z.infer<typeof MetricsSnapshotSchema>;
export const MetricsSnapshotListSchema = z.array(MetricsSnapshotSchema);

export const MetricsReportSchema = z.object({
  snapshots: z.number().int(),
  rssBytes: z.number(),
  heapUsedBytes: z.number(),
  eventLoopDelayMaxMs: z.number(),
  rssGrowthBytes: z.number(),
  heapCollections: z.number().int(),
  heapFreedBytes: z.number(),
  forcedGcMs: z.number(),
  operations: z.record(z.string(), OperationStatsSchema),
  p95Ms: z.record(z.string(), z.number()),
  firstByteP95Ms: z.record(z.string(), z.number()),
  requestsPerSecond: z.record(z.string(), z.number()),
});
export type MetricsReport = z.infer<typeof MetricsReportSchema>;
