import { z } from "zod";
import { DocumentPhase, DocumentScopeReason } from "../../constants/src/document-shipping.ts";
import { VerificationRangeSchema } from "./verification.ts";

export const DocumentScopeSchema = z.strictObject({
  phase: z.enum(DocumentPhase),
  eligible: z.boolean(),
  reason: z.enum(DocumentScopeReason),
  head: z.string(),
  snapshot: z.string(),
  range: VerificationRangeSchema.optional(),
  changed: z.array(z.string()),
});
export type DocumentScope = z.infer<typeof DocumentScopeSchema>;

export const DocumentLinkTargetSchema = z.strictObject({
  exists: z.boolean(),
  markdown: z.string().optional(),
});
export type DocumentLinkTarget = z.infer<typeof DocumentLinkTargetSchema>;
