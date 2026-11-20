import {
  VERIFICATION_COMMIT_PATTERN,
  VERIFICATION_HASH_PATTERN,
  VERIFICATION_PLAN_VERSION,
  VERIFICATION_ROOT_FLAG,
  VerificationArea,
  VerificationInputKind,
  VerificationReason,
} from "@platform/constants";
import { z } from "zod";

export const VerificationPolicySchema = z
  .object({
    fullAfterAttempts: z.number().int().positive(),
    fullMaxAgeMs: z.number().int().positive(),
  })
  .strict();
export type VerificationPolicy = z.infer<typeof VerificationPolicySchema>;

export const VerificationRangeSchema = z
  .object({
    base: z.string().regex(VERIFICATION_COMMIT_PATTERN),
    head: z.string().regex(VERIFICATION_COMMIT_PATTERN),
  })
  .strict();
export type VerificationRange = z.infer<typeof VerificationRangeSchema>;

const CommitIdSchema = z.string().regex(VERIFICATION_COMMIT_PATTERN);
const RootArgumentSchema = z.string().min(1);
export const VerificationReportArgumentsSchema = z.union([
  z.tuple([]),
  z.tuple([CommitIdSchema, CommitIdSchema]),
  z.tuple([z.literal(VERIFICATION_ROOT_FLAG), RootArgumentSchema]),
  z.tuple([z.literal(VERIFICATION_ROOT_FLAG), RootArgumentSchema, CommitIdSchema, CommitIdSchema]),
]);

export const VerificationFileSchema = z
  .object({
    path: z.string().min(1),
    hash: z.string().regex(VERIFICATION_HASH_PATTERN),
    mode: z.number().int().nonnegative(),
    kind: z.enum(VerificationInputKind),
  })
  .strict();
export type VerificationFile = z.infer<typeof VerificationFileSchema>;

export const VerificationTreeSchema = z
  .object({
    range: VerificationRangeSchema.optional(),
    changed: z.array(z.string()),
    dirty: z.array(z.string()),
    files: z.array(VerificationFileSchema),
    problems: z.array(z.string()),
  })
  .strict();
export type VerificationTree = z.infer<typeof VerificationTreeSchema>;

export const VerificationChangeSchema = z
  .object({
    path: z.string(),
    area: z.enum(VerificationArea),
  })
  .strict();
export type VerificationChange = z.infer<typeof VerificationChangeSchema>;

export const VerificationPlanEntrySchema = z
  .object({
    step: z.string(),
    command: z.array(z.string()),
    fingerprint: z.string().regex(VERIFICATION_HASH_PATTERN),
    execute: z.literal(true),
    candidate: z.boolean(),
    reason: z.enum(VerificationReason),
  })
  .strict();

export const VerificationPlanSchema = z
  .object({
    version: z.literal(VERIFICATION_PLAN_VERSION),
    reportOnly: z.literal(true),
    fullRequired: z.literal(true),
    policy: VerificationPolicySchema.optional(),
    range: VerificationRangeSchema.optional(),
    changes: z.array(VerificationChangeSchema),
    dirty: z.array(z.string()),
    problems: z.array(z.string()),
    reasons: z.array(z.enum(VerificationReason)),
    entries: z.array(VerificationPlanEntrySchema),
  })
  .strict();
export type VerificationPlan = z.infer<typeof VerificationPlanSchema>;
