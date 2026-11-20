## Execution order of the open tasks (user, 2026-11-01)

The numbers below stay as they are so every task keeps its trace. The open tasks are done in this order:

1. 7.1, 7.2: the capped util and the blocking `Promise.all` check first, so no new code, including the tests of 4.x, adds a `Promise.all`
2. 6.2, 6.1, 6.3, 3.3: finish the work already in progress (verify it, commit it in green batches)
3. 7.3 (done and on `main`), then 7.4, 7.5, 7.6: the console and config loader on the capped util, the e2e before docs ordering, the flaky scenario
4. 4.1, 4.2, 4.3: unit cases and 100% coverage, after the code has stopped changing; reuse the uncommitted unit tests left in the worktrees `a97ad4`, `aed4e3`, `a3444`, `ab2217` by rebasing them onto `main`
5. 5.1, 5.2: the final audit and the final MCP verification against `main`

## 1. Repository knowledge and project skills

- [x] 1.1 Write `CLAUDE.md` from the repository's real contents (project, layout, commands, OpenSpec workflow, standing rules, verification protocol, open decisions)
- [x] 1.2 Write `AGENTS.md` with the same facts for agents that read that name
- [x] 1.3 Write project skills under `.claude/skills` covering setup and verification, adding a capability, tests and coverage, generated documentation, OpenAPI and SDK, MCP and skills, rules and hooks, and the OpenSpec workflow
- [x] 1.4 Write the self-update skill and the path-to-skill mapping file
- [x] 1.5 Pre-commit job that fails when covered paths change without the matching skill or command changing; DEV_RULES row, RULE_JOBS wiring, negative tests
- [x] 1.6 Check that `CLAUDE.md` and `AGENTS.md` exist and mention every rule of `DEV_RULES.md`; negative tests

## 2. Every function asynchronous

- [x] 2.1 Blocking check that fails a non-async function not in the ignore configuration; ignore configuration with reasons; negative tests
- [x] 2.2 Convert product source to async in batches, each batch green on `verify` and pushed
- [x] 2.3 List every ignore category with its reason for the user's review

## 3. Skills in packages and custom tools

- [x] 3.1 Load skills from configured skill packages and serve them through the Skills extension next to registry skills, filtered by policy
- [x] 3.2 Blocking check that every package skill complies with the skills format and frontmatter; negative tests
- [x] 3.3 Generated end-to-end documentation for defining a capability, a tool-only item and a skill, and how each relates to MCP conformance; custom tools run through the MCP conformance suite
- [x] 3.4 Correct `docs/quickstart-agent.md`: skills are not only generated from the registry
- [x] 3.5 The MCP server offers a tool that lists and returns skills, with the same policy as the Skills extension
- [x] 3.6 End-to-end test with a real MCP client proves package skills through `skills/list`, `skills/get` and the tool, and the LLM check records a model using the tool

## 4. Unit rule and coverage

- [x] 4.1 Bring all 141 listed units to 2 positive and 2 negative cases with real assertions; empty `testing/unit-debt.json` (proof: `bun run tooling/scripts/check-unit-cases.ts` prints `299 units checked for 2 positive and 2 negative cases; 0 still listed in testing/unit-debt.json`; `testing/unit-debt.json` is `[]`)
- [x] 4.2 Bring every product file to 100% of lines and functions (proof: `bun run tooling/scripts/run-coverage.ts unit integration` ends with `223 product files have 100% of lines and functions covered`; the report also fails a product source that no test loaded)
- [x] 4.3 Make coverage blocking (`COVERAGE_BLOCKING`) in verify and pre-push (proof: `COVERAGE_BLOCKING` is `true`; `bun run verify` exits 0 with the coverage step green; `bun run tooling/scripts/run-coverage.ts integration` alone exits 1 and lists 118 files below 100%)

## 5. Final audit

- [x] 5.1 Table of every requirement the user stated against code and checks, with command, result and file; gaps listed first
- [x] 5.2 Final MCP verification against main: real-client suite, MCP Inspector CLI harness and the LLM check, with commands, outputs and transcripts saved as evidence in this change


## 6. Authentication and documentation from the end-to-end run

- [x] 6.1 Authentication proven end to end on API and MCP (no token, valid token, too little scope, expired token, other audience) with the JWKS provider and with Better Auth, each case a generated documentation step
- [x] 6.2 `bun run test:e2e` writes the generated documentation into `apps/docs` when every scenario passes and nothing when one fails; tests for both; a second run with nothing changed leaves the pages identical (no timestamps, request ids or screenshot noise), and a hung browser recording fails the run instead of hanging
- [x] 6.3 Convert `createSdkClient` to async, update `docs/sdk.md` and the SDK scenarios, and remove its entry from `async-ignore.json`

## 7. Bounded concurrency

- [x] 7.1 Util package with a capped `all` (limit from the config package, with a default; result order kept; first failure stops new work); 2x2 unit tests and a concurrency proof
- [x] 7.2 Blocking pre-commit check that fails any `Promise.all` in `apps`, `packages`, `tooling` and `testing`, with negative tests; DEV_RULES row, RULE_JOBS wiring, project skill text
- [x] 7.3 Replace every `Promise.all` (106 in product and tooling, 68 in testing) with the util, in batches each green on `verify`
- [x] 7.4 The console live provider (`apps/console/src/live-provider.ts`) and the config loader (`packages/config/src/load.ts`) use the capped util instead of sequential `for` loops, keeping the parallelism the code had before. The util offers an entry point that the browser bundle can import without `@platform/config` or `process.env`, and the util and config packages have no dependency cycle; tests and a bundle check prove both (user, 2026-11-01: "capped util sounds good"). Proof: `check-package-graph.ts` (unit 14 cases, integration 2 tests) and the `package-graph` step of `bun run verify`, 39 of 39 checks passed in a fresh worktree; design in `design.md`
- [x] 7.5 In a clean checkout `bun run verify` and `bun run test:e2e` pass without a previously built `apps/docs/dist`: the step that builds it runs before the e2e step that needs it; proven by a run from a fresh worktree (user, 2026-11-01). Proof: `evidence/7.5-fresh-worktree.txt` (no `apps/docs/dist`, `bun run verify` exit 0, `bun run test:e2e` exit 0)
- [x] 7.6 Find the cause of the flaky scenario `console-request-log` ("Filter by the capability that was called", page error on `/v1/logs?capability=books.get`) and fix it; proven by repeated full runs with no failure; do not retry-mask it (user, 2026-11-01). Cause: the console refetched the log on every live event and reading the log publishes an event; proof in `evidence/7.6-logs-refetch-storm.txt` (before: 28 refetches in 1.5 seconds; after: one request per filter in 6 stressed runs, then 5 clean runs 6 pass 0 fail)
- [x] 7.7 `bun test testing/unit` run directly (without the tier runner) passes: the DOM registration of the console tests no longer replaces the network globals (`Headers`, `Request`, `Response`, `fetch` and the rest), which made the origin test and the two "scanner is swappable" tests fail when the console files shared their process. Proof: before, `bun test testing/unit` gave 1512 pass, 3 fail; without the console files it gave 1463 pass, 0 fail; after the fix it gave 1515 pass, 0 fail, and `bun test testing/unit/console` gave 52 pass, 0 fail (user, 2026-11-01)
