## ADDED Requirements

### Requirement: Official MCP client tests
Tests SHALL start the real server and drive it with `@modelcontextprotocol/client` over Streamable HTTP for initialize, tools/list, tools/call and the skills methods.

#### Scenario: Tool call
- **WHEN** the client calls a books tool
- **THEN** the result matches the HTTP response for the same input

#### Scenario: Skills
- **WHEN** the client lists and reads skill resources
- **THEN** the documents returned match the registry

### Requirement: Inspector CLI tests
The official MCP Inspector (`@modelcontextprotocol/inspector`, dev dependency) SHALL run in CLI mode as a subprocess against the started server for tools/list, tools/call and the skills methods, and its output SHALL be asserted.

#### Scenario: Inspector tools/list
- **WHEN** the Inspector lists tools
- **THEN** the names equal the registered capability tools

#### Scenario: Inspector failure
- **WHEN** the Inspector calls a tool with invalid arguments
- **THEN** the error result is asserted and the subprocess exit is handled without hanging

### Requirement: Schema parity
For every capability, the MCP tool input schema and the OpenAPI request schema SHALL be equal, both derived from the same Zod definition.

#### Scenario: Divergence
- **WHEN** a tool schema differs from its OpenAPI schema
- **THEN** the parity test fails naming the capability

### Requirement: Manual agent harness
A documented procedure SHALL let Claude Code connect with `claude mcp add --transport http` and call the tools.

#### Scenario: Procedure
- **WHEN** the documented steps are followed
- **THEN** the agent lists and calls tools, with expected outputs recorded in the guide
