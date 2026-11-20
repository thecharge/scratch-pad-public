# @platform/mcp-adapter

Serves every capability as an MCP tool at `/mcp` using the official TypeScript SDK (`createMcpHandler`, mounted in Hono through `createMcpHonoApp`, which brings DNS-rebinding and Origin protection). Both protocol eras are served by one handler; `era` chooses between `stateless` (the default, so 2025 clients keep working) and `reject`.

- A server instance is built for each request from the caller's `authInfo`, so `tools/list` already reflects who is asking: capabilities whose auth mode needs a token are left out for anonymous callers, and the injected visibility rule (policy lives in the composition root, not here) hides the rest.
- A tool's input and output schemas are the capability's own Zod schemas, so MCP and OpenAPI cannot drift. Annotations come from the AIP method kind.
- A token that is presented goes through the SDK's `requireBearerAuth` gate wired to the configured `AuthProvider`; a bad token is a 401 with the resource metadata challenge. No token means an anonymous caller, so authless tools stay callable.
- Tool failures are reported as `isError` results carrying the status and reason, never as protocol errors, and never with a payload.
- Cache hints on `tools/list` and `server/discover` are `ttlMs: 0` and `private`, because the list differs per caller.
- The server is built on the first request.
