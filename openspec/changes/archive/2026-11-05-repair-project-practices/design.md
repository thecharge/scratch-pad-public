## Context

The initial full verification run passed every step except dprint. `openspec validate --all` passed 27 items, although the active streaming delta marks two absent requirements as MODIFIED. The base specs all retain archive-generated placeholder purposes. The proposal and SDK requirement also retain response envelopes explicitly withdrawn in the same change.

## Goals / Non-Goals

The repair makes OpenSpec records internally consistent and adds a repeatable gate for the specific semantic defects found. It records the assessment and preserves the streaming backlog and pre-existing working tree edits.

Completing the remaining streaming implementation, changing public protocols, and relaxing the development rules are outside this repair.

## Decisions

Use a local async check with the existing tooling helpers, constants and message catalog. It inspects main-spec purposes and requirement headings in active delta specs; it does not fetch external sources or depend on an unpinned global CLI during hooks. Continue running `openspec validate --all --strict` separately for the CLI's structural validation.

For MODIFIED and REMOVED operations, require an existing base heading. For ADDED operations, reject a heading that already exists in the base spec. For RENAMED operations, require an existing FROM target and an unused TO target. Archived changes are excluded because their deltas describe historical base versions.

Keep full existing requirement blocks when constructing the missing adapter and AIP deltas. Correct descriptions of withdrawn event envelopes using the user decisions already recorded in the streaming proposal and design. Artifact readiness, checked tasks and fresh implementation evidence remain distinct concepts.

## Risks / Trade-offs

Heading checks cannot prove that requirement prose matches code. Regression tests, full verification and the assessment's explicit remaining gaps provide separate evidence. Changes sharing a capability can still conflict when archived in sequence; the check must run again after each archive.

The working tree already contains generated documentation edits and untracked agent files. Preserve their content; apply formatting only where required by the existing formatter. Do not commit or push a mixture of that work and this repair without reviewing it.
