import {
  DiscriminatorKey,
  EventKind,
  PolicyOutcome,
  PolicyReason,
  PrincipalKind,
  TransportKind,
} from "@platform/constants";
import { z } from "zod";

const base = {
  time: z.string(),
  requestId: z.string(),
  capability: z.string(),
  transport: z.enum(TransportKind),
  principalKind: z.enum(PrincipalKind),
};

export const RequestEventSchema = z.object({
  ...base,
  kind: z.literal(EventKind.Request),
  status: z.number().int(),
  latencyMs: z.number().nonnegative(),
  cacheHit: z.boolean(),
});

export const DecisionEventSchema = z.object({
  ...base,
  kind: z.literal(EventKind.Decision),
  outcome: z.enum(PolicyOutcome),
  reason: z.enum(PolicyReason),
});

export const ErrorEventSchema = z.object({
  ...base,
  kind: z.literal(EventKind.Error),
  status: z.string(),
  reason: z.string(),
});

export const CacheEventSchema = z.object({
  ...base,
  kind: z.literal(EventKind.Cache),
  hit: z.boolean(),
});

export const MaskEventSchema = z.object({
  ...base,
  kind: z.literal(EventKind.Mask),
  maskedPaths: z.array(z.string()),
});

export const ApiEventSchema = z.discriminatedUnion(DiscriminatorKey.Kind, [
  RequestEventSchema,
  DecisionEventSchema,
  ErrorEventSchema,
  CacheEventSchema,
  MaskEventSchema,
]);
export type ApiEvent = z.infer<typeof ApiEventSchema>;
