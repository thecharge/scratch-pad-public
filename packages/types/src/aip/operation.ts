import { OPERATION_DURATION_PATTERN } from "@platform/constants";
import { z } from "zod";
import { ApiErrorBodySchema } from "../errors/error-info.ts";

export const OperationSchema = z.object({
  name: z.string(),
  done: z.boolean(),
  metadata: z.unknown().optional(),
  response: z.unknown().optional(),
  error: ApiErrorBodySchema.shape.error.optional(),
});
export type Operation = z.infer<typeof OperationSchema>;
export type OperationProgress = (operation: Operation) => Promise<void>;
export const OperationProgressSchema = z.object({
  processed: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export const StoredOperationSchema = z.object({
  operation: OperationSchema,
  createdAt: z.number(),
});
export const ListOperationsInputSchema = z.strictObject({
  pageSize: z.number().int().optional(),
  pageToken: z.string().optional(),
  filter: z.string().optional(),
});
export type ListOperationsInput = z.infer<typeof ListOperationsInputSchema>;

export const OperationListSchema = z.object({
  operations: z.array(OperationSchema),
  nextPageToken: z.string(),
});
export type OperationList = z.infer<typeof OperationListSchema>;

export const OperationNameInputSchema = z.strictObject({ name: z.string() });
export type OperationNameInput = z.infer<typeof OperationNameInputSchema>;

export const WaitOperationInputSchema = z.strictObject({
  name: z.string(),
  timeout: z.string().regex(OPERATION_DURATION_PATTERN).optional(),
});
export type WaitOperationInput = z.infer<typeof WaitOperationInputSchema>;

export const EmptySchema = z.strictObject({});
export type Empty = z.infer<typeof EmptySchema>;

export type StoredOperation = z.infer<typeof StoredOperationSchema>;
