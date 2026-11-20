# security-middleware Specification

## Purpose
Apply shared authentication, rate limits, response caching, security headers and origin validation in the pipeline.
## Requirements
### Requirement: Auth step in the pipeline
The pipeline SHALL call the `authentication` capability's provider for both transports according to each capability's `auth` mode, and tokens in the URL query SHALL be ignored.

#### Scenario: Token in query string
- **WHEN** a token appears in the URL query
- **THEN** it is ignored and the request is treated as unauthenticated

#### Scenario: Same verifier on both transports
- **WHEN** the same token is presented over HTTP and over MCP
- **THEN** both transports produce the same principal

### Requirement: Rate limiting
The system SHALL rate limit per principal and capability using limits from the capability's `rateLimit` block or a configured default, and SHALL return a resource-exhausted error with retry information when exceeded.

#### Scenario: Limit exceeded
- **WHEN** a principal exceeds the limit
- **THEN** the response is HTTP 429 with `status` `RESOURCE_EXHAUSTED`, a `Retry-After` header and the delay in `ErrorInfo.metadata`

#### Scenario: Same limit over MCP
- **WHEN** an agent exceeds the limit through `tools/call`
- **THEN** the call fails with a JSON-RPC error carrying the same reason and delay

### Requirement: Response caching
The system SHALL cache successful results of capabilities that declare `cache`, with a key that includes the principal's policy scope, and SHALL store results before masking.

#### Scenario: Cross-principal isolation
- **WHEN** principals with different scopes request the same cached capability
- **THEN** each receives output masked for their own scope

### Requirement: Security headers and origin validation
HTTP responses SHALL include configured security headers, and the MCP endpoint SHALL validate `Origin`.

#### Scenario: Headers present
- **WHEN** any HTTP response is produced
- **THEN** it carries the configured security headers
