## Context

Verified in the repository: API scenarios (`packages/kb-recorder/src/scenarios/index.ts`) run each step over HTTP and over MCP (`callers.ts`) and are rendered by `mdx.ts` with an ok/error label for the response. Console scenarios (`scenarios/ui.ts`, `ui/runner.ts`) check `expectVisible`, `expectHidden`, `forbidRequests` and `expectNoTokenInStorage` but the page renders only the step description and screenshot. `ScenarioStepSchema` carries `expectError` but no per-step checks or flag. The Walkthroughs sidebar group autogenerates from `kb`.

## Goals / Non-Goals

**Goals:**
- One result shape per step (description, flag, checks, evidence) for console, HTTP and MCP.
- Pages rendered only from that result.
- No hand-written behavior pages.

**Non-Goals:**
- New product features.
- Changing what the scenarios exercise, except adding checks they already perform.

## Decisions

- Add a `StepResult` Zod schema in `packages/types` (description, flag, checks list, evidence) used by both runners; the renderer takes only `StepResult[]`. Rationale: one rendering path means the flag cannot be hand-written.
- The flag is computed by the runner after the checks run. API and MCP steps record expected and actual outcome; console steps record each check and its result.
- Messages for labels and check wording go to `packages/messages`; no inline strings.
- Two documentation homes: `apps/docs` for client-facing product documentation, `docs/` for repository documents. A check fails when a development page is on the site.

## Risks / Trade-offs

- Development pages are moved, not deleted, so their content stays in the repository.
- More text per step makes pages longer. Accepted: the user asked for every step with flag and description.
