# api-versioning Specification

## Purpose
Define versioned API paths and the documentation that explains each supported version.
## Requirements
### Requirement: Versioned paths per AIP
The API SHALL expose versions as path prefixes `v1`, `v1alpha` and `v1beta` as defined by AIP-185, with the stable major first, and a capability SHALL declare the version it belongs to.

#### Scenario: Stable version
- **WHEN** a capability is declared in `v1`
- **THEN** it is served under `/v1/` and appears in the OpenAPI document with that version

#### Scenario: Pre-release version
- **WHEN** a capability is declared in `v1beta` or `v1alpha`
- **THEN** it is served under `/v1beta/` or `/v1alpha/` and is marked as pre-release in the OpenAPI document and the docs

### Requirement: Versions are documented
The documentation SHALL state the available versions, their stability and the rules for change, and the OpenAPI reference SHALL be produced per version.

#### Scenario: Version page
- **WHEN** the site is built
- **THEN** a versions page lists each version with its stability and the capabilities in it
