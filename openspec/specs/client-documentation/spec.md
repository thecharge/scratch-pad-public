# client-documentation Specification

## Purpose
Provide client guides while keeping API and SDK reference documentation generated from their sources.
## Requirements
### Requirement: Guides
The docs site SHALL include an SDK guide and an MCP-client guide, each with a valid Mermaid diagram, and the package SHALL have a README.

#### Scenario: SDK guide
- **WHEN** the guide is built
- **THEN** it covers generation, drift gate, wrapper helpers and usage, and the diagram passes the Mermaid check

#### Scenario: MCP guide
- **WHEN** the guide is built
- **THEN** it covers the official client, Inspector CLI and the Claude Code harness

### Requirement: Generated reference stays generated
The existing generated reference SHALL remain generated and SHALL NOT be hand-edited.

#### Scenario: Docs build
- **WHEN** the docs build runs
- **THEN** it succeeds and the reference is unchanged unless the capabilities changed
