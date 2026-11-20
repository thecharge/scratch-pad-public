export enum EnvVar {
  AssetStorage = "ASSET_STORAGE",
  AppEnv = "APP_ENV",
  Port = "PORT",
  LogLevel = "LOG_LEVEL",
  ErrorDomain = "ERROR_DOMAIN",
  AuthEnabled = "AUTH_ENABLED",
  AuthProvider = "AUTH_PROVIDER",
  AuthResource = "AUTH_RESOURCE",
  AuthIssuer = "AUTH_ISSUER",
  AuthJwksUrl = "AUTH_JWKS_URL",
  AuthAudience = "AUTH_AUDIENCE",
  BetterAuthSecret = "BETTER_AUTH_SECRET",
  TrustedOrigins = "TRUSTED_ORIGINS",
  DatabasePath = "DATABASE_PATH",
  PageSizeDefault = "PAGE_SIZE_DEFAULT",
  PageSizeMax = "PAGE_SIZE_MAX",
  ShutdownTimeoutMs = "SHUTDOWN_TIMEOUT_MS",
  FeatureFlags = "FEATURE_FLAGS",
  SkillDirs = "SKILL_DIRS",
  ConcurrencyLimit = "CONCURRENCY_LIMIT",
  ProxySecret = "PROXY_SECRET",
}

export const PROXY_SECRET_MIN_LENGTH = 32;

export enum BooleanText {
  True = "true",
  False = "false",
}

export enum ConfigIssueCode {
  Invalid = "invalid",
  Required = "required",
  TooShort = "too_short",
  NotAllowed = "not_allowed",
}

export const DEFAULT_PORT = 3000;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 1000;
export const BETTER_AUTH_MIN_SECRET_LENGTH = 32;
export const MIN_PORT = 1;
export const MAX_PORT = 65535;
export const DEFAULT_DATABASE_PATH = "./data/app.sqlite";
export const DEFAULT_SKILL_DIRS = "./packages/skills/skills";
export const DEFAULT_STORE_MAX_ENTRIES = 10_000;
export const DEFAULT_CONCURRENCY_LIMIT = 8;

export enum Surface {
  Console = "console",
  Api = "api",
  Mcp = "mcp",
  Docs = "docs",
}
export const FACTUAL_URLS_FILE = "factual-urls.json";
