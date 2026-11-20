## ADDED Requirements

### Requirement: OpenSpec records have meaningful purposes and applicable deltas

Every main spec SHALL have a non-empty Purpose section without a TBD placeholder. A blocking check in pre-commit and `bun run verify` SHALL validate requirement targets in every active change against the current main specs. MODIFIED and REMOVED targets SHALL exist; ADDED targets SHALL be absent; RENAMED operations SHALL name an existing source and an unused destination. Diagnostics SHALL name the file and invalid target. Archived changes SHALL be excluded.

#### Scenario: Meaningful purpose and applicable modification

- **WHEN** a main spec describes its purpose and an active delta modifies an existing requirement
- **THEN** the integrity check passes

#### Scenario: Placeholder purpose

- **WHEN** a main spec has an empty or TBD purpose
- **THEN** the integrity check fails and names the spec

#### Scenario: Missing modification target

- **WHEN** a delta marks a requirement absent from the main spec as MODIFIED
- **THEN** the integrity check fails and names the delta and requirement

#### Scenario: Duplicate addition

- **WHEN** a delta adds a requirement already present in the main spec
- **THEN** the integrity check fails and names the duplicate target

#### Scenario: Invalid rename

- **WHEN** a rename names an absent source or an existing destination
- **THEN** the integrity check fails and names the target

#### Scenario: Historical delta

- **WHEN** an archived delta targets a requirement absent from the current main spec
- **THEN** the integrity check excludes that archived delta
