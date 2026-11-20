export enum AuthMode {
  None = "none",
  Optional = "optional",
  Required = "required",
}

export enum AuthProviderKind {
  BetterAuth = "better-auth",
  Jwks = "jwks",
}

export enum PrincipalKind {
  Anonymous = "anonymous",
  User = "user",
  Agent = "agent",
}

export enum Scope {
  Read = "read",
  Write = "write",
  Admin = "admin",
}

export enum TransportKind {
  Http = "http",
  Mcp = "mcp",
}

export enum PolicyOutcome {
  Allow = "allow",
  Deny = "deny",
}

export enum PolicyReason {
  Allowed = "allowed",
  KindNotAllowed = "kind_not_allowed",
  MissingScope = "missing_scope",
  MissingRole = "missing_role",
}

export enum MaskStrategy {
  Remove = "remove",
  Replace = "replace",
  Partial = "partial",
}

export enum CacheScope {
  Public = "public",
  Private = "private",
}

export enum ClaimName {
  Subject = "sub",
  Scope = "scope",
  ScopeList = "scp",
  Roles = "roles",
  Role = "role",
  Groups = "groups",
  ClientId = "client_id",
  AuthorizedParty = "azp",
  Audience = "aud",
  Issuer = "iss",
  Expiry = "exp",
  PrincipalKind = "principal_kind",
}

export enum Role {
  Admin = "admin",
}

export enum JwtAlgorithm {
  EdDSA = "EdDSA",
  ES256 = "ES256",
}

export enum AuthParam {
  ResourceMetadata = "resource_metadata",
  Error = "error",
  ErrorDescription = "error_description",
  Scope = "scope",
}

export enum OAuthErrorCode {
  InvalidToken = "invalid_token",
  InsufficientScope = "insufficient_scope",
}

export const PROTECTED_RESOURCE_WELL_KNOWN = "/.well-known/oauth-protected-resource";
export enum BearerMethod {
  Header = "header",
}

export enum ConfigField {
  JwksUrl = "jwksUrl",
}

export enum AuthVariable {
  Principal = "principal",
  Resolution = "authResolution",
}

export enum BetterAuthPath {
  TokenEndpoint = "/token",
  LoginPage = "/login",
  ConsentPage = "/consent",
  Base = "/api/auth",
  Mount = "/api/auth/*",
  Jwks = "/jwks",
}

export enum SqliteProvider {
  Sqlite = "sqlite",
}

export enum OidcScope {
  OpenId = "openid",
  Profile = "profile",
  Email = "email",
  OfflineAccess = "offline_access",
}

export enum CimdProfile {
  Mcp20260728 = "mcp-2026-07-28",
}

export const MASK_REPLACEMENT = "***";
export const MASK_CHARACTER = "*";
export const DEFAULT_VISIBLE_CHARS = 0;

export enum SensitivePath {
  Authorization = "req.headers.authorization",
  Cookie = "req.headers.cookie",
  Token = "token",
  AccessToken = "accessToken",
  RefreshToken = "refreshToken",
  Password = "password",
  Secret = "secret",
}
