import {
  AppEnvironment,
  AuthProviderKind,
  BETTER_AUTH_MIN_SECRET_LENGTH,
  ConfigIssueCode,
  EnvVar,
  MessageId,
  Separator,
} from "@platform/constants";
import { message } from "@platform/messages";
import {
  type AppConfig,
  AssetStorageOptionsSchema,
  type AuthConfig,
  type ConfigIssue,
  type Env,
  type Environment,
  EnvSchema,
  type PaginationConfig,
} from "@platform/types";
import { all } from "@platform/util/browser";
import { DEFAULT_ERROR_DOMAIN, DEFAULT_RESOURCE_PROTOCOL, LOCAL_HOST_PATTERN } from "./urls.ts";

export class ConfigError extends Error {
  readonly issues: readonly ConfigIssue[];

  constructor(issues: readonly ConfigIssue[]) {
    super(
      message(MessageId.ConfigInvalid, {
        variables: issues.map((issue) => issue.variable).join(Separator.ListSpaced),
      }),
    );
    this.name = new.target.name;
    this.issues = issues;
  }
}

async function issue(variable: EnvVar, code: ConfigIssueCode): Promise<ConfigIssue> {
  return { variable, code };
}

async function secretIssues(env: Env): Promise<ConfigIssue[]> {
  const secret = env[EnvVar.BetterAuthSecret];
  if (secret === undefined || secret.length === 0) {
    return [await issue(EnvVar.BetterAuthSecret, ConfigIssueCode.Required)];
  }
  return secret.length < BETTER_AUTH_MIN_SECRET_LENGTH
    ? [await issue(EnvVar.BetterAuthSecret, ConfigIssueCode.TooShort)]
    : [];
}

async function jwksIssues(env: Env): Promise<ConfigIssue[]> {
  return all(
    [EnvVar.AuthIssuer, EnvVar.AuthJwksUrl, EnvVar.AuthAudience]
      .filter((variable) => env[variable] === undefined)
      .map((variable) => async () => issue(variable, ConfigIssueCode.Required)),
  );
}

async function authIssues(env: Env, authEnabled: boolean): Promise<ConfigIssue[]> {
  if (!authEnabled) {
    return [];
  }
  return env[EnvVar.AuthProvider] === AuthProviderKind.BetterAuth
    ? await secretIssues(env)
    : await jwksIssues(env);
}

async function productionIssues(env: Env): Promise<ConfigIssue[]> {
  if (env[EnvVar.AppEnv] !== AppEnvironment.Production) {
    return [];
  }
  const issues =
    env[EnvVar.AuthEnabled] === undefined
      ? [await issue(EnvVar.AuthEnabled, ConfigIssueCode.Required)]
      : [];
  const localOrigin = env[EnvVar.TrustedOrigins].some((origin) => LOCAL_HOST_PATTERN.test(origin));
  return localOrigin
    ? [...issues, await issue(EnvVar.TrustedOrigins, ConfigIssueCode.NotAllowed)]
    : issues;
}

async function paginationIssues(env: Env): Promise<ConfigIssue[]> {
  return env[EnvVar.PageSizeDefault] > env[EnvVar.PageSizeMax]
    ? [await issue(EnvVar.PageSizeDefault, ConfigIssueCode.Invalid)]
    : [];
}

async function present<T extends object>(values: T): Promise<Partial<T>> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

async function authConfig(env: Env, enabled: boolean): Promise<AuthConfig> {
  return {
    enabled,
    provider: env[EnvVar.AuthProvider],
    resource: env[EnvVar.AuthResource] ?? `${DEFAULT_RESOURCE_PROTOCOL}${env[EnvVar.Port]}`,
    trustedOrigins: env[EnvVar.TrustedOrigins],
    ...(await present({
      issuer: env[EnvVar.AuthIssuer],
      jwksUrl: env[EnvVar.AuthJwksUrl],
      audience: env[EnvVar.AuthAudience],
      betterAuthSecret: env[EnvVar.BetterAuthSecret],
    })),
  };
}

async function paginationConfig(env: Env): Promise<PaginationConfig> {
  return {
    defaultPageSize: env[EnvVar.PageSizeDefault],
    maxPageSize: env[EnvVar.PageSizeMax],
  };
}

async function assetConfig(env: Env) {
  const raw = env[EnvVar.AssetStorage];
  if (raw === undefined) return {};
  try {
    return { assets: AssetStorageOptionsSchema.parse(JSON.parse(raw)) };
  } catch {
    throw new ConfigError([await issue(EnvVar.AssetStorage, ConfigIssueCode.Invalid)]);
  }
}

export async function loadConfig(environment: Environment): Promise<AppConfig> {
  const parsed = EnvSchema.safeParse(environment);
  if (!parsed.success) {
    throw new ConfigError(
      await all(
        parsed.error.issues.map(
          (found) => async () => issue(String(found.path[0]) as EnvVar, ConfigIssueCode.Invalid),
        ),
      ),
    );
  }
  const env = parsed.data;
  const authEnabled = env[EnvVar.AuthEnabled] ?? false;
  const issues = [
    ...(await productionIssues(env)),
    ...(await authIssues(env, authEnabled)),
    ...(await paginationIssues(env)),
  ];
  if (issues.length > 0) {
    throw new ConfigError(issues);
  }
  return {
    env: env[EnvVar.AppEnv],
    ...(await assetConfig(env)),
    port: env[EnvVar.Port],
    logLevel: env[EnvVar.LogLevel],
    errorDomain: env[EnvVar.ErrorDomain] ?? DEFAULT_ERROR_DOMAIN,
    auth: await authConfig(env, authEnabled),
    databasePath: env[EnvVar.DatabasePath],
    pagination: await paginationConfig(env),
    shutdownTimeoutMs: env[EnvVar.ShutdownTimeoutMs],
    flags: env[EnvVar.FeatureFlags],
    skillDirs: env[EnvVar.SkillDirs],
    proxySecret: env[EnvVar.ProxySecret],
  };
}

export async function loadConfigFromProcess(): Promise<AppConfig> {
  return loadConfig(process.env);
}
