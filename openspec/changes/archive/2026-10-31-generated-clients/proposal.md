## Why

A previous hand-built SDK attempt was rejected and removed. A hand-written client drifts from the API it describes, which is the exact failure this platform exists to prevent. The platform already produces a mandatory OpenAPI 3.1 document (committed baseline `openapi/baseline.json`, refreshed by `bun run openapi:update`), so the client SDK must be generated from it. MCP behavior must also be proven with real, installed MCP clients rather than only in-process adapters.

## What Changes

- New workspace package `packages/sdk` whose client, operation functions and Zod schemas live under `generated/` and are produced by `@hey-api/openapi-ts` through `bun run sdk:generate`.
- A tiny hand-written wrapper: auth token injection, error mapping to AIP-193 ErrorInfo reasons, async pagination helper, long-running-operation wait helper.
- A blocking drift gate (pre-commit job and `bun run verify` step) failing when committed generated code differs from regenerated output.
- SDK integration tests against a real `Bun.serve` of `apps/api` `createApi` for every capability.
- MCP verification with the official `@modelcontextprotocol/client` and the official MCP Inspector CLI (`@modelcontextprotocol/inspector`, dev dependency, subprocess), plus a documented manual Claude Code harness and an MCP-versus-OpenAPI schema parity check.
- Docs site SDK guide and MCP-client guide with Mermaid diagrams, package README, a `DEV_RULES.md` row; the generated reference stays generated.

## Capabilities

### New Capabilities
- `generated-sdk`: generated typed client and the minimal wrapper
- `sdk-drift-gate`: blocking regeneration check
- `real-mcp-client-verification`: real client and Inspector tests, schema parity, manual harness
- `client-documentation`: SDK and MCP-client guides, README, rules row

### Modified Capabilities

None. The existing change `bun-capability-platform` is not edited.

## Impact

- New package `packages/sdk`, new dev dependencies (`@hey-api/openapi-ts`, `@modelcontextprotocol/client`, `@modelcontextprotocol/inspector`).
- Changes to lefthook, `verify`, `DEV_RULES.md`, docs site and knip config.
- Generated code is excluded from the no-comment and no-inline-string lint rules only through reviewed ignores; the wrapper is fully subject to them.
