---
name: project-rules-and-hooks
description: Add or change a development rule, a check or a hook. Use when a rule needs enforcing, when check-rules fails, or when wiring a new job.
---

# Rules and hooks

`launchShippingCommand` forwards arguments directly to the process launcher with inherited stdout and stderr. Its injected process tests cover successful exits, nonzero exits and rejection; no shell or check bypass is introduced. Verification CLI dispatch has separate regression cases for actual push metadata and both delivery lanes.

The stack configuration validates configured RustFS credentials and requires a digest-pinned object-store image. Production requires its asset host explicitly. The object-store Caddy template preserves the Host header for S3 signatures and never embeds credentials. Its proxy route and runtime behavior are covered by the product stack cases. Bucket websites use a separate `sites` subdomain so enabling website routing does not intercept S3 requests. Publication grants anonymous GetObject only to the console and docs buckets; signing credentials are sent through stdin.

Per-suite and documentation-phase timing reports are diagnostic only. Explicit full verification remains unconditional; the separate document gate selects fresh applicable checks from a proven Git snapshot. Do not use a timing report as a reusable verification certificate.

Verification transforms the registered commands with `verificationCommands`: all phases use the shared checks container. The outer `check:run --stack` controller mounts the local engine socket and isolated temporary fixtures; nested checks execute inside it. Pre-commit and commit-message checks run in the shared container. The launcher forwards stdin and Git index and repository environment variables; staged formatting must preserve partial commits. The pre-push entry retains the canonical verification command. Never treat the launcher migration as permission to omit a registered check or bypass a hook.

Every rule in `DEV_RULES.md` is backed by blocking commit or push checks and by a step in `bun run verify`. The canonical push job invokes `bun run verify`; `check-rules.ts` recognizes that exact command as covering the individual verification steps. A renamed or changed command does not grant coverage. Comment cleanup and message checks retain their own jobs. Documentation builds and knowledge-base recording run at push, with documentation covered by the end-to-end phase. The jobs that test the checks themselves are covered by the `coverage` step. The `workflows` check fails when any file exists under `.github/workflows`. The `infra-files` check (`check-infra-files.ts`) rejects comments, address or port literals, and unpinned images.

## Adding a check

The audit verification command invokes `tooling/scripts/audit.ts`. It bounds attempts and retries only empty-output timeouts or the observed connection-closed audit failure. It retains the unfiltered audit and requires an actual successful result; findings and exhausted retries block the push.

The `untracked` job runs `check-untracked.ts` as the last verification phase at push, after coverage and documentation. It uses Git's NUL-delimited untracked listing with standard ignore rules, names every leftover file and fails when Git cannot inspect the repository. It never removes files. SDK crash logs are not ignored.

1. Write `tooling/scripts/check-<name>.ts` as exported functions with a thin entry; messages go in `packages/messages`, constants in `packages/constants`, shapes in `packages/types`.
2. Wire it in `packages/constants/src/tooling.ts`: `DevRule`, `HookJob`, `VerifyStep`, `VERIFY_COMMANDS`, `RULE_JOBS`, `JOB_VERIFY_STEPS`.
3. Add the job to `lefthook.yml` and a row to `DEV_RULES.md`.
4. Add unit tests with 2 positive and 2 negative cases.
5. Run `bun run tooling/scripts/check-rules.ts`: it fails if a rule has no job.

## Exceptions

Only in tool config files (`biome.json`, `cspell.json`, `knip.json`, `url-literals.json`, `async-ignore.json`), never inline.

`async-ignore.json` lists the files whose synchronous functions are allowed, each with a reason and a `maximum`; a file that was touched lists the functions by `names` with a reason for each name. `packages/streams/src/iterate.ts` is listed because the iteration protocol needs `Symbol.asyncIterator` to return the iterator at once. `check-async-functions.ts` fails a file that goes above its maximum and an entry whose maximum is larger than the synchronous functions left, so the list only shrinks. When you convert functions to async, lower or remove the entry. The console keeps its render-time functions synchronous (the providers, the configuration, the token store and the scope check that `App` calls while React renders) and says so per name. The store helpers that run inside `BoundedStore.update` (and the rate-limit window callbacks) stay synchronous by name so updates stay atomic. `message` (used while React renders and in constructors), the order-by comparator (`Array.prototype.sort` needs a synchronous comparator) stay synchronous too; `createSdkClient` is async and has no entry. `EventBus.subscribe` stays synchronous because the `StatsCollector` constructor calls it and a constructor cannot await. `createBetterAuth` stays synchronous for the same reason: `auth.cli.ts` exports the object for the better-auth command line.

## Example: the skill packages check

`check-skill-packages.ts` reads the skill directories (`SKILL_DIRS`, default `packages/skills/skills`) and fails a skill whose `SKILL.md` does not follow the skills format. Its wiring is the pattern to copy: `DevRule.SkillPackages`, `HookJob.SkillPackages`, `VerifyStep.SkillPackages`, the `skill-packages` job in `lefthook.yml` and a row in `DEV_RULES.md`.

## Async scripts

`check-rules.ts`, `check-async-functions.ts` and the other checks are async; a check exports `checkX(root)` that returns the exit code (`finish` in `tools.ts` prints the problems and the summary) and the file ends with `if (import.meta.main) process.exit(await checkX())`, so the unit suites cover it. `Promise.all` is forbidden by `check-promise-all.ts`: run parallel work with `all(tasks, limit?)` from `@platform/util` (the limit is `CONCURRENCY_LIMIT` through `concurrencyLimit` in `@platform/util`, default 8; a valid integer or an unset variable does not go through the zod parse; code that runs in the browser or in `@platform/config` imports `all` from `@platform/util/browser`, which has no environment access). The budgets of the metrics that the `e2e` and `coverage` steps check (`METRIC_BUDGET_*`, `LONG_RUNNING_OPERATIONS`) are in `packages/constants/src/observability.ts`; the check is `enforceMetrics` in `tooling/scripts/metrics-run.ts`. The constants for the checks (steps, rules, jobs, the bundle forbidden list, the files left out of coverage, the lines that are not code) are in `packages/constants/src/tooling.ts`. `check-package-graph.ts` fails a dependency cycle between workspace packages and a console bundle that contains the config loader, the util environment entry or `process.env`. `promise-all-ignore.json` lists the files that still use `Promise.all` (none do now, so the entries list is empty), each with a reason and a `maximum` that only goes down; lower or remove the entry when you replace a use. `filterAsync`, `flatMapAsync`, `someAsync`, `everyAsync`, `findAsync` and `reduceAsync` from `@platform/store` replace the array methods when a callback awaits.

`checkAsyncFunctions(root?)`, `checkPromiseAll(root?)` and `checkPackageGraph(root?)` return exit codes and take a fixture root; the coverage constants `COVERAGE_BLOCKING` (`true`: the coverage job blocks), `COVERAGE_EXCLUDED`, `COVERAGE_NON_CODE_LINE` and `COVERAGE_DECLARATION_SUFFIX` sit in `packages/constants/src/tooling.ts`. `run` in `tooling/scripts/tools.ts` drops the `GIT_` variables a hook sets when the command runs in another folder, so a fixture repository never touches the real one.

## Files

`verification-inputs.ts`, `verification-plan.ts` and `verification-report.ts` provide diagnostic impact plans, with contracts in `packages/types/src/verification.ts` and policy constants in `packages/constants/src/verification.ts`. Every plan entry still executes. Root tooling, shared packages, dependencies, infrastructure, application or test changes and unknown paths require full verification initially. A guide-only candidate never satisfies a mandatory check without the future evidence validator. Invalid cadence settings prohibit candidates; the pre-push hook still requires the full gate.

`check-openspec.ts` validates meaningful main-spec purposes and requirement targets in active delta specs. MODIFIED and REMOVED headings must exist, ADDED headings must be absent, and RENAMED operations need an existing source and unused destination. Archived deltas are excluded. The `openspec` job blocks pre-commit and verification; strict CLI validation remains a separate structural check. Neither check proves implementation completion.

`lefthook.yml`, `DEV_RULES.md`, `packages/constants/src/tooling.ts`, `tooling/scripts/check-rules.ts`.

## Tools shipped as a directory

A tool that needs files next to its binary (the Pulumi CLI and its language hosts) is listed in `BUNDLED_TOOLS` with its archive and checksum in `BUNDLE_RELEASES` (`packages/constants/src/tooling.ts`) and installed whole into `.tools/<tool>/` by `installBundles` in `apps/infra/src/tools.ts`; tools that are one binary stay in `INSTALLABLE_TOOLS`. Both installers share `tooling/scripts/download-tool.ts` for checksum verification before extraction.

`@platform/util` also holds `markdownTable` and `benchRows` (`packages/util/src/table.ts`), the shared table writer of the generated performance page and the benchmark table.

The documentation scope check rejects end-to-end and development reports on the public site, including generated reports. Performance, protocol verification and browser reports live under repository `docs/e2e`; generated status does not grant a scope exemption.

The explicit `bun run ship:fast` source lane retains all static and security checks plus all unit and integration tests. It caps independent verification jobs at four, prepares SDK jobs serially, and runs the untracked-file check last. Fast unit work uses SDK, other tooling, common product and console groups; integration files run separately with a four-process cap. Recorder module setup happens before case timers. No assertion or timeout changes. Normal pushes and `bun run verify` retain full E2E, coverage and documentation production. A fast run exceeding 55 seconds fails; report actual combined commit and push time and never claim a fresh full audit.

The pre-push job uses `use_stdin: true` and `PLATFORM_VERIFY_PUSH=1` to forward Git's actual proposed updates to `verification-push.ts`. The verifier records `.stack/verify/push.json` in both lanes. A single existing branch update supplies its old and new object IDs to full report-only planning. Missing, malformed, multiple-ref, new-ref, deleted-ref and non-branch updates cannot nominate one reusable range. Direct full verification reads no stdin. The metadata is diagnostic; it does not satisfy a check or enable evidence reuse.

The scenario workspace declares the scoped API and asset client bundle entry points in Knip. These files are executed inside isolated test containers; they remain analyzed rather than ignored.

The plain-language code-fence pattern matches line boundaries and paired fence lengths. Embedded Markdown inside recorded JSON remains code; prose after the closing fence is still checked.

`LLM_EVIDENCE_PATH` points to the active product change; the scripted harness check does not overwrite historical recordings. Automated checks never launch model clients or read provider credentials. Its end-to-end counterpart writes a separate evidence file.

Internal `tool:*` scripts name the actual CLI binaries used inside the checks container, keeping dependency discovery connected to their hook callers without an ignore list.

Coverage report glob constants include nested source LCOV and individual JUnit timings from isolated child consumers. `TEST_CHILD_REPORT_DIR_ENV` passes the parent report directory; recursive merging does not change the blocking coverage percentage or allow a failed child process to pass. Regression cases retain child reports while asserting that parent failures remain blocking.

The Promise.all gate shares one fresh source scan between violation and stale-exception checks within each invocation. It keeps all AST checks and exception limits, performs no cross-run caching and retains the original five-second unit deadline. The repository regression passed in 977 milliseconds and all twenty-six focused cases passed after a concurrent push exposed the duplicated scan.

The interface hook uses `check:run --stack`: its actual HTTP and MCP reads run through an isolated Caddy fixture. The full and fast controllers already provide that engine access. No interface assertion is removed. Dynamic recorder entries are analyzed explicitly by Knip.

The blocking push-only `sources` phase re-fetches every recorded primary source with a ten-second request deadline and bounded concurrency. Status, exact response SHA-256 and quoted passages must match. The source index inventories every authored Markdown file of the active change; new or changed prose needs a reviewed digest, and external references need the exact final sources table. Primary source captures are retained separately. Removing a required index fails. Unit cases inject responses and open no network. No model service is used.

Planner regression cases compare the complete ordered registered command list. Adding a mandatory phase must not leave an obsolete fixed command count or certify a plan with a missing phase. Real CLI cases run in explicit stack mode, matching their nested checks launcher.

The fast unit critical path uses two tooling groups within the existing four test workers. Full and fast discovery regression cases compare the complete flattened list, preserving each test exactly once. The measured single-group bottleneck was 54.9 seconds; timings remain evidence, not certificates.

The shared AST guard rejects scalar values and objects missing required node fields before invoking Zod. Every candidate node still passes the unchanged complete schema; malformed tags and ranges remain rejected. This avoids constructing schema errors for scalar metadata on each traversal and retains all rule walks and deadlines.

Reviewed document digests are refreshed after recording actual failed and repaired audit output. Updating local evidence does not refresh primary response hashes or certify a full run; the sources phase still re-fetches every authority.

Structure walks share validated child lists only within one freshly parsed source tree. Each rule still visits every node; separate invocations allocate separate weak maps. Promise.all traversal calls its member predicate only for member nodes. This removes repeated validation and await overhead without reusing previous verification results or changing deadlines.

The structure command parses each file once for errors and warnings, sharing only that fresh tree and its validated children. Combined-output regressions compare both results with independent calls. Hygiene predicates return immediately for node kinds they cannot match; every node is still visited.

Promise.all findings use an explicit depth-first work list, retaining source order and complete child validation while avoiding recursive promise and result-array allocation. The full repository scan retains its five-second test deadline.

Fast unit scheduling starts the two whole-repository scanner suites in their own process, within the same four-worker cap. SDK, common units, other tooling and console groups still run completely. Exact once-only discovery regressions cover full and fast grouping; this isolation retains scan deadlines under concurrent fixture allocation.

The browser-network repair evidence records observed kernel flags and actual audit failures; reviewing its document digest does not replace the fresh source gate or certify the remaining full audit.

Fast unit orchestration completes its initial scanner group before starting the other unit groups. The same unit files and assertions run exactly once; the rest keep the four-worker limit. Focused acceptance uses check:run --stack because the existing interface fixture needs the engine socket.

An earlier measured attempt completed SDK preparation and the full unit tier before the parallel phase. It retained all checks but exceeded the budget. The current partitioned schedule serializes only SDK preparation and scanner tests, then runs the remaining units and checks within the fixed worker limit.

The measured complete-unit serial attempt passed every check but exceeded the budget. The final fast schedule serializes SDK preparation and the unit-scans phase only; --fast-scans and --fast-rest form disjoint, complete partitions. The remaining units overlap integration and static checks. Entry forwarding, exact discovered-file union, empty intersection and scanner completion are regression tested. Both partitions are mandatory and failures in either block delivery. Normal unit commands and the full audit still run every unit in one invocation.

The delivery audit inventories every task and lists unproved requirements first. Keep full-audit evidence separate from reduced fast-lane evidence, including measured combined commit and push time. Rebuild the reviewed source index after authored evidence changes; a successful pipeline alone does not prove independent documentation byte identity.

Store page inventories as explicit file and sha256 fields. This keeps checksum metadata distinct from credential-shaped assignments without changing scanner rules. Save measured combined delivery time and compare local and remote main after push; gate time alone does not prove the user shipment limit.

The fast integration-only tier uses six workers; fast unit partitions retain four. Normal invocations remain serial and mixed fast tiers retain the four-worker unit limit. Entry tests cover flag order, integration selection, normal and mixed commands, partition forwarding and failing exits. All test files, deadlines and required checks remain unchanged.

When a live source digest changes, compare the complete old and fresh response before updating reviewed records. Retain the exact substitutions, status and passage checks as evidence. A stylesheet-only change or corrected specification link does not authorize automatic digest acceptance; changed contracts require implementation review. The source gate remains blocking.

The live interface assertion belongs to integration, with the same default five-second deadline; injected interface checker cases belong to unit. A failed tier blocks shipment even when every other phase and the combined time budget pass.

Documentation presentation evidence is reviewed separately from full acceptance. Approved guide placeholders never alter raw recordings or passing/failing checks. Fast shipment must pass every mandatory phase and the 55-second budget before delivery is claimed.

The checks launcher sets DPRINT_CACHE_DIR to the repository-owned .stack/check-cache/dprint directory. This retains compiled formatter plugins across disposable containers. Verification passes --incremental=false, so every configured file is checked each time; no previous formatting result satisfies the gate. Deleting this isolated plugin cache only makes the next run cold.

The checks launcher also caps dprint at sixteen formatting threads through DPRINT_MAX_THREADS. This bounds the formatter alongside unit and integration workers without changing file selection or comparison. Root paths with spaces and both formatter environment assignments are covered by launcher command tests.

Fast verification completes SDK and scanner preparation before starting the formatter, remaining units, integration and static checks in the same bounded four-job queue. This prevents formatter contention from delaying the scanner barrier. A completed formatter releases its slot; residue runs last. Every result and the original 55-second budget remain blocking.

Source shipment measurements include commit hooks, owned-index alignment and push. A passing 55-second gate does not prove the separate complete 60-second user limit; report both observed times.

Task evidence distinguishes complete guide repeatability from a failed overall coverage audit. Refresh reviewed document digests after recording those separate results; a passing phase does not override the failed full command.

Formatting verification checks comments in one read-only batch, then runs the complete non-incremental dprint check. Both results block delivery. Pre-commit retains comment cleanup. The per-file exec formatter was replaced to avoid starting a runtime for every source file; no prior result substitutes for either check.

The spelling exclusion for raw external evidence follows its existing source-capture scope under archived changes. Authored archived documents remain checked. Source delivery 3239414 passed commit and push in 50.190 seconds; retained proof is in openspec/changes/archive/2026-11-08-stream-all-responses/evidence/sources/10.2-delivered-fast-source.json.

When the user requests research before proposal review, complete selection research first and retain experiment capsules, counterexamples and limitations. Write concrete product decisions and implementation acceptance tasks, then push the proposal for review when authorized. Do not turn that request into a proposal to research later or begin implementation before the requested review.

When specifying optimized document shipment, distinguish the proposed policy from implemented hooks. Classify actual staged snapshots and complete push ranges, protect partial staging, require trusted generated-document producer fingerprints and broaden unknown/tooling changes. Retain failed infrastructure experiments and current revocation counterexamples; successful schema/reference probes never prove deployed production controls.

Document shipment uses document-scope.ts and document-index.ts to classify the actual index or proposed existing-branch push range, including both rename paths. It requires clean byte-for-byte index/worktree equality, ordinary tracked flags and supported non-executable document modes. Unknown, generated, evidence, instruction and tooling paths broaden. New or ambiguous refs broaden. document-shipping.ts checks the exact registered command inventory, runs every applicable document/security/source/repository phase afresh, runs residue last and compares the snapshot again. Missing or altered commands, failed checks, changed snapshots and budget breaches fail. No prior report certifies a check. Explicit verify remains full; generated-producer certification and cadence accounting remain open product tasks.

check-document-links.ts parses CommonMark links, images and reference definitions and validates repository-local targets and GitHub-style heading fragments. Escaping paths, unsafe schemes, missing files and missing fragments fail. Raw evidence and immutable archives retain their existing provenance scope. Client MDX/site navigation remains checked by the full documentation build.
