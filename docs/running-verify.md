# Running the checks

One command runs every mandatory check.

Detailed timing reports are written to `.stack/verify/e2e-suites.json`, `docs-phases.json` and `coverage-groups.json`. They show the completed end-to-end suites, documentation phases and coverage groups, including failed results. Use these reports with `steps.json` to find repeated work. They are diagnostic reports; the full push gate still runs every check.

Formatting, lint, type checking, spelling and unit-test commands run in the shared checks container. Use `bun run check:run <command> [arguments]` for a focused command. The launcher builds pinned Node and Bun runtimes, mounts the repository at its original absolute path and preserves the calling user's file ownership. Installed workspace dependencies must already exist. A failed build or check blocks the command.

Verification uses this container for every phase, including end-to-end and coverage. The outer `check:run --stack` controller shares the local engine socket and a unique temporary directory outside the checkout; nested checks execute inside that same controller. Pre-commit and commit-message checks run in the shared container. Staged formatting receives Git's temporary index, and message spelling receives stdin. Application runtime image audits are recorded in OpenSpec task 6.7.

The dependency audit allows three attempts for an empty-output timeout or the observed connection-closed request error. Each attempt has a 60-second limit and a five-second kill grace period, using the required `timeout` executable. Failed attempts remain visible. Vulnerability findings and other errors fail immediately; exhausted retries also fail. A successful audit is required to pass.

```sh
bun install
bun run tools:install
bun run verify
```

`bun run tools:install` downloads the pinned `gitleaks` and `oasdiff` binaries and verifies their checksums. `verify` runs every step even when an earlier one fails, so one pass reports all problems: formatting, lint, spelling, secrets, diagrams, workflows, structure, rules, READMEs, types, unused code, dependency audit, tests, the OpenAPI breaking-change gate, migration drift and the knowledge base.

After an intended API change run `bun run openapi:update` and commit the new baseline. After a schema change run `drizzle-kit generate` in `packages/db` and commit the SQL.

Use focused tests and checks while implementing a substantive batch. Commit runs staged checks without rebuilding documentation or recording the knowledge base. Push runs the complete `bun run verify` pipeline once; a separate full run immediately before pushing is unnecessary. End-to-end builds and browser-checks the documentation, so verification does not build it again. Any mandatory failure blocks delivery. See [standards](standards.md) for the rules. Verification runs on your machine and in the stack; no GitHub workflow exists.

## Development and stack lifecycle

Use `bun run dev` to start the API, console, documentation server and Caddy in development containers. Read proxy hosts from `packages/config/src/environments.ts`. Use `bun run stack:status development`, `bun run dev:logs` and `bun run stack:check development` to inspect the running stack. `bun run stack:down development` removes its containers and retains its data. Reset and prune remove data and require authorization for removal.

The infrastructure application is `apps/infra`; its README maps its commands and files. Pulumi state and bind-mounted data live below `.stack`. Development source mounts and polling support reload without rebuilding. Do not start parallel host development servers.

The HTTP acceptance client, MCP harness and installed SDK E2E consumers use Caddy. SDK documentation also runs its packed consumer through Caddy and publishes after every scenario passes. The completed task 9.1 and final full audit cover the remaining API suites, SDK integration and console migration. Generated protocol and performance reports remain under repository `docs/e2e`.

## Report-only impact planning

`bun run verify:plan` writes and prints `.stack/verify/plan.json` without running checks. Supply two exact commit IDs with `bun run verify:plan <base-commit> <head-commit>` to inspect a comparison range. The report includes file classifications, dirty inputs, fingerprints and all mandatory commands. Invalid commit arguments fail; unavailable Git state produces an incomplete plan requiring full execution.

Use `bun run verify:plan --root <checkout> [base-commit head-commit]` to inspect another checkout. Reports are written below that checkout; the CLI integration tests use isolated fixture directories.

`bun run verify` saves a report before its unconditional full run. It does not infer a proposed push range from a tracking branch. Every plan entry still executes, including audit and complete coverage. A guide-only candidate identifies future reuse work; it does not certify a check. Planning does not enable evidence reuse or omit tests. The separately authorized `ship:fast` lane executes its defined static, security, unit and integration checks afresh.

The user-authorized alternative `bun run ship:fast` accepts source changes and keeps all static checks, security checks, unit tests and integration tests blocking. Its verification budget is 55 seconds. Source changes on normal pushes and explicit `bun run verify` retain full E2E, coverage and documentation production. The fast lane reports its reduced scope and does not claim a fresh full audit.

The pre-push job uses `use_stdin: true` and `PLATFORM_VERIFY_PUSH=1` to forward Git's actual proposed updates to `verification-push.ts`. The verifier records `.stack/verify/push.json` in both lanes. A single existing branch update supplies its old and new object IDs to full report-only planning. Missing, malformed, multiple-ref, new-ref, deleted-ref and non-branch updates cannot nominate one reusable range. Direct full verification reads no stdin. The metadata also feeds automatic document selection; it never satisfies a check.

The explicit `bun run ship:fast` source lane retains all static and security checks plus all unit and integration tests. It caps independent verification jobs at four, prepares SDK jobs serially, and runs the untracked-file check last. Fast unit work uses SDK, other tooling, common product and console groups; integration files run separately with a six-process cap; unit partitions retain their four-process cap. Recorder module setup happens before case timers. No assertion or timeout changes. Source changes on normal pushes and explicit `bun run verify` retain full E2E, coverage and documentation production. A fast run exceeding 55 seconds fails; report actual combined commit and push time and never claim a fresh full audit.

The automated MCP harness uses deterministic scripted calls through Caddy and injected stubs for orchestration and transcript handling. It never starts a model CLI, reads provider credentials or requests inference. No model usage or token cost is permitted. `bun run mcp:harness-check` runs this cost-free check; `mcp:llm-check` remains a compatibility alias. The end-to-end harness case records scripted client exchanges; the fast source lane runs its stubbed unit tests.

The disposable checks containers share compiled dprint plugins through `.stack/check-cache/dprint`. Full and fast verification use `--incremental=false`: every configured file is formatted for comparison on every run. This retains tool compilation only; cold initialization and warmed shipment timings are reported separately.

The launcher bounds formatter work to two threads so it can share CPU with the mandatory test tiers. File selection, comparison and failure propagation are unchanged.

Formatting verification runs a read-only comment check in one process and the complete non-incremental dprint check. Both must pass. This replaces per-file runtime startup while preserving the parser rules and pre-commit cleanup.

## Automatic document shipment

A push containing only supported narrative Markdown or active OpenSpec documents runs fresh document, source, security and repository checks. The hook uses the complete proposed Git range, not only the last commit. The staged index and working bytes must match the pushed commit. New branches, ambiguous refs, partial staging, generated pages, raw evidence, instructions, tooling and unknown paths use broader verification.

The classifier hashes actual tracked bytes against Git index blobs and refuses assume-unchanged or skip-worktree flags. The document executor validates the complete command registry, checks local Markdown links and headings, runs the residue check last and compares the snapshot again. A failing check, changed snapshot or 60-second verification budget breach blocks shipment. The report is .stack/verify/document-shipping.json. It certifies no cached result. Warm 15-second and cold 60-second combined hook acceptance, generated-producer certification and full-audit cadence remain open requirements.
