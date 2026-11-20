# @platform/auth-better-auth

Better Auth as the shipped authentication provider, running on Bun.

- `createBetterAuth(auth, database, schema?, flags?)` wires the JWT plugin (EdDSA, JWKS), the MCP authorization server profile bound to the configured resource, CIMD client identity and the admin plugin. `/token` is disabled and dynamic client registration stays off. Only users with the `admin` role can create or configure OAuth clients.
- `createBetterAuthProvider(auth, config)` verifies the tokens it issues; keys reload once when a token names an unknown key id.
- `betterAuthApp(auth, trustedOrigins)` mounts the handler on Hono with explicit-origin CORS.
- Generate the Drizzle schema with `bun x --bun auth@latest generate --config ./auth.cli.ts`.

The integration tests run against a real `Bun.serve` instance.
