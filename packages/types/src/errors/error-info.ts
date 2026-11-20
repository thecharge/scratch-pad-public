import { CanonicalCode, ErrorDetailType, ErrorReason, MessageId } from "@platform/constants";
import { z } from "zod";
import { MessageParamsSchema, StringRecordSchema } from "../json.ts";

export const ErrorInfoSchema = z.object({
  "@type": z.literal(ErrorDetailType.ErrorInfo),
  reason: z.enum(ErrorReason),
  domain: z.string(),
  metadata: StringRecordSchema.optional(),
});
export type ErrorInfo = z.infer<typeof ErrorInfoSchema>;

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: z.number().int(),
    message: z.string(),
    status: z.enum(CanonicalCode),
    details: z.array(ErrorInfoSchema).min(1),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

export const FailureSchema = z.object({
  code: z.enum(CanonicalCode),
  reason: z.enum(ErrorReason),
  messageId: z.enum(MessageId),
  params: MessageParamsSchema.optional(),
  metadata: StringRecordSchema.optional(),
});
export type Failure = z.infer<typeof FailureSchema>;
