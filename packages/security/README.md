# @platform/security

Hono middleware. `securityHeaders()` sets a restrictive set for a JSON API (CSP `default-src 'none'`, no framing, no referrer, nosniff, HSTS). `originValidation({ allowedOrigins, domain })` rejects browser requests from other origins with an AIP-193 `PERMISSION_DENIED`; requests without an `Origin` header pass.
