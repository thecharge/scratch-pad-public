---
name: project-setup-and-verify
description: Install the project, run every check, and understand a failing hook. Use when setting up, when `bun run verify` fails, or when a commit or push is rejected.
---

# Setup and verify

The executable verification entry calls `verificationEntry`, which records proposed push updates before selecting the full or fast executor. Regression cases inject both executors and metadata recording; direct verification needs no stdin, and either lane propagates a failing exit code.

## Commands

- `bun install`: dependencies and the lefthook git hooks.
- `bun run tools:install`: the pinned gitleaks and oasdiff binaries, checksum verified.
- `bun run verify`: every check over the whole repository. It runs all steps even if one fails, so one pass shows every problem. It takes several minutes: run it in the background and watch the output.
- `bun run verify:plan [base-commit head-commit]`: write and print a report-only impact plan. Both IDs must be exact commits. Every mandatory check still executes at push; a candidate is not accepted evidence or a reused result.
- `bun run typecheck`, `bun run lint`, `bun run format`, `bun run spell`: single checks.

These single checks and `bun run test:unit` run through `apps/infra/src/runner.ts`. For a focused command use `bun run check:run bun test <files>` or `bun run check:run <executable> [arguments]`. Podman must be available. The runner builds its pinned image when the Containerfile hash has no matching local tag, streams output, preserves the repository's absolute path and uses the caller's UID and GID. It shares the installed dependency tree and never falls back to host execution.

`verificationCommands` wraps verification phases with the same launcher. End-to-end and coverage run in the `check:run --stack` controller with the local engine socket and isolated temporary fixtures; pre-commit and commit-message commands now run in the shared container, with stdin and the Git index preserved. Application runtime image audits and container execution are proved in task 6.7. No mandatory phase is omitted.

## Hooks

Full verification first saves `.stack/verify/plan.json`, accounting for every command with an input fingerprint and execution decision. A single existing branch push supplies the actual Git hook range; direct full execution reports `missing-range`; dirty inputs, unresolved symbolic dependencies and unknown paths are conservative full-run reasons. This first planner hashes tracked and non-ignored untracked files, modes and inventories. It does not yet certify environment, installed dependencies or generated artifacts, so evidence reuse remains disabled. The fixed initial cadence defaults are five fast attempts or 24 hours, validated in the report; accounting and enforcement are still pending.

Detailed timings live in `.stack/verify/e2e-suites.json`, `docs-phases.json` and `coverage-groups.json`. The first records end-to-end suites, metrics and total documentation production; the second breaks documentation into phases; the third records coverage groups. Read them alongside `steps.json` to identify repeated work. They contain diagnostic results, not permission to skip checks; the report-only impact planner does not select checks.

The audit step runs `tooling/scripts/audit.ts`: at most three unfiltered `bun audit` attempts, each bounded by `timeout -k 5 60`. Only an empty-output timeout or the observed `ConnectionClosed: audit request failed` transport error is retried, with one then two seconds of delay. Findings, other failures and exhausted retries block delivery. The `timeout` executable is required; a missing executable fails the check.

The final verification phase checks for untracked files, including artifacts left by any preceding phase. A Git inspection failure also blocks delivery. Stage intended new files before delivery; the check preserves all files for review.

The `openspec` step runs `check-openspec.ts` for main-spec purposes and active delta requirement targets. Run `openspec validate --all --strict` separately for CLI structural validation; planning artifacts alone do not prove implemented behavior.

`lefthook.yml` defines three stages. Pre-commit runs staged checks without building documentation or recording the knowledge base; commit-msg runs commitlint and cspell on the message. Pre-push invokes the complete `bun run verify` pipeline once. Use focused checks during development instead of repeating a full run before push. End-to-end already builds and browser-checks the documentation, so verification does not invoke a second docs build. The coverage step runs the unit and integration tests. `verify` prints the seconds of every step, slowest first, and no GitHub workflow exists.

A hook that cannot find a tool fails; it never skips. Never use `--no-verify` or `LEFTHOOK_EXCLUDE`. Fix the cause the hook names.

The tool installers use `all` from `@platform/util` and share `tooling/scripts/download-tool.ts` for checksum verification. Pulumi bundle installation is owned by `apps/infra/src/tools.ts`, reached by the infrastructure `tools` command. Root `tools:install` invokes verification binary installation followed by that command. Development startup also probes recursive watcher allocation before any build.

`install-tools.ts` and `verify.ts` expose `installTools(directory?, fetcher?, tools?, releases?)` and `runSteps(commands)` so the unit suites run them against stubs; `bun run verify` and the pre-push hook run the coverage step, which fails below 100% of lines and functions while `COVERAGE_BLOCKING` is `true`.

## Files

`tooling/scripts/verify.ts`, `tooling/scripts/install-tools.ts`, `docs/running-verify.md`, the root `package.json`.

## Async scripts

`verify.ts` and `install-tools.ts` are async: the release URL and the install paths come from `packages/config`, whose functions return promises, so await them.

## After an intended API change

Run `bun run openapi:update`, then `bun run sdk:generate`, and commit both results.

## Running the stack

Use `project-stack` and `/dev:stack` for the development loop. The development stack includes console and documentation servers with polling and mounted source, reached through Caddy. `stack:status` inspects the selected environment; `dev:logs` reads the API log. `dev:reset` destroys the development stack and its data before recreating it, so it requires authorization for data removal. The infrastructure command also accepts `tools` without an environment.

`bun run dev` starts the development stack; `bun run stack:up <environment>`, `stack:down <environment>`, `stack:check <environment>` (`development`, `test` or `production`) start it, remove it and compare the running containers with the program (`apps/infra`). `bun run stack:prune` takes no environment argument and removes project stack data and images only when that removal is authorized. The first run installs the Pulumi CLI into `.tools/pulumi` (pinned by version and checksum, like the other tools), builds the images with Podman, installs the Docker provider plugin pinned by checksum, and keeps the Pulumi state in `.stack/` (neither folder is committed). Podman must be installed; the script prints the failing command and its error when a step fails. `bun run tools:install` also installs the Pulumi bundle through the infrastructure application.

`bun run bench:stack` starts the test stack and a benchmark-only internal network (subnet and addresses in `packages/config/src/environments.ts`). The API is attached to that network at a fixed address, next to a bare Bun server and a second Caddy in front of it that serve as the baseline. Five operations (read `GET /v1/config`, list `GET /v1/logs`, write `PATCH /v1/config`, stream `GET /v1/events`, long-running `POST ...:reindex`; `BENCH_OPERATIONS`) are measured at 1 and 32 in parallel, three repeats each, over HTTP/1.1, HTTP/2 and HTTP/3 through Caddy and over HTTP/1.1 directly on the benchmark network. Rows hold the median and the range of the 95th percentile, the failed requests by status, and the table is checked against the first byte budget (`benchProblems`; the run exits 1 on a failed request or a budget breach). `podman stats` of each container, the mean time of each request stage and the API's own first byte times are saved with the rows in `7.4-benchmark.json`. It is not part of `verify`.

`bun run verify` writes the time of each step to `.stack/verify/steps.json` and the coverage step writes the ten slowest tests of its run to `.stack/verify/slowest-tests.json` (bun's junit reporter); both are printed, slowest first, and shown in the internal repository report `docs/e2e/performance.md`.

The explicit `bun run ship:fast` source lane runs blocking static checks and all unit and integration tests in bounded parallel work, with SDK jobs first. Full E2E, coverage and documentation production remain in normal pushes and `bun run verify`. Fast verification exceeding 55 seconds fails. Do not describe the fast lane as a full audit.

The pre-push job uses `use_stdin: true` and `PLATFORM_VERIFY_PUSH=1` to forward Git's actual proposed updates to `verification-push.ts`. The verifier records `.stack/verify/push.json` in both lanes. A single existing branch update supplies its old and new object IDs to full report-only planning. Missing, malformed, multiple-ref, new-ref, deleted-ref and non-branch updates cannot nominate one reusable range. Direct full verification reads no stdin. The metadata also supplies the separate document gate. That gate requires a clean supported document-only range and executes its checks afresh; metadata never satisfies a check.

The automated MCP harness uses deterministic scripted calls through Caddy and injected stubs for orchestration and transcript handling. It never starts a model CLI, reads provider credentials or requests inference. No model usage or token cost is permitted. `bun run mcp:harness-check` runs this cost-free check; `mcp:llm-check` remains a compatibility alias. The end-to-end harness case records scripted client exchanges; the fast source lane runs its stubbed unit tests.

The root workflow guides list the current shared-container checks and container orchestration proved under task 6.7. SDK E2E, documentation consumers and console UI scenarios use the proxy; the complete proxy migration and full audit subsequently passed. Use generated internal protocol reports as observed stack evidence, and retain the complete full audit for final delivery.

The internal `tool:*` scripts name installed CLI binaries for commands launched inside the checks container. Root checks and hooks call them through the runner so Knip can trace those dependencies.

`tool:ui-proxy` is the internal browser entry for console acceptance and documentation. The edge client runs it from the repository working directory; Knip traces its browser, seeding and authentication dependencies through this real script entry.

Every internal CLI target uses `bunx --no-install`; formatter regression cases follow the hook into that target and still require missing tools to fail.

The blocking `sources` step re-fetches primary evidence and checks exact status, bytes and passages alongside reviewed change documents. A changed source requires review and a new evidence record; the check does not silently refresh hashes. Unit coverage uses injected fetch responses.

Fast verification retains four independent verification jobs and four unit workers. Its integration-only tier uses six workers, with unchanged file discovery, assertions and deadlines. Normal and mixed-tier commands retain their existing worker limits. Report the measured combined commit and push time separately from the 55-second verification budget.

The checks launcher sets DPRINT_CACHE_DIR to the repository-owned .stack/check-cache/dprint directory. This retains compiled formatter plugins across disposable containers. Verification passes --incremental=false, so every configured file is checked each time; no previous formatting result satisfies the gate. Deleting this isolated plugin cache only makes the next run cold.

The checks launcher also caps dprint at sixteen formatting threads through DPRINT_MAX_THREADS. This bounds the formatter alongside unit and integration workers without changing file selection or comparison. Root paths with spaces and both formatter environment assignments are covered by launcher command tests.

Fast verification completes SDK and scanner preparation before starting the formatter, remaining units, integration and static checks in the same bounded four-job queue. This prevents formatter contention from delaying the scanner barrier. A completed formatter releases its slot; residue runs last. Every result and the original 55-second budget remain blocking.

Formatting verification checks comments in one read-only batch, then runs the complete non-incremental dprint check. Both results block delivery. Pre-commit retains comment cleanup. The per-file exec formatter was replaced to avoid starting a runtime for every source file; no prior result substitutes for either check.

Eligible narrative Markdown/OpenSpec pushes use the automatic document gate before full/source-fast selection. The gate validates actual index blobs against working bytes, complete Git ranges and registered commands; compares its snapshot after the fresh checks; and writes .stack/verify/document-shipping.json. Commit classification writes document-scope.json without omitting staged jobs. Source, infrastructure, instruction, generated-document and uncertain changes broaden to the requested existing lane. Direct bun run verify always runs every phase. Generated-producer reuse, warm/cold timing acceptance and configured full-audit cadence are still open tasks.
