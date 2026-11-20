# real-mcp-client-verification Specification

## Purpose
Verify MCP behavior and schema parity through official clients, the inspector and a manual agent harness.
## Requirements
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
The project SHALL test its agent harness using deterministic stubs and scripted MCP clients. Automated checks SHALL NOT launch an LLM client, call a model inference endpoint, read model-provider credentials or cause model token usage or cost. Scripted proxy acceptance SHALL use the official MCP client through Caddy and identify its recordings as scripted. Harness unit tests SHALL inject execution, recording and cleanup dependencies.

#### Scenario: Scripted proxy acceptance
- **WHEN** the harness acceptance command runs
- **THEN** a deterministic client checks the product through Caddy without model inference and records scripted client exchanges

#### Scenario: Stubbed failure handling
- **WHEN** an injected executor or recorder fails
- **THEN** the harness reports failure, performs cleanup and makes no model request
