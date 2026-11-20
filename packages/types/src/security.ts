import { z } from "zod";
import type { JsonObject } from "./json.ts";

export const ProxyMarkerOptionsSchema = z.object({
  secret: z.string().min(1),
  domain: z.string(),
});
export type ProxyMarkerOptions = z.infer<typeof ProxyMarkerOptionsSchema>;

export const OriginOptionsSchema = z.object({
  allowedOrigins: z.array(z.string()),
  domain: z.string(),
});
export type OriginOptions = z.infer<typeof OriginOptionsSchema>;

export const ChallengeOptionsSchema = z.object({
  domain: z.string(),
  resource: z.string(),
  tokenPresented: z.boolean(),
});
export type ChallengeOptions = z.infer<typeof ChallengeOptionsSchema>;

export type MaskChange = (parent: JsonObject, key: string) => void;
