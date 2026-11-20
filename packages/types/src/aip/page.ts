import { z } from "zod";

export const PageLimitsSchema = z.object({
  defaultPageSize: z.number().int().positive(),
  maxPageSize: z.number().int().positive(),
});
export type PageLimits = z.infer<typeof PageLimitsSchema>;

export const PageRequestSchema = z.object({
  pageSize: z.number().int().optional(),
  pageToken: z.string().optional(),
  query: z.unknown(),
});
export type PageRequest = z.infer<typeof PageRequestSchema>;

export const PageTokenPayloadSchema = z.object({
  offset: z.number().int().nonnegative(),
  query: z.string(),
});
export type PageTokenPayload = z.infer<typeof PageTokenPayloadSchema>;
