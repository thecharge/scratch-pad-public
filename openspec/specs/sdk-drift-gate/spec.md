# sdk-drift-gate Specification

## Purpose
Block SDK drift through the hooks and verification command.
## Requirements
### Requirement: Drift is blocking
A check SHALL regenerate the SDK into a temporary directory and fail when it differs from the committed `packages/sdk/generated`.

#### Scenario: Stale generated code
- **WHEN** the OpenAPI baseline changes and the SDK is not regenerated
- **THEN** the check fails naming the differing files

#### Scenario: In sync
- **WHEN** generated code matches regenerated output
- **THEN** the check passes

### Requirement: Wired into hooks and verify
The check SHALL run as a pre-commit job and as a step of `bun run verify`, and `DEV_RULES.md` SHALL list it.

#### Scenario: Hook parity
- **WHEN** a fixture with a hand-edited generated file is checked
- **THEN** both the hook command and `verify` fail

#### Scenario: Rules row
- **WHEN** `DEV_RULES.md` is read
- **THEN** it contains a row for the drift gate with its hook and verify mapping
