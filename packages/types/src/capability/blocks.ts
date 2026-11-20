import {
  CacheScope,
  MaskStrategy,
  PolicyOutcome,
  PolicyReason,
  PrincipalKind,
} from "@platform/constants";
import { z } from "zod";

export const PolicyBlockSchema = z.object({
  allowedKinds: z.array(z.enum(PrincipalKind)).optional(),
  requiredScopes: z.array(z.string()).optional(),
  anyRole: z.array(z.string()).optional(),
});
export type PolicyBlock = z.infer<typeof PolicyBlockSchema>;

export const PolicyDecisionSchema = z.object({
  outcome: z.enum(PolicyOutcome),
  reason: z.enum(PolicyReason),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const MaskRuleSchema = z.object({
  path: z.string(),
  strategy: z.enum(MaskStrategy),
  unlessScope: z.string().optional(),
  replacement: z.string().optional(),
  visibleChars: z.number().int().nonnegative().optional(),
});
export type MaskRule = z.infer<typeof MaskRuleSchema>;

export const MaskBlockSchema = z.object({ rules: z.array(MaskRuleSchema) });
export type MaskBlock = z.infer<typeof MaskBlockSchema>;

export const MaskResultSchema = z.object({
  output: z.unknown(),
  maskedPaths: z.array(z.string()),
});
export type MaskResult = z.infer<typeof MaskResultSchema>;

export const CacheBlockSchema = z.object({
  ttlMs: z.number().int().nonnegative(),
  scope: z.enum(CacheScope),
});
export type CacheBlock = z.infer<typeof CacheBlockSchema>;

export const RateLimitBlockSchema = z.object({
  limit: z.number().int().positive(),
  windowMs: z.number().int().positive(),
});
export type RateLimitBlock = z.infer<typeof RateLimitBlockSchema>;
