# testing-and-kb Specification

## Purpose
Separate test tiers, prove transport parity and generate scrubbed knowledge pages only from passing scenarios.
## Requirements
### Requirement: Three test tiers
The repository SHALL have unit, integration and end-to-end test suites runnable independently with `bun test`.

#### Scenario: Tiers separate
- **WHEN** only unit tests are run
- **THEN** no network port or database is opened

### Requirement: Transport parity tests
Integration tests SHALL run each capability through both the HTTP and MCP adapters and assert equal decisions and data.

#### Scenario: Divergence caught
- **WHEN** one transport masks a field the other does not
- **THEN** the parity test fails

### Requirement: Narrative e2e scenarios
E2E scenarios SHALL declare a title, intent and steps and run against a started API.

#### Scenario: Scenario executes
- **WHEN** an e2e scenario runs
- **THEN** each step's request and response are captured

### Requirement: KB generation
The recorder SHALL emit MDX for each passing scenario into the docs content collection after masking and secret scrubbing.

#### Scenario: Secret scrubbed
- **WHEN** a captured exchange contains a bearer token
- **THEN** the emitted MDX contains a placeholder instead

#### Scenario: Failed scenario
- **WHEN** a scenario fails
- **THEN** no page is emitted for it and the run fails

### Requirement: Generated output scanned
CI SHALL scan generated MDX with the secret scanner.

#### Scenario: Leak blocks build
- **WHEN** the scanner finds a secret in generated MDX
- **THEN** CI fails
