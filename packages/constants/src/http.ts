export enum HttpHeader {
  Via = "via",
  Authorization = "authorization",
  WwwAuthenticate = "www-authenticate",
  RetryAfter = "retry-after",
  CacheControl = "cache-control",
  Accept = "accept",
  ProxyMarker = "x-platform-proxy",
  LastEventId = "last-event-id",
  Allow = "allow",
  Host = "host",
  TransferEncoding = "transfer-encoding",
  ContentLength = "content-length",
  ContentType = "content-type",
  Origin = "origin",
  RequestId = "x-request-id",
  McpProtocolVersion = "mcp-protocol-version",
  McpMethod = "mcp-method",
  McpName = "mcp-name",
}

export enum HttpMethod {
  Get = "GET",
  Post = "POST",
  Patch = "PATCH",
  Delete = "DELETE",
}

export enum MediaType {
  OctetStream = "application/octet-stream",
  Pdf = "application/pdf",
  Png = "image/png",
  Jpeg = "image/jpeg",
  Json = "application/json",
  EventStream = "text/event-stream",
  Ndjson = "application/x-ndjson",
  Markdown = "text/markdown",
  PlainText = "text/plain",
}

export const PROXY_SECRET_SHOWN = "<proxy secret>";
export const DIGEST_ALGORITHM = "SHA-256";
export const ACCEPT_ANY = "*/*";
export const MEDIA_SUBTYPE_WILDCARD = "/*";
export const MEDIA_RANGE_SEPARATOR = ",";
export const MEDIA_PARAM_SEPARATOR = ";";
export const MEDIA_QUALITY_PREFIX = "q=";
export const BODY_MEDIA_TYPES: readonly MediaType[] = [MediaType.Json, MediaType.Ndjson];
export const EMPTY_BODY_LENGTH = "0";

export enum AuthScheme {
  Bearer = "Bearer",
}

export enum ApiVersion {
  V1 = "v1",
  V1Beta = "v1beta",
  V1Alpha = "v1alpha",
}

export enum ApiStability {
  Stable = "stable",
  Beta = "beta",
  Alpha = "alpha",
}

export const API_VERSION_STABILITY: Readonly<Record<ApiVersion, ApiStability>> = {
  [ApiVersion.V1]: ApiStability.Stable,
  [ApiVersion.V1Beta]: ApiStability.Beta,
  [ApiVersion.V1Alpha]: ApiStability.Alpha,
};
export const OPENAPI_STABILITY_KEY = "x-stability";

export enum Text {
  Empty = "",
  Newline = "\n",
}

export enum UnicodeForm {
  Nfc = "NFC",
}

export enum PathSegment {
  Parent = "..",
  Migrations = "drizzle",
  Home = "home",
  InMemoryDatabase = ":memory:",
}

export enum SecurityHeaderValue {
  CspNone = "'none'",
  FrameDeny = "DENY",
  NoReferrer = "no-referrer",
  Hsts = "max-age=31536000; includeSubDomains",
  NoSniff = "nosniff",
}

export const METHOD_NOT_ALLOWED_STATUS = 405;

export enum EndpointPath {
  OpenApi = "/openapi.json",
  Mcp = "/mcp",
  Events = "/v1/events",
  Stats = "/v1/stats",
  Metrics = "/v1/metrics",
}

export enum OpenApiLiteral {
  Version = "3.1.0",
  SecuritySchemes = "securitySchemes",
  BearerScheme = "bearerAuth",
  HttpType = "http",
  BearerKeyword = "bearer",
  JwtFormat = "JWT",
  DefaultResponse = "default",
  OkDescription = "Success",
  ErrorDescription = "Error",
  NotAcceptableDescription = "The Accept header names nothing this operation answers (ACCEPT_UNSUPPORTED)",
  UnsupportedMediaTypeDescription = "The Content-Type header names a body this operation does not read (CONTENT_TYPE_UNSUPPORTED)",
  RequestBody = "request body",
}

export const OPENAPI_DEFAULT_TITLE = "Capability Platform API";
export const OPENAPI_DEFAULT_VERSION = "1.0.0";
export const OK_STATUS = 200;

export enum McpContentType {
  Text = "text",
  ResourceLink = "resource_link",
}

export const MCP_SERVER_NAME = "capability-platform";
export const MCP_SERVER_VERSION = "1.0.0";

export enum McpEra {
  Stateless = "stateless",
  Reject = "reject",
}

export enum McpMethod {
  ToolsList = "tools/list",
  ToolsCall = "tools/call",
  ResourcesList = "resources/list",
  ResourcesRead = "resources/read",
  ServerDiscover = "server/discover",
  SubscriptionsListen = "subscriptions/listen",
}

export const MCP_PROTOCOL_VERSION = "2026-07-28";
export const MCP_META_KEYS = {
  protocolVersion: "io.modelcontextprotocol/protocolVersion",
  clientInfo: "io.modelcontextprotocol/clientInfo",
  clientCapabilities: "io.modelcontextprotocol/clientCapabilities",
} as const;
export const MCP_ACK_METHOD = "notifications/subscriptions/acknowledged";
export const MCP_UPDATED_METHOD = "notifications/resources/updated";

export enum HonoVariable {
  ParsedBody = "parsedBody",
}

export enum SkillFileName {
  Main = "SKILL.md",
  References = "references",
}

export const SKILL_BASE_URI = "skill://";

export const SKILL_DYNAMIC_RESOURCES = "dynamic";
export const SKILL_METADATA_KEY = "metadata";

export enum SkillMetaKey {
  Auth = "auth",
  Scopes = "scopes",
  Roles = "roles",
  Kinds = "kinds",
}

export enum SkillCapabilityId {
  List = "skills.list",
  Get = "skills.get",
}

export enum SkillPattern {
  Collection = "skills",
  Item = "skills/{skill}",
}

export enum SchemaIo {
  Input = "input",
  Output = "output",
}

export enum MountPath {
  Root = "/",
  CatchAll = "*",
}

export enum SseHeaderValue {
  NoCache = "no-cache",
}

export const DEFAULT_HTTP_VERSION = "1.1";
export const HTTP_VERSION_PATTERN = /^(\d(?:\.\d)?)/;
