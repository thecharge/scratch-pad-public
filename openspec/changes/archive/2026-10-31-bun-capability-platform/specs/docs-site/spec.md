## ADDED Requirements

### Requirement: Astro Starlight docs app
The repository SHALL include an Astro Starlight app with sections for guides, API reference and KB.

#### Scenario: Build succeeds
- **WHEN** the docs app is built
- **THEN** it completes with no broken internal links

### Requirement: Generated API and MCP reference
The API reference SHALL be generated from the OpenAPI document, and MCP tools and skills SHALL be documented from the registry.

#### Scenario: Reference matches registry
- **WHEN** a capability is added
- **THEN** the next docs build lists it in the API and MCP reference

### Requirement: Code highlighting and Mermaid
Code blocks SHALL be syntax highlighted and Mermaid fences SHALL render as diagrams that follow the light or dark theme.

#### Scenario: Diagram renders
- **WHEN** a page contains a Mermaid fence
- **THEN** the built page renders an SVG diagram

### Requirement: Spell checked content
Docs content SHALL pass the cspell check in CI.

#### Scenario: Typo fails
- **WHEN** docs contain an unknown word not in the project dictionary
- **THEN** the spell check fails
