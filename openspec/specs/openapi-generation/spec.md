# openapi-generation Specification

## Purpose
Generate and serve OpenAPI from capabilities, preserving authentication, public routes, schema parity and breaking-change checks.
## Requirements
### Requirement: Generated OpenAPI 3.1 document
The system SHALL generate an OpenAPI 3.1 document from the capability registry, with no hand-written path definitions.

#### Scenario: Document validates
- **WHEN** the document is generated
- **THEN** it declares `openapi: 3.1.0` and passes an OpenAPI validator

#### Scenario: Capability appears
- **WHEN** a capability is registered
- **THEN** its path, schemas, security requirement and examples appear in the document

### Requirement: Security schemes from auth modes
The document SHALL declare an HTTP bearer scheme with `bearerFormat` JWT, SHALL attach a `security` requirement only to capabilities whose auth mode is `required`, and SHALL mark `optional` capabilities with an empty alternative.

#### Scenario: Authless operation
- **WHEN** a capability's auth mode is `none`
- **THEN** its operation has no `security` requirement

#### Scenario: Required operation
- **WHEN** a capability's auth mode is `required`
- **THEN** its operation lists the bearer scheme

### Requirement: Public custom-method paths
The document SHALL describe custom methods with their public `:verb` paths, not the internal rewritten paths, and SHALL map field behavior to `readOnly` and `writeOnly`.

#### Scenario: Archive path
- **WHEN** the archive capability is documented
- **THEN** the path is `/v1/publishers/{publisher}/books/{book}:archive`

#### Scenario: Output-only field
- **WHEN** a field is `OUTPUT_ONLY`
- **THEN** its schema has `readOnly: true`

### Requirement: Self-served document
The API SHALL serve its generated document at a documented endpoint.

#### Scenario: Fetch spec
- **WHEN** a client requests the OpenAPI endpoint
- **THEN** the current document is returned

### Requirement: Breaking-change gate
CI SHALL compare the generated document with the last released one and fail on breaking changes within the same major version.

#### Scenario: Removed field
- **WHEN** a response field is removed in v1
- **THEN** the oasdiff check fails the build

### Requirement: MCP schema parity
MCP tool schemas and the OpenAPI schemas SHALL derive from the same Zod definitions.

#### Scenario: Schema drift test
- **WHEN** a capability schema changes
- **THEN** both the OpenAPI and MCP outputs change in the same build
