import type { LiveProvider } from "@refinedev/core";
import { z } from "zod";

export const ConsoleConfigSchema = z.object({
  apiOrigin: z.string(),
  clientId: z.string(),
  redirectUri: z.string(),
});
export type ConsoleConfig = z.infer<typeof ConsoleConfigSchema>;

export const PkceChallengeSchema = z.object({
  verifier: z.string(),
  challenge: z.string(),
  state: z.string(),
});
export type PkceChallenge = z.infer<typeof PkceChallengeSchema>;

export const TokenClaimsSchema = z.object({
  scope: z.string().optional(),
  sub: z.string().optional(),
});
export type TokenClaims = z.infer<typeof TokenClaimsSchema>;

export interface TokenStore {
  get(): string | undefined;
  set(token: string): void;
  clear(): void;
}

export interface LiveSubscription {
  abort(): void;
}

export interface ConsoleProps {
  tokens: TokenStore;
}

export const ParsedFramesSchema = z.object({ events: z.array(z.unknown()), rest: z.string() });
export type ParsedFrames = z.infer<typeof ParsedFramesSchema>;

export interface CountedLiveProvider extends LiveProvider {
  dropped(): Promise<number>;
}

export const CallRecordSchema = z.object({
  url: z.string(),
  method: z.string(),
  authorization: z.string().nullable(),
});
export type CallRecord = z.infer<typeof CallRecordSchema>;
