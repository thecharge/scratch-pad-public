import {
  CacheScope,
  CanonicalCode,
  PolicyOutcome,
  PrincipalKind,
  TransportKind,
} from "@platform/constants";
import { z } from "zod";

export const PipelineRecordSchema = z.object({
  capabilityId: z.string(),
  requestId: z.string(),
  transport: z.enum(TransportKind),
  principalKind: z.enum(PrincipalKind),
  status: z.enum(CanonicalCode),
  latencyMs: z.number(),
  cacheHit: z.boolean(),
  policyOutcome: z.enum(PolicyOutcome).optional(),
});
export type PipelineRecord = z.infer<typeof PipelineRecordSchema>;

export const InvokeResultSchema = z.object({
  output: z.unknown(),
  cacheHit: z.boolean(),
  policyOutcome: z.enum(PolicyOutcome).optional(),
});
export type InvokeResult = z.infer<typeof InvokeResultSchema>;

export const CacheEntrySchema = z.object({
  value: z.unknown(),
  expiresAt: z.number(),
});
export type CacheEntry = z.infer<typeof CacheEntrySchema>;

export const RateWindowSchema = z.object({
  startedAt: z.number(),
  count: z.number().int(),
});
export type RateWindow = z.infer<typeof RateWindowSchema>;

export const CacheHintSchema = z.object({
  ttlMs: z.number().int().nonnegative(),
  cacheScope: z.enum(CacheScope),
});
export type CacheHint = z.infer<typeof CacheHintSchema>;
