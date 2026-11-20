## Why

The user asked on 2026-11-05 to assess the project, its OpenSpec handling and development practices, and make fixes. The initial review found archive-invalid delta targets, withdrawn response formats still stated as requirements, placeholder purposes in every main spec, and no verification step for these OpenSpec defects.

## What Changes

- Record an assessment with commands, results and outstanding gaps.
- Assess the monorepo, infrastructure and initial product apps as the first phase of product development. Keep SQLite as the current persistence choice and separate current correctness and delivery gaps from later production operations.
- Correct the active streaming change's delta operations and response descriptions without expanding its requirements or claiming unfinished implementation is complete.
- Replace placeholder main-spec purposes with descriptions derived from their requirements.
- Add a blocking OpenSpec integrity check for purposes and delta requirement targets, with regression cases.
- Populate OpenSpec project context and artifact rules from the repository's instructions.
- Add project-local Codex command rules for routine inspection and verification, as requested by the user during the review, and validate representative allow and prompt decisions.
- Update the project skills to describe the check and distinguish validation from implementation proof.

## Capabilities

### New Capabilities

### Modified Capabilities

- `dev-standards`: enforce main-spec purposes and archive-compatible delta targets through hooks and verification.

## Impact

OpenSpec artifacts and configuration, tooling checks, the rule registry, hooks, unit tests and development skills. Product API behavior and the unfinished streaming implementation remain governed by `stream-all-responses`.
