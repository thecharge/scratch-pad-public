import { StatsCapabilityId } from "./observability.ts";

export enum ConsoleView {
  Live = "live",
  Logs = "logs",
  Stats = "stats",
}

export enum ConsoleResource {
  Stats = "stats",
  Logs = "logs",
}

export enum ConsoleApiPath {
  Stats = "/v1/stats",
  Logs = "/v1/logs",
}

export enum OAuthParam {
  ResponseType = "response_type",
  ClientId = "client_id",
  RedirectUri = "redirect_uri",
  Scope = "scope",
  State = "state",
  CodeChallenge = "code_challenge",
  CodeChallengeMethod = "code_challenge_method",
  Resource = "resource",
  Code = "code",
  CodeVerifier = "code_verifier",
  GrantType = "grant_type",
  AccessToken = "access_token",
}

export enum OAuthValue {
  Code = "code",
  S256 = "S256",
  AuthorizationCode = "authorization_code",
}

export enum ConsoleStorageKey {
  Verifier = "console.pkce.verifier",
  State = "console.pkce.state",
}

export enum ConsoleAuthPath {
  Authorize = "/api/auth/mcp/authorize",
  Token = "/api/auth/mcp/token",
}

export const CONSOLE_CLIENT_ID = "capability-console";
export const CONSOLE_LIVE_ROWS_MAX = 200;
export const CONSOLE_ROW_HEIGHT = 36;
export const CONSOLE_LOG_LIMIT = 200;
export const PKCE_BYTES = 32;
export const SSE_FRAME_SEPARATOR = "\n\n";
export const SSE_DATA_PREFIX = "data:";
export const SSE_EVENT_PREFIX = "event:";
export const ALL_KINDS = "all";

export enum ConsoleClass {
  Card = "rounded-lg border bg-white p-4 shadow-sm",
  Badge = "rounded bg-slate-100 px-2 py-0.5 text-xs font-medium",
  Button = "rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white",
  Input = "rounded-md border px-2 py-1 text-sm",
}

export enum ConsoleDom {
  RootId = "root",
}

export enum ConsoleQuery {
  PageSize = "pageSize",
}

export enum ConsoleFilterKey {
  Field = "field",
}

export const LIVE_MODE_AUTO = "auto" as const;
export const CONSOLE_OWN_READS: readonly string[] = [
  StatsCapabilityId.Get,
  StatsCapabilityId.LogsList,
];
export const SHA256_NAME = "SHA-256";
export const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";
export const KEY_JOINER = "|";

export enum EventField {
  Time = "time",
  Kind = "kind",
  Capability = "capability",
  Transport = "transport",
}

export const OPERATOR_EQ = "eq" as const;
export const POSITION_RELATIVE = "relative" as const;
export const PX = "px";
export const TRANSLATE_PREFIX = "translateY(";
export const TRANSLATE_SUFFIX = ")";

export const STUB_CODE_BYTES = 16;
export const STUB_CODE_TTL_MS = 60_000;
export const STUB_MAX_CODES = 64;
export const TOKEN_TYPE = "Bearer";
export const BASE64URL_ENCODING = "base64url";

export const OAUTH_ERROR = "error";
export const OAUTH_INVALID_GRANT = "invalid_grant";
export const OAUTH_TOKEN_TYPE_FIELD = "token_type";
export const HTTP_OK = 200;
export const HTTP_BAD_REQUEST = 400;

export const BASE64_URL_PLUS = /\+/g;
export const BASE64_URL_SLASH = /\//g;
export const BASE64_PADDING = /=+$/;
export const BASE64_DASH = /-/g;
export const BASE64_UNDERSCORE = /_/g;
export const PLUS = "+";
export const SLASH = "/";
export const DASH = "-";
export const UNDERSCORE = "_";

export const MS_PER_MINUTE = 60_000;
export const MIN_RATE_WINDOW_MINUTES = 1;
export const LATENCY_DIGITS = 1;

export const CHART_COLOR_ONE = "var(--chart-1)";
export const CHART_FILL_COUNT = "var(--color-count)";
