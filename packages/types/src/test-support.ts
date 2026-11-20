import { AuthProviderKind, McpEra, McpFixtureKind } from "@platform/constants";
import { z } from "zod";
import { JsonObjectSchema } from "./json.ts";

export const IssueOptionsSchema = z.object({
  subject: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  audience: z.string().optional(),
  expiresInSeconds: z.number().optional(),
  noExpiry: z.boolean().optional(),
  claims: JsonObjectSchema.optional(),
  issuer: z.string().optional(),
});
export type IssueOptions = z.infer<typeof IssueOptionsSchema>;

export const OAuthClientCredentialsSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});
export type OAuthClientCredentials = z.infer<typeof OAuthClientCredentialsSchema>;

export const SignedTokenSchema = z.object({ token: z.string() });
export const LifecycleResultSchema = z.object({
  code: z.number(),
  elapsed: z.number(),
  started: z.string(),
  rest: z.string(),
});
export type SignedToken = z.infer<typeof SignedTokenSchema>;

export const TokenResponseSchema = z.object({ access_token: z.string() });
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

const SdkIntegrationKeySchema = z.looseObject({ kty: z.string() });
const SdkIntegrationKeysSchema = z.object({ keys: z.array(SdkIntegrationKeySchema) });

export const SdkIntegrationInputSchema = z.object({
  enabled: z.boolean(),
  domain: z.string().optional(),
  era: z.enum(McpEra).optional(),
  reindexStepMs: z.number().nonnegative().optional(),
  skillDirs: z.array(z.string()).optional(),
  issuerId: z.number().int().nonnegative().optional(),
  allowedOrigins: z.array(z.string()).optional(),
  slowStreamMs: z.number().nonnegative().optional(),
  mcpFixture: z.enum(McpFixtureKind).optional(),
  resource: z.string().optional(),
  omitExpiry: z.boolean().optional(),
  rejectHost: z.boolean().optional(),
  captureLogs: z.boolean().optional(),
  enableSuggest: z.boolean().optional(),
  betterAuth: z.boolean().optional(),
  authFixtureId: z.number().int().nonnegative().optional(),
  rejectAudience: z.boolean().optional(),
  authDisabledProbe: z.boolean().optional(),
  databasePath: z.string().optional(),
  customCapabilities: z.boolean().optional(),
  tickClock: z.boolean().optional(),
  assets: z.boolean().optional(),
  docsProvider: z.enum(AuthProviderKind).optional(),
});
export type SdkIntegrationInput = z.infer<typeof SdkIntegrationInputSchema>;
export const BetterAuthClientControlSchema = z.object({
  cookie: z.string(),
  client: JsonObjectSchema,
});
export const BetterAuthAdminControlSchema = z.object({ email: z.email() });
export const SdkIntegrationInfoSchema = z.object({
  id: z.number().int().nonnegative(),
  issuer: z.string(),
  audience: z.string(),
  jwks: SdkIntegrationKeysSchema,
});
