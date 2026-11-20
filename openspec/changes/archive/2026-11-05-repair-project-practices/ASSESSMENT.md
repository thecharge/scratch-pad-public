# Project assessment

Assessment date: 2026-11-05. Scope clarified by the user: this is the first phase, establishing infrastructure, the monorepo and initial product apps. SQLite was added to support product development. Replacing it, adding distributed infrastructure or requiring a full production operations platform is outside this assessment's immediate recommendations.

The project is a credible foundation with a useful capability architecture and substantial automated checks. Phase-one delivery remains incomplete: the API container and proxy exist, but the development environment, packaged runtime and test topology do not yet represent all the apps consistently. The next work should close that loop and address demonstrated correctness defects before extending infrastructure scope.

## Findings for this phase

| Priority | Finding | Evidence and consequence | Next proof |
| --- | --- | --- | --- |
| High | Development and delivery topology is unfinished | `apps/infra/src/plan.ts` creates API and proxy containers, plus Dex in test. It creates no console, docs or test runner container. `package.json` calls host scripts for verification and the test tiers. Streaming tasks 6.7, 6.9, 6.11 and 9.1 remain open. | Start all initial apps using the documented development command; edit each app and observe reload through the proxy; run the required suites in that topology. |
| High | Packaged skills are omitted from the API image | `apps/infra/containers/api/Containerfile` copies the bundle, factual URLs and migrations. `DEFAULT_SKILL_DIRS` points to `./packages/skills/skills`, which is absent from that image. `directories` in `packages/skill-protocol/src/package.ts` converts a missing directory to an empty catalog. This predicts silent loss of package skills in the image; an image-level catalog check has not been run. | Compare the package skill catalog of the built image with the source-run catalog. Include required runtime assets and assert their presence. |
| High | Concurrent updates can both accept the same ETag | An isolated probe of `updateBook` with `fakeDeps` accepted both concurrent writes using the same original ETag; the final title was `second`. `change` reads and checks before `DrizzleBookRepository.save` writes by name alone. The probe demonstrates a handler-level race; a concurrent SQLite integration reproduction is still needed. | Add a deterministic concurrent-write regression and an atomic expected-version write; require one winner and one ABORTED response. Keep SQLite. |
| Medium | Batch atomicity is implemented with compensation | `batchCreateBooks` uses `atomically` from `packages/aip/src/lifecycle.ts`, inserting records individually and deleting them on failure. The SQLite repository offers no batch transaction contract. This is not a database transaction: intermediate records can be observed and undo can fail. These failure modes were identified from code, not crash-tested. | Prove that a failed batch exposes no partial committed state using a transaction appropriate to the existing SQLite repository. |
| Medium | Tests do not yet prove the complete delivered path | `testing/e2e/api/custom-capability.test.ts` starts `createApi` with `startServer`; `runTier` spawns host Bun processes. Stack protocol tests add useful proxy proof, but do not turn every app and SDK scenario into a packaged runtime test. | One smoke suite should boot the delivered app images and exercise API, SDK, console, docs, auth and package skills through the proxy. |
| Medium | Some streaming requirements remain unfinished | The open task record includes assets, MCP Tasks and progress, proxy-based API/SDK/MCP/UI scenarios, documentation repeatability and final audit. A passing current suite does not complete those requirements. | Keep `stream-all-responses` open and deliver its remaining tasks in small verified batches. |
| Medium | Small response pages do not bound underlying work | `DrizzleBookRepository.list` loads every row for a parent; `listBooks` filters and sorts before pagination. `readBody` uses `request.text`, and NDJSON collection input is accumulated with `Array.fromAsync`. Streaming transport alone does not bound application memory. No load failure was reproduced. | Measure realistic product collection sizes and request budgets before optimizing. Add database pagination or explicit limits where measurements require them. |

## Development and delivery practices

The strongest choices are one capability definition, a shared security pipeline, generated OpenAPI and SDK, an SDK install-and-typecheck suite, scenario-driven documentation, pinned images and tools, and local hooks that run blocking checks. These reduce drift between the product's surfaces. `bun audit` in the current full run reports no vulnerabilities; this is dependency evidence, not a security audit.

The checks concentrate heavily on source form and coverage. Two positive and two negative cases and 100% measured lines/functions do not establish concurrent-write correctness, packaged asset completeness or deployment correctness. The confirmed ETag race and missing production auth configuration pass the existing plan and unit assertions. Add those behavioral proofs rather than increasing style restrictions or replacing the persistence layer. Branch coverage remains outside scope by the user's decision.

Async declarations also do not prove that work avoids blocking: `createDatabase` calls Bun SQLite and Drizzle migration APIs inside an async function. Treat performance as a measured property. Do not expand this into a database migration project without product evidence.

The streaming change has 53 tasks across protocols, infrastructure, assets, metrics, documentation and delivery, with several tasks containing long partial-progress narratives. Preserve the requirements, but use concrete acceptance examples and smaller delivery batches so task status remains reviewable. Some checked task descriptions still contain historical “not done” passages; avoid deriving readiness from counts alone.

GitHub workflows are deliberately disabled. That is the current workflow, not a defect to reverse. The local release proof should identify the tested commit or working tree and resulting app images. The current stack rebuilds local mutable image tags and removes replaced images; no promotion and rollback proof was found in the inspected delivery code.

## Later production considerations

These are future readiness work or limitations to document, not reasons to reject SQLite or block initial product development.

| Area | Observed state | Appropriate timing |
| --- | --- | --- |
| Production configuration | An isolated `planFor` to `loadConfig` probe rejects the generated production API environment with `BETTER_AUTH_SECRET: required`. The plan supplies no production provider, issuer, audience or secret settings. | Fix before advertising or using `stack:up production`; it is not a reason to change the development auth design. |
| Restart semantics | A new `OperationStore` cannot retrieve an operation created by another instance: `OPERATION_NOT_FOUND`. Operations, request IDs, rate limits, caches and pagination signing state are held in process memory. | Decide and document restart guarantees before product use requires durable background work or retry guarantees. No distributed store is required merely for phase one. |
| Recovery | Database files use local bind mounts and migrations run when the database opens. No backup/restore or migration rollback proof was found in the inspected app, infrastructure and developer docs. | Establish recovery expectations and a restore drill before retaining valuable data. |
| Container lifecycle | The Pulumi container arguments inspected in `apps/infra/src/apply.ts` declare no restart policy, health check or resource budget. The CLI polls readiness during startup. Host defaults and reboot behavior were not inspected or tested. | Add the chosen lifecycle behavior when a persistent deployment is needed, and prove restart and shutdown behavior in that environment. |
| Monitoring | `startApi` creates telemetry with no processors or readers; local admin metrics exist. No external telemetry exporter or alerting setup was found in the inspected startup and stack code. | Choose operational monitoring when there is an environment and an operator to consume it. |
| Public addresses | All four factual public URLs are empty, an explicit open user decision. | Populate at deployment time. Do not invent domains. |

## Evidence and limits

The assessment repaired four record defects: all 26 main-spec purposes were placeholders; the streaming dev-standards delta used MODIFIED for two requirements absent from the base; its proposal named HTTP, AIP and MCP changes without corresponding deltas; and the proposal and SDK requirement retained withdrawn response-envelope descriptions. The changes in `openspec/specs`, `openspec/changes/stream-all-responses` and `openspec/config.yaml` correct those records without completing the streaming backlog. The new `tooling/scripts/check-openspec.ts` gate checks purposes and active requirement targets, with 20 regression cases in `testing/unit/tooling/openspec.test.ts`. Its hook and verification mappings are tested separately. Structural validation and target checks do not prove that product behavior meets a requirement.

Initial `git status --short --branch` showed main aligned with origin, existing generated documentation and screenshot changes, the partial integrity check and its wiring, and untracked `.agent`, `.codex` and repair-change files. This assessment preserves that work. No commit, push or production deployment has been made.

The previous verification log `/tmp/scratch-pad-review-verify.log` ended with `FAILED: dprint`; every other step passed. Its slowest steps were e2e 436.3 seconds, coverage 89.9 seconds, docs 72.3 seconds and kb 20.4 seconds. This is prior-run evidence, not proof of the current tree.

Fresh checks observed during this assessment:

- `bun test testing/unit/tooling/openspec.test.ts`: 20 pass, 0 fail after fixing the missing changes-directory case. Final checks remain recorded below.
- `bun run typecheck`: exit 0.
- `openspec validate --all --strict`: 28 passed, 0 failed before archival.
- `bun run tooling/scripts/check-openspec.ts`: valid purposes and active delta targets.
- `codex execpolicy check --rules .codex/rules/project.rules bun run verify`: allow; checks for `git reset --hard` and `bun run stack:prune`: prompt. These commands evaluate rules without executing the proposed operations.
- Production-config probe: create the production environment with a placeholder proxy marker, set a placeholder public host, build its plan and pass the API container's `env` to `loadConfig`; output `{"result":"production config rejected","issues":[{"variable":"BETTER_AUTH_SECRET","code":"required"}]}`. No service was started.
- Concurrent-update probe: create `fakeDeps([sampleBook("b1")])`, build `updateBook`, invoke its handler twice through bounded `all` with titles `first` and `second` and the original ETag; both returned accepted, final title `second`. This uses an in-memory repository, not the SQLite integration path.
- Operation-store probe: call `start` on one store and `get` on a fresh store; output `OPERATION_NOT_FOUND`. This establishes instance-local state; it is not a process-kill recovery test.

The assessment verification run in `/tmp/scratch-pad-assessment-verify.log` finished with exit 1: `FAILED: biome, cspell`. All other steps passed, including end-to-end tests, generated documentation and coverage: 264 product files have 100% of measured lines and functions. Formatting in two changed files and the spelling issue were corrected after their phases ran, so that run is not a green delivery proof.

On resumption, the focused OpenSpec and rule registry suites passed 66 tests with no failures, strict validation passed all 28 items, and explicit changed-files skill freshness passed including `project-self-update`. The integrity, rule registry and agent knowledge checks passed. The command policy again returned allow for verification and prompt for reset and stack pruning; these evaluations did not execute the example operations. Final full verification is recorded below when complete.

The first resumed full run in `/tmp/scratch-pad-assessment-final-verify.log` exited 1 for spelling only: three words in the handoff file added at the end of the previous session. All other verification steps passed. The handoff wording was corrected and focused spelling then checked all five repair Markdown files with zero issues. A second full run uses `/tmp/scratch-pad-assessment-green-verify.log`.

Final full verification exited 0: `All 40 checks passed.` Coverage reports 264 product files with 100% of measured lines and functions. End-to-end verification took 523.6 seconds, documentation 131.9 seconds and coverage 101.5 seconds. The run exercised the working tree, including existing generated documentation changes; those unrelated artifacts are preserved separately from the repair's delivery files. The repair was then archived as `2026-11-05-repair-project-practices`, adding one integrity requirement to dev-standards. The unfinished streaming change remains open.

After archive, strict OpenSpec validation passed all 27 remaining active items, the integrity check passed, whitespace checks passed, and live status showed streaming as the only open change at 29 of 53 tasks. The repair's eight completed tasks are preserved in its archive.

External references checked on 2026-11-05: [SQLite isolation](https://www.sqlite.org/isolation.html) describes transaction isolation, and [Podman run](https://docs.podman.io/en/latest/markdown/podman-run.1.html) documents container lifecycle options. The findings above come from repository reads and probes; they do not assume Docker runtime behavior for Podman.

## Next delivery order

1. Finish this assessment and integrity-check repair with recorded verification.
2. Complete the local app loop: API, console and docs in the intended stack, reliable reload, logs and reset, and consistent documented commands.
3. Verify the built app artifacts, including migrations, skills and auth configuration, through the proxy.
4. Fix concurrent writes and batch transaction guarantees in the existing SQLite implementation with focused regressions.
5. Finish the agreed protocol and product tasks in the streaming change, keeping optional production operations separate.
