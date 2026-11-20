# mcp-adapter Specification

## Purpose
Project capabilities through the SDK-backed MCP transport with authorization, discovery, caching and consistent errors.
## Requirements
### Requirement: SDK-backed Streamable HTTP endpoint

The system SHALL serve MCP through the official TypeScript SDK `createMcpHandler` mounted in Hono, answering the 2026-07-28 revision statelessly and, by default, the 2025 era through the SDK's stateless fallback, with both eras calling the same pipeline. The handler SHALL use its SSE response mode for Streamable HTTP responses. Progress SHALL use protocol notifications and event subscriptions SHALL use the protocol subscription mechanism, without wrapping ordinary tool results in application event envelopes.

#### Scenario: Modern request

- **WHEN** a client POSTs `tools/list` with `MCP-Protocol-Version: 2026-07-28` and `Mcp-Method` headers
- **THEN** the server answers without creating a session and the result has `resultType` `complete`

#### Scenario: Header mismatch

- **WHEN** the `MCP-Protocol-Version` header disagrees with the body `_meta` protocol version
- **THEN** the response is 400 with the header-mismatch error

#### Scenario: Legacy client

- **WHEN** a 2025-11-25 client connects
- **THEN** the same capabilities are available through the stateless fallback and GET or DELETE return 405

#### Scenario: Server discovery

- **WHEN** a client calls `server/discover`
- **THEN** the result lists supported versions and capabilities, including the skills extension, and carries `ttlMs` and `cacheScope`

#### Scenario: Origin check

- **WHEN** a request carries a disallowed `Origin`
- **THEN** the server responds 403

#### Scenario: Streamed tool response

- **WHEN** a supported client calls a tool over Streamable HTTP
- **THEN** the SDK handler returns the protocol result through SSE

### Requirement: Capability to tool projection
The system SHALL expose each eligible capability as an MCP tool whose `inputSchema` and `outputSchema` are derived from the capability's Zod schemas, with annotations derived from the AIP method kind.

#### Scenario: Tool call through pipeline
- **WHEN** a client calls `tools/call` for a capability
- **THEN** the call runs through the shared pipeline and returns `structuredContent` conforming to `outputSchema`

#### Scenario: Annotations
- **WHEN** a Get capability is projected
- **THEN** its tool has `readOnlyHint` true, and a Delete capability has `destructiveHint` true

### Requirement: Authorization-filtered listing
Tools SHALL be registered per request from the caller's authorization so `tools/list` returns only tools the caller may invoke, in deterministic order.

#### Scenario: Agent without scope
- **WHEN** an agent lacking the scope for capability C calls `tools/list`
- **THEN** C is absent from the result

### Requirement: Cache hints
Results of `server/discover`, `tools/list`, `resources/list` and `resources/read` SHALL include `ttlMs` and `cacheScope`, and lists that vary by caller SHALL use `private`.

#### Scenario: Per-caller list
- **WHEN** `tools/list` is answered for an authenticated caller
- **THEN** `cacheScope` is `private`

### Requirement: Resource-not-found code
A read of a non-existent resource SHALL return JSON-RPC error `-32602` and never an empty `contents` array.

#### Scenario: Missing resource
- **WHEN** a client reads an unknown resource URI
- **THEN** the error code is `-32602`

### Requirement: OAuth resource server behavior
The MCP endpoint SHALL publish Protected Resource Metadata at the RFC 9728 well-known path for its resource URI, containing `resource` and at least one `authorization_servers` entry, return `WWW-Authenticate` with `resource_metadata` on 401, validate token audience, and return 403 for insufficient scope.

#### Scenario: Metadata path
- **WHEN** the configured resource identifier is `https://api.example.com` and the MCP endpoint is `/mcp`
- **THEN** metadata is served at `/.well-known/oauth-protected-resource` and its `resource` equals `https://api.example.com`

#### Scenario: Path-bearing resource
- **WHEN** the configured resource identifier is `https://api.example.com/mcp`
- **THEN** metadata is served at `/.well-known/oauth-protected-resource/mcp`

#### Scenario: Authless tool
- **WHEN** a client calls a capability whose auth mode is `none` without a token
- **THEN** the call succeeds and no 401 is returned

#### Scenario: Missing token
- **WHEN** a request has no bearer token and the capability requires auth
- **THEN** the response is 401 with a `WWW-Authenticate: Bearer resource_metadata=...` header

#### Scenario: Token without expiry
- **WHEN** the verifier returns an `authInfo` without `expiresAt`
- **THEN** the request is rejected with 401
