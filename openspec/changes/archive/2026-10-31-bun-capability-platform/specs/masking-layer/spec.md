## ADDED Requirements

### Requirement: Independent masking middleware
The system SHALL provide a masking middleware, separate from policy, that transforms handler output according to an optional `mask` declaration on the capability.

#### Scenario: Field hidden
- **WHEN** a mask hides field `email` for a principal lacking the required scope
- **THEN** the output returned to that principal omits `email`

#### Scenario: No mask declared
- **WHEN** a capability declares no mask
- **THEN** the output is returned unchanged by this layer

### Requirement: Mask strategies
The masking layer SHALL support removing a field, replacing it with a fixed token, and partially redacting a string.

#### Scenario: Partial redaction
- **WHEN** a field is configured for partial redaction
- **THEN** only the configured visible portion remains in the output

### Requirement: Same masking on every surface
Masking SHALL apply identically to HTTP response bodies and MCP `structuredContent` and `content`.

#### Scenario: Parity
- **WHEN** the same principal calls a masked capability over HTTP and over MCP
- **THEN** the visible fields are identical

### Requirement: Shared sensitive-field definition
The set of sensitive field paths SHALL be exported for use by the logger redaction and the KB recorder.

#### Scenario: Log redaction uses mask paths
- **WHEN** the logger is configured
- **THEN** its redact list is derived from the masking package export
