import {
  AppEnvironment,
  AuthProviderKind,
  BooleanText,
  DEFAULT_CONCURRENCY_LIMIT,
  DEFAULT_DATABASE_PATH,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PORT,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  DEFAULT_SKILL_DIRS,
  EnvVar,
  FLAG_ON_TEXT,
  FLAG_PAIR_SEPARATOR,
  LogLevel,
  MAX_PAGE_SIZE,
  MAX_PORT,
  MIN_PORT,
  PROXY_SECRET_MIN_LENGTH,
  Separator,
  Text,
} from "@platform/constants";
import { z } from "zod";

const booleanText = z.enum(BooleanText).transform((value) => value === BooleanText.True);

const commaList = z
  .string()
  .default(Text.Empty)
  .transform((value) =>
    value
      .split(Separator.List)
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );

const skillDirList = z
  .string()
  .default(DEFAULT_SKILL_DIRS)
  .transform((value) =>
    value
      .split(Separator.List)
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );

const flagPairs = z
  .string()
  .default(Text.Empty)
  .transform((value) =>
    Object.fromEntries(
      value
        .split(Separator.List)
        .map((item) => item.split(FLAG_PAIR_SEPARATOR))
        .filter(([key]) => (key ?? Text.Empty).trim().length > 0)
        .map(([key, state]) => [
          (key ?? Text.Empty).trim(),
          (state ?? Text.Empty).trim() === FLAG_ON_TEXT,
        ]),
    ),
  );

export const ConcurrencyLimitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .default(DEFAULT_CONCURRENCY_LIMIT);

export const EnvSchema = z.object({
  [EnvVar.AssetStorage]: z.string().optional(),
  [EnvVar.AppEnv]: z.enum(AppEnvironment).default(AppEnvironment.Development),
  [EnvVar.Port]: z.coerce.number().int().min(MIN_PORT).max(MAX_PORT).default(DEFAULT_PORT),
  [EnvVar.LogLevel]: z.enum(LogLevel).default(LogLevel.Info),
  [EnvVar.ErrorDomain]: z.string().min(1).optional(),
  [EnvVar.AuthEnabled]: booleanText.optional(),
  [EnvVar.AuthProvider]: z.enum(AuthProviderKind).default(AuthProviderKind.BetterAuth),
  [EnvVar.AuthResource]: z.url().optional(),
  [EnvVar.AuthIssuer]: z.url().optional(),
  [EnvVar.AuthJwksUrl]: z.url().optional(),
  [EnvVar.AuthAudience]: z.string().min(1).optional(),
  [EnvVar.BetterAuthSecret]: z.string().optional(),
  [EnvVar.TrustedOrigins]: commaList,
  [EnvVar.DatabasePath]: z.string().min(1).default(DEFAULT_DATABASE_PATH),
  [EnvVar.PageSizeDefault]: z.coerce.number().int().min(1).default(DEFAULT_PAGE_SIZE),
  [EnvVar.PageSizeMax]: z.coerce.number().int().min(1).default(MAX_PAGE_SIZE),
  [EnvVar.ShutdownTimeoutMs]: z.coerce.number().int().min(1).default(DEFAULT_SHUTDOWN_TIMEOUT_MS),
  [EnvVar.FeatureFlags]: flagPairs,
  [EnvVar.SkillDirs]: skillDirList,
  [EnvVar.ConcurrencyLimit]: ConcurrencyLimitSchema,
  [EnvVar.ProxySecret]: z.string().min(PROXY_SECRET_MIN_LENGTH).optional(),
});
export type Env = z.infer<typeof EnvSchema>;

export const EnvironmentSchema = z.record(z.string(), z.string().optional());
export type Environment = z.infer<typeof EnvironmentSchema>;
