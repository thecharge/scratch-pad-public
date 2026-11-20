# observability Specification

## Purpose
Provide redacted structured logs, correlated traces, metrics and administrator events without blocking Bun.
## Requirements
### Requirement: Structured logging with redaction
The system SHALL log with pino as JSON and SHALL redact sensitive paths using the list exported by the masking package.

#### Scenario: Token not logged
- **WHEN** a request with an Authorization header is logged
- **THEN** the log output contains the redaction token, not the credential

### Requirement: Bun-safe logging
The logger SHALL write synchronously without worker-thread transports, and the process SHALL exit cleanly with all log lines flushed.

#### Scenario: Clean shutdown
- **WHEN** the API receives SIGINT after logging
- **THEN** it exits within the configured shutdown timeout and no log line is lost

### Requirement: Traces and metrics
Each capability invocation SHALL create an OpenTelemetry span with attributes for capability id, transport, principal kind, policy outcome and cache hit, and SHALL record request count and latency metrics.

#### Scenario: Span attributes
- **WHEN** a capability is invoked over MCP
- **THEN** its span has transport `mcp` and the policy outcome

### Requirement: Log and trace correlation
Log records SHALL include trace and span ids.

#### Scenario: Correlated log
- **WHEN** a log line is written inside a capability span
- **THEN** it carries the active trace id

### Requirement: Event bus and stream
The system SHALL publish typed events (request, decision, error, cache) on an in-process bus and expose them through an authorized server-sent-events endpoint.

#### Scenario: Unauthorized stream
- **WHEN** a caller without the admin scope opens the stream
- **THEN** the request is rejected with 403
