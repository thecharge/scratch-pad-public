# @platform/auth

Provider-agnostic authentication.

- `createJwksProvider(options)` verifies JWTs from any issuer (issuer, audience, JWKS or injected keys). A token without an expiry is rejected.
- `resolveAuth(headers, { enabled, provider })` is the transport-neutral step both HTTP and MCP use. Only the `Authorization` header is read.
- `authMiddleware` is the Hono middleware; it never rejects, because the capability's auth mode decides.
- `metadataPath`, `challengeFor`, `unauthenticatedResponse`, `protectedResourceMetadataApp` implement RFC 6750 and RFC 9728.
- `principalFromAuthInfo` maps claims to a principal; the `admin` role grants the `admin` scope.
