import { z } from "zod";

export const StreamEventSchema = z.object({
  event: z.string().optional(),
  id: z.string().optional(),
  data: z.unknown(),
});
export type StreamEvent = z.infer<typeof StreamEventSchema>;

export type JsonDocument = Record<string, unknown>;

export const WatchInputSchema = z.strictObject({
  name: z.string(),
  timeoutMs: z.number().int().positive().optional(),
  maxEvents: z.number().int().positive().optional(),
});
export type WatchInput = z.infer<typeof WatchInputSchema>;

export type ChangeListener = (uri: string) => void;

export interface ChangeSource {
  subscribe(listener: ChangeListener): Promise<() => Promise<void>>;
}

export type ReadStateCallback = (uri: URL, variables: Record<string, string>) => Promise<unknown>;
