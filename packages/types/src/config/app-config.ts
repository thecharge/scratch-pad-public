import { AppEnvironment, AuthProviderKind, LogLevel } from "@platform/constants";
import { z } from "zod";
import { AssetStorageOptionsSchema } from "../assets.ts";
import { FlagValuesSchema } from "../flags.ts";

export const AuthConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(AuthProviderKind),
  resource: z.string(),
  issuer: z.string().optional(),
  jwksUrl: z.string().optional(),
  audience: z.string().optional(),
  betterAuthSecret: z.string().optional(),
  trustedOrigins: z.array(z.string()),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

export const PaginationConfigSchema = z.object({
  defaultPageSize: z.number().int().positive(),
  maxPageSize: z.number().int().positive(),
});

export type PaginationConfig = z.infer<typeof PaginationConfigSchema>;

export const AppConfigSchema = z.object({
  assets: AssetStorageOptionsSchema.optional(),
  env: z.enum(AppEnvironment),
  port: z.number().int(),
  logLevel: z.enum(LogLevel),
  errorDomain: z.string(),
  auth: AuthConfigSchema,
  databasePath: z.string(),
  pagination: PaginationConfigSchema,
  shutdownTimeoutMs: z.number().int().positive(),
  flags: FlagValuesSchema,
  skillDirs: z.array(z.string()),
  proxySecret: z.string().optional(),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;

export const BetterAuthFlagsSchema = z.object({
  emailAndPassword: z.boolean().optional(),
  production: z.boolean().optional(),
});
export type BetterAuthFlags = z.infer<typeof BetterAuthFlagsSchema>;
