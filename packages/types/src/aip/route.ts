import { HttpMethod, InputField, RouteOutcome, RouteScope } from "@platform/constants";
import { z } from "zod";

export const RouteSpecSchema = z.object({
  method: z.enum(HttpMethod),
  segments: z.array(z.string()),
  verb: z.string().optional(),
  scope: z.enum(RouteScope),
  target: z.enum(InputField).optional(),
});
export type RouteSpec = z.infer<typeof RouteSpecSchema>;

export const RouteMatchSchema = z.object({
  outcome: z.enum(RouteOutcome),
  index: z.number().int().nonnegative().optional(),
  allowed: z.array(z.enum(HttpMethod)),
  verb: z.string().optional(),
});
export type RouteMatch = z.infer<typeof RouteMatchSchema>;

export const InputSplitSchema = z.object({
  path: z.array(z.string()),
  query: z.array(z.string()),
  body: z.array(z.string()),
});
export type InputSplit = z.infer<typeof InputSplitSchema>;

export const VerbSplitSchema = z.object({
  id: z.string(),
  verb: z.string().optional(),
});
export type VerbSplit = z.infer<typeof VerbSplitSchema>;
