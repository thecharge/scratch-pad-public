import { VERIFICATION_COMMIT_PATTERN } from "@platform/constants";
import { z } from "zod";
import {
  VERIFICATION_REF_TOKEN,
  VerificationPushReason,
} from "../../constants/src/verification-push.ts";
import { VerificationRangeSchema } from "./verification.ts";

export const VerificationPushUpdateSchema = z.tuple([
  z.string().regex(VERIFICATION_REF_TOKEN),
  z.string().regex(VERIFICATION_COMMIT_PATTERN),
  z.string().regex(VERIFICATION_REF_TOKEN),
  z.string().regex(VERIFICATION_COMMIT_PATTERN),
]);

export const VerificationPushSchema = z
  .object({
    updates: z.array(VerificationPushUpdateSchema),
    range: VerificationRangeSchema.optional(),
    reasons: z.array(z.enum(VerificationPushReason)),
  })
  .strict();
export type VerificationPush = z.infer<typeof VerificationPushSchema>;
