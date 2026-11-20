---
name: project-testing
description: Write and run tests: the three tiers, the 2x2 factories, the testing stack and coverage. Use when adding or moving a test, or when a tests, tiers or coverage check fails.
---

# Testing

Verification entry regression cases inject process creation and the tier, full-audit and fast-lane executors. They check argument forwarding, bounded concurrency, exit propagation and the actual proposed push metadata without starting processes. The executable entries stay thin; coverage includes their dispatch functions.

`testing/e2e/stack/object-store.test.ts` provisions the configured product object store and tests S3 requests through Caddy from the edge network. It covers signed and presigned PUT/GET, partial reads, private-object refusal and multipart upload. Its isolated bucket and temporary part file are cleaned after the run; persisted stack data is retained. Object-store fixture credentials are used only in the test process and restored afterward. The same suite builds and publishes the actual console and documentation images, compares their served index bytes, refuses anonymous writes, checks console fallback versus documentation 404, and checks the console API route. Static app buckets persist with the stack data. Publication unit cases inject the command executor and cover build, create, copy, cleanup and upload failures without starting processes.

All tests and testing helpers live in `testing/`. The folder decides the tier.

| Tier        | Folder                       | Command                    |
| ----------- | ---------------------------- | -------------------------- |
| Unit        | `testing/unit/<area>`        | `bun run test:unit`        |
| Integration | `testing/integration/<area>` | `bun run test:integration` |
| End to end  | `testing/e2e/<area>`         | `bun run test:e2e`         |

A unit test opens no port, database or process. End-to-end files run in their own process.

`bun run test:unit` starts the shared checks container. Run selected cases with `bun run check:run bun test <files>`. Runner unit cases inject command results; `testing/integration/infra/runner.test.ts` exercises real containers, missing executables, exit codes and output ownership. Integration, end-to-end and coverage orchestration use explicit `check:run --stack` mode with the local engine socket and an isolated shared temporary directory. Ordinary checks mount no engine socket.

## The 2x2 rule

Every exported function of product source has at least 2 positive and 2 negative cases in a `unit(subject, { positive: [...], negative: [...] })` call built with `positive`, `negative` and `rejected` from `@platform/test-factories`. Units not yet covered are listed in `testing/unit-debt.json`, a list that only shrinks. `followUp` calls the returned function, or the method named by a dotted path on the returned object; a `Response` is read into `{ status, headers, body }`; `seen(view, equals)` compares a value read after the call, and `behaves({ accepts, rejects, meta })` probes a returned Zod schema. `processEnvScenarios` in `@platform/test-framework` sets one process environment per case. `betterAuthFixture` and `memoryDatabase` in `@platform/test-scenarios` build a Better Auth instance on an in-memory database for the unit suites, so the suites themselves never open a database. Objects nest at most two levels in tests too: hoist expected values into constants.

## Rules for tests

Paging helpers for the list conformance test (`everything`, `withQuery`, `loggedReads`) are in `@platform/test-scenarios` (`listing-fixtures.ts`), because test files hold no loops. Tests are flat: no loops, conditionals or try blocks; use `test.each`. They assert behavior; no filler cases.

## Coverage

`bun run test:coverage` merges Bun's coverage and lists files below 100% of lines and functions. It is blocking: `COVERAGE_BLOCKING` in `packages/constants/src/tooling.ts` is `true`, so it exits 1 below 100%. Bun does not measure branches. Generated and built output (`generated/`, `dist/`) is not part of the report, and a line that was never run and holds only closing brackets, a semicolon or a comma is not counted as a gap (Bun reports those lines for a function that is never called).

## The tests measure the API

Every `bun test` command built by `testCommand` in `tooling/scripts/run-tier.ts` loads the preload `testing/packages/framework/src/metrics-preload.ts`. When `METRICS_REPORT_DIR` is set, each test process writes the metrics of the APIs it created (operations by form and HTTP version with latency buckets, memory, heap, event loop delay). The `e2e` step (`run-tier.ts`) and the integration groups of the `coverage` step (`run-coverage.ts`; a group with a unit test is left out, its process belongs to the tests) merge the files with `enforceMetrics` in `tooling/scripts/metrics-run.ts`, save `.stack/metrics/<e2e|coverage>/metrics-report.json` and fail on a missing metric or a value over its budget (constants `METRIC_BUDGET_*` in `packages/constants/src/observability.ts`; `operations.wait` has the longer budget). A failing run deletes its folder, so it publishes no report. `Bun.spawn` does not pass changes of `Bun.env` to the child: the runners pass `env` explicitly.

The merged report also holds the time to the first byte (own buckets, the budgets use its 95th percentile), requests per second, the memory growth above the start of the process, heap collections inferred from drops of the sampled heap (Bun 1.3.10 has no collection counters), the open streams and the running operations, and one timed forced full collection at the end of each test process. `enforceMetrics` also writes `diagnosis.md` next to the report: the five slowest operations, the largest memory growth and the collection pressure. The coverage step prints the ten slowest tests of its run.

The tests that need Podman (`testing/e2e/stack`) are end-to-end tests: one file brings the test stack up once, and every check is wrapped in `documentStep` (`testing/packages/scenarios/src/protocol-report.ts`), which appends the step, its description, what it checked and its result to `.stack/e2e/protocols.jsonl` (the path is in `PLATFORM_PROTOCOL_REPORT`, set by `runTier` for the e2e tier). After a passing run `build-docs` writes internal reports `docs/e2e/protocols.md` and `docs/e2e/performance.md`. The browser report and its screenshots also live under `docs/e2e`. These test reports never appear on the client site. A failing run removes the file and publishes neither report.

## The stack

`testing/packages`: `framework`, `factories`, `scenarios`, `recorder`. Each depends only on the ones before it.

## Async scripts

Tests depend on the packages they exercise through `testing/package.json`, including `@platform/util` and `@platform/streams` (the stream writers and readers, tested in `testing/unit/streams` with the stream fixtures of `@platform/test-scenarios`: `streamOf`, `bytesOf`, `cutStream`, `lockedStream`, `items`, `failing`, `watched`, `textOf`, `chunksOf`); tests, the factories, the scenarios and the recorder run parallel work with `all` from it, not with `Promise.all`. The check and run scripts in `tooling/scripts` are async. When the callback of a `filter`, `flatMap`, `some`, `every`, `find` or `reduce` is async, use `filterAsync`, `flatMapAsync`, `someAsync`, `everyAsync`, `findAsync` and `reduceAsync` from `@platform/store` (an async callback to `Array.prototype.filter` is always truthy).

## The end-to-end tier writes the documentation

`run-tier.ts` writes `.stack/verify/e2e-suites.json` with each end-to-end file's elapsed time, metric-budget result and final documentation production time. It clears the report before the run and updates it after each completed suite. `run-coverage.ts` similarly writes `.stack/verify/coverage-groups.json` for each completed unit or integration group. These reports diagnose repeated setup; they do not authorize selecting or omitting tests. Every existing test and failure remains blocking.

`bun run test:e2e` writes the generated documentation into `apps/docs` when every end-to-end test passes and nothing when one fails (`finishRun`, tested in `testing/unit/tooling/finish-run.test.ts`). The e2e run is slow for that reason. `testing/packages/custom-capability` is a fixture package (a capability, a tool-only item, a skill) used by `testing/e2e/api/custom-capability.test.ts`, and `mcpConformance` in `@platform/test-scenarios` is the MCP conformance check run on every built-in and custom tool.

The testing-area, unit-case and tier checks run their parallel work with `all` from `@platform/util`.

Every script in `tooling/scripts` keeps its logic in an exported async function that returns an exit code (`checkTiers`, `runTier`, `runCoverage`, `runSecretScan`, `stripFiles`, `installTools`, `buildDocs` and the others), and its last line is `if (import.meta.main) process.exit(await fn())`, so the unit suites call it with a fixture root, a stub command or a stub fetcher and 100% of lines and functions can be measured. Bun counts a class without an explicit constructor as a function that never ran, and a default parameter that holds an arrow function as one too: declare the constructor, or bind the native function instead. `runCoverage` also reports a product source that no test loaded (a `.d.ts` file holds no code and is left out), and it merges the runs so that a line is a gap only when every run that loaded the file listed it with no hit. `COVERAGE_BLOCKING` in `packages/constants/src/tooling.ts` makes the report fail `verify` and the pre-push hook.

## Files

Planner unit cases inject Git results and open no process. `testing/integration/tooling/verification-plan.test.ts` uses a fixture Git repository for renames, deletions, discovery and dirty staged inputs, and exercises the report CLI. Candidate fingerprints are diagnostic; the tests do not claim cache validity or test-selection equivalence.

Infrastructure installer unit cases inject extraction results and start no process. Real archive extraction and the Pulumi language host are checked in `testing/integration/infra/install-bundles.test.ts`. Watcher unit cases inject allocation failures and check handle cleanup. Live development acceptance receives updates through Caddy, restores source bytes and checks 40 parallel WebSocket handshakes per app.

`docs/testing.md`, `testing/package.json`, `tooling/scripts/check-tiers.ts`, `check-testing-area.ts`, `check-unit-cases.ts`, `source-files.ts` (reads source files by glob for the checks), `run-tier.ts`, `run-coverage.ts`, `test-tiers.ts`.

The stream and event fixtures of `@platform/test-scenarios` (`spaced`, `tickCapability`, `stubServer`, `rawHttp`) need `@modelcontextprotocol/server` and `@platform/capability` in its `package.json`; a test that reads a real stream uses `readEvents` from `@platform/streams`.

The infrastructure is tested without containers: `testing/unit/infra` checks the plan of each environment (`planFor`), the rendered proxy configuration and, with Pulumi mocks from `@platform/test-scenarios` (`installPulumiMocks`, `registered`, `resolved`, `fakeConfig`), the resources that `applyPlan` and `runStack` register. Use a new environment or stack name for each mock file, because the mocks and the list of registered resources are shared by the process.

A package that has an `index.ts` barrel needs one test that imports it from its entry point (`@platform/<name>`, a dependency in `testing/package.json`): the coverage gate counts the barrel, and tests that import the files directly leave it uncovered (`testing/unit/infra/index.test.ts` is the example).

The explicit `bun run ship:fast` source lane retains all static and security checks plus all unit and integration tests. It caps independent verification jobs at four, prepares SDK jobs serially, and runs the untracked-file check last. Fast unit work uses SDK, other tooling, common product and console groups; integration files run separately with a four-process cap. Recorder module setup happens before case timers. No assertion or timeout changes. Normal pushes and `bun run verify` retain full E2E, coverage and documentation production. A fast run exceeding 55 seconds fails; report actual combined commit and push time and never claim a fresh full audit.

The pre-push job uses `use_stdin: true` and `PLATFORM_VERIFY_PUSH=1` to forward Git's actual proposed updates to `verification-push.ts`. The verifier records `.stack/verify/push.json` in both lanes. A single existing branch update supplies its old and new object IDs to full report-only planning. Missing, malformed, multiple-ref, new-ref, deleted-ref and non-branch updates cannot nominate one reusable range. Direct full verification reads no stdin. The metadata is diagnostic; it does not satisfy a check or enable evidence reuse.

Default SDK packing uses isolated temporary builds. The migration drift probe lives in a temporary fixture with absolute imports. Real Git/Lefthook push tests use local fixture receivers and verify creation, updates despite stale tracking data, multiple refs and deletion.

Asset unit fixtures inject object writers and failures without opening a port. HTTP integration cases verify binary preservation, owner isolation, scope checks, unsupported media and cleanup after checksum failure. The live object-store suite uses scoped JWTs verified by the real JWKS provider in a test entry built from the product API; policy checks remain enabled. Its temporary API container must release and restore the original network address and propagate setup failures. The live suite passed 19 tests and 48 assertions on 2026-11-07, including native multipart checksum cleanup, oversized and disconnected upload cleanup, and a real SDK upload/download from an isolated edge client. That client also checks official MCP resource listing, metadata reads, signed resource links and owner isolation. Generated asset recordings include binary upload commands and signed range retrieval.

SDK documentation wrapper cases inject a writer and check its output and propagated filesystem errors. Real generator coverage remains in units-recorders; running the recorder again in wrapper cases caused a reproduced five-second timeout under the blocking fast gate.

MCP Tasks unit cases cover owner binding, retention, business errors, cancellation and per-request capability refusals. The shared official-client fixture pins protocol 2026-07-28 and supplies the JSON-RPC envelope around the Tasks raw dispatch. The isolated edge client exercises the same fixture against the packaged API through Caddy with certificate verification enabled.

The scoped packaged API accepts a test workload delay through its injected API factory. Production keeps its default scheduling. MCP proxy acceptance uses this delay to observe intermediate progress and cancel running work; it does not relax either assertion. The same fixture retains real JWT verification and capability policy checks.

The automated MCP harness uses deterministic scripted calls through Caddy and injected stubs for orchestration and transcript handling. It never starts a model CLI, reads provider credentials or requests inference. No model usage or token cost is permitted. `bun run mcp:harness-check` runs this cost-free check; `mcp:llm-check` remains a compatibility alias. The end-to-end harness case records scripted client exchanges; the fast source lane runs its stubbed unit tests.

The HTTP API acceptance suite runs through Caddy from an isolated edge client with the built curl client over HTTP/1.1, HTTP/2 and HTTP/3. Every request checks its negotiated protocol and certificate verification. Each protocol gets a fresh authenticated backend, and each case gets a separate publisher. The matrix retains lifecycle, ordering, permission, version and OpenAPI assertions and adds batches, NDJSON and incremental JSON input, operation lifecycle and ordered event responses, assets, administration and required-header refusals. Continuous administrator events use an explicit one-second client capture. Request headers, response headers and chunks are retained in arrival order. The recording is published only after all three protocol clients pass. Broader integration migration and whole-change documentation determinism remain open.

SDK scenario execution accepts an injected session and command executor. Flat unit cases use these seams to verify token forwarding, failure propagation and cleanup without starting an API or process. The SDK E2E suite retains installed-package, declaration, typed-error and failed-publication assertions while moving consumers into the test stack.

SDK documentation orchestration has injected packing, recording and proxy lifecycle tests. Its four real page-count, output-path and invalid-output assertions run in `testing/e2e/sdk/sdk.test.ts` with the packed consumer through Caddy; none was removed. Default SDK documentation generation uses that same proxy path.

`docs/testing.md` lists current proxy coverage and unfinished migration explicitly. Stack commands are owned by `apps/infra`; internal generated protocol reports describe the configured test stack. Never infer complete task 6.7 or 9.1 delivery from the passing migrated subset.

The real checks-runner integration cases also verify unchanged stdin and an alternate Git index without changing the normal index. Hook checks use this same container; their launcher preserves mapped output ownership and command failures.

Integration, end-to-end and coverage commands run in the checks controller through `check:run --stack`. The local engine socket and unique temporary directory retain their absolute paths for remote bind mounts. Fixtures stay outside the checkout to preserve Git, package and spelling isolation. Cleanup failures remain blocking. Unit cases inject launch, allocation and cleanup; real integration retains stdin, alternate-index and ownership assertions.

SDK pack integration prepares three independent real packages before the assertion timers start. Manifest, dependency isolation and deliberately contaminated-package assertions retain their original timeouts. Packing failures still fail suite setup and setup time remains included in shipment timing.

The SDK build wrapper unit tests inject the builder and assert target forwarding and build/declaration failure propagation. Its four real output and invalid-output assertions run in SDK pack integration with independent fixtures. No assertion or timeout was removed.

The console proxy runner preserves every existing browser assertion, including sign-in, forbidden requests, screenshots, all-or-nothing publication and the defective Node Buffer build. Its browser runs on the edge network with the local Caddy CA trusted explicitly. Real acceptance remains E2E; the shared PKCE stub retains its unit cases. The authentication stub lives in the scenarios layer and the recorder keeps its original export.

The API matrix retains disabled-alpha refusals and separately starts a fresh flag-enabled backend for each protocol to prove its successful form. Its coverage assertion requires HTTP 200 for every declared operation and response form. The shared HTTP client records both runs.

Installed SDK protocol acceptance shares the existing SDK suite stack and packed package. Consumers install that tarball in an isolated project; the bundled test entry keeps the SDK import external and verifies its runtime resolution. The generated client receives the real curl transport through its supported fetch configuration, with negotiation and certificate verification checked per request. Existing native-fetch installed-package and declaration assertions remain. Protocol captures cover typed JSON/errors, list iteration, operation events, incremental request input and binary streams.

Knip lists the actual dynamically launched scenario entries explicitly, including the enabled-alpha and installed SDK protocol clients. They are entry points, not ignored files.

Repository testing guidance records the API and installed SDK protocol matrices with their actual request counts and evidence paths. Focused acceptance does not satisfy the complete audit or independent documentation-run requirement.

SDK integration now runs all twenty-one original cases in an isolated edge consumer through Caddy, plus a direct-backend refusal assertion. Per-case authentication and memory databases remain in the real source API backend. The backend runs as a Bun test with the existing metrics preload and exits gracefully before cleanup. Coverage orchestration passes `TEST_CHILD_REPORT_DIR` and merges nested LCOV and JUnit reports, retaining API and SDK source coverage and individual child timings. Ordinary fast integration runs do not request coverage. No model client or inference is involved.

Recorder unit fixtures obtain their real SDK from an isolated pack and pass its entry explicitly. They do not clean or rebuild the workspace SDK declarations while concurrent type checking reads them. Package extraction, bundle presence and generation assertions remain unchanged.

The original MCP real-client and Inspector cases, Tasks cases, MCP E2E cases and package-skill E2E cases now run in isolated edge consumers against the source API through Caddy. Each suite adds a configured direct-port refusal. The Inspector keeps its Node runtime in the existing checks image identified by the Containerfile hash. Its stdout and stderr are drained together and nonzero exits fail. The Tasks helper preserves fixture path prefixes. Child coverage and timings use separate per-entry directories; a measured five-suite run retained all sixty-five client cases and seventy-five timings. Other API integration migration remains open.

Scoped proxy fixtures let the engine allocate separate network ranges, render the configured API alias as the upstream and inspect the actual API address for the direct-port refusal. Four consumers ran concurrently with exit codes `[0,0,0,0]`; all fifty-eight client cases passed, including all four direct refusals. The fixed test-stack subnet is no longer reused by independently running fixtures.

The operation lifecycle, MCP operation events, HTTP/MCP parity and administrator event suites run in isolated edge consumers through Caddy. All sixty original cases and their deadlines remain; four direct-backend refusals bring the client total to sixty-four. A measured run merged 235 source files and seventy-two timings, with all twenty-two operation budgets passing. Per-case APIs keep separate databases and real JWT verification; operation groups share their real issuer through explicit fixture IDs. Browser preflight and skill-directory cases use the proxy too. Remaining API integration migration and the full audit stay open.

Request and response streaming integration now uses isolated edge consumers through Caddy. The raw HTTP helper accepts an optional configured TLS origin, trusts only the supplied CA and writes after the verified handshake. All twelve original upload and response cases retain their assertions and deadlines; two direct-backend refusals bring the total to fourteen. Backend observations retain the chunked-upload assertion. An instrumented run passed with 233 source files, eighteen timings and all three operation budgets. Remaining authentication and adapter integration migration stays open.

The Promise.all gate shares one fresh source scan between violation and stale-exception checks within each invocation. It keeps all AST checks and exception limits, performs no cross-run caching and retains the original five-second unit deadline. The repository regression passed in 977 milliseconds and all twenty-six focused cases passed after a concurrent push exposed the duplicated scan.

Both MCP adapter integration suites now run their original forty-two cases through Caddy from isolated edge consumers, plus two direct-port refusals. Real source factories retain custom tools, invalid-token challenges, discovery, skills digests, origin policy, rate limits and lazy loading. The no-expiry negative provider remains a deterministic stub. Protected-resource metadata keeps both root and path-specific resource assertions. A measured run with SDK regression coverage passed sixty-six client cases and seventy-two timings, merging 222 source files with all sixteen API operation budgets passing.

Scoped proxy fixtures inspect the assigned edge address and pass explicit per-container host mappings for the configured proxy and backend aliases. This avoids transient DNS reload failures while independent networks are created concurrently. TLS still verifies the configured proxy hostname and scoped CA; the API stays private. Four consumers passed concurrently with all fifty-eight client cases and direct-port refusals retained.

API conformance and Better Auth integration run from isolated edge consumers through Caddy. All thirty-one original cases and their deadlines remain, plus two direct refusals. The API factory retains its enabled feature flag and captures the real logger output for credential-redaction assertions. Better Auth keeps real per-case databases, password sign-up, administrator role updates, client creation, token issuance and verification. Its scoped backend serves the current sequential case at the proxy root, matching its configured issuer and resource; control requests select the exact fixture ID. Key-rotation and unsafe-metadata probes remain unchanged. No model service or credentials are involved.

Domain conformance now runs all thirty-four original cases from an isolated edge consumer through Caddy, plus direct-backend refusal. Real JWKS and Better Auth providers retain valid-token and wrong-audience checks. The disabled-auth spy still proves no verification occurs; the database with only application tables is shared with the actual API through the scoped temporary mount. Pipeline spies, redaction and persistence checks remain unchanged. An instrumented run retained thirty-five client cases, thirty-seven timings and 208 source files; all eight operation budgets passed. E2E main and custom-capability migration and the complete audit remain open.

Custom-capability E2E now runs all six original cases through Caddy from an isolated edge consumer, including the real generated page over HTTP and MCP, plus direct-backend refusal. Its injected recorder retains scenario and transport forwarding; four stubbed cases prove forwarding and that failed steps or client errors publish no files. Conformance now checks that HTTP-only capabilities are absent from MCP instead of attempting to serialize their stream input. Recorder cleanup excludes the SQLite in-memory identifier. The actual API entry process is launched privately for lifecycle E2E; both original SIGTERM and SIGINT cases retain exit, timeout, flushed-log and trace assertions. Shared scoped files coordinate signals without exposing a backend control port. Fresh file objects avoid cached missing-file metadata. Lifecycle acceptance passed two client cases and nine assertions in 2.26 seconds including cleanup; custom acceptance retained seven cases and eight assertions. Its measured run merged 266 source files and nine timings, with both operation budgets passing. Asset/list integration and the general recorder consumers still need proxy migration; the full audit remains open.

Asset and list conformance integration now runs through Caddy from isolated edge consumers. All fifty-one original cases remain, with two direct-backend refusals bringing the total to fifty-three. The real asset store uses its existing injected object clients in the backend; clients inspect actual stored keys and bytes through scoped fixture controls. Binary preservation, owner isolation, permissions, media and checksum cleanup assertions remain. Lists seed assets through HTTP and wait for both real operations to complete before comparing page snapshots; this removes a progress-update race without changing the equality assertion or case deadlines. The measured run retained 242 source files and fifty-seven timings, and all ten operation budgets passed. General recorder consumers and full verification remain open.

The shared API/MCP recorder now runs normal page recording and live interface reads in isolated edge consumers through Caddy. All twenty-two scenarios produced 209 steps through the default path. Authentication E2E retained six original cases plus direct refusal; recorder E2E retained thirty-three original cases plus direct refusal, including every scenario over both transports and failed-publication assertions. Real Better Auth token issuance moved into the scenarios backend; clocks, flags and tamper databases retain their behavior. Raw missing-Accept calls verify TLS and preserve fixture prefixes. The scoped marker probe removes the marker only before the real application guard; separate edge-network checks prove the private API port is unreachable. The measured two-suite run retained forty-one client cases, forty-five timings and 274 source files; all twenty-seven operation budgets passed. Full verification and independent documentation determinism remain open.

Fast unit work divides the tooling files evenly between two groups inside the existing four-worker limit. SDK setup, common units and console isolation remain separate. Both full and fast grouping are tested against the entire discovered file list for exact once-only execution; no case, assertion or deadline is removed. Full coverage and end-to-end grouping are unchanged.

API composition integration exercises custom capabilities, the configured clock, Better Auth, MCP discovery, operation change notifications, statistics and metrics in the same real source backend through Caddy. Anonymous protected calls and invalid bearer tokens retain their refusal assertions. The measured backend covered all twenty-two API construction functions and all seventeen MCP app functions. Documentation unit fixtures inject both HTTP and MCP examples; orchestration cases never request inference.

Fast unit scheduling starts the two whole-repository scanner suites in their own process, within the same four-worker cap. SDK, common units, other tooling and console groups still run completely. Exact once-only discovery regressions cover full and fast grouping; this isolation retains scan deadlines under concurrent fixture allocation.

Browser proxy entry waits within the existing step timeout until Linux reports no tentative IPv6 address before launching Chromium. The readiness predicate has two positive and two negative stubbed cases. The proxy hostname maps to its inspected edge address while TLS validation and every UI assertion remain unchanged. Request-error evidence retains the actual browser failure reason. No scenario retry or error suppression is added.

Fast unit orchestration completes its initial scanner group before starting the other unit groups. The same unit files and assertions run exactly once; the rest keep the four-worker limit. Focused acceptance uses check:run --stack because the existing interface fixture needs the engine socket.

An earlier measured attempt completed SDK preparation and the full unit tier before the parallel phase. It retained all checks but exceeded the budget. The current partitioned schedule serializes only SDK preparation and scanner tests, then runs the remaining units and checks within the fixed worker limit.

The measured complete-unit serial attempt passed every check but exceeded the budget. The final fast schedule serializes SDK preparation and the unit-scans phase only; --fast-scans and --fast-rest form disjoint, complete partitions. The remaining units overlap integration and static checks. Entry forwarding, exact discovered-file union, empty intersection and scanner completion are regression tested. Both partitions are mandatory and failures in either block delivery. Normal unit commands and the full audit still run every unit in one invocation.

Scoped API fixtures issue a fresh owner subject per run; owner and reader tokens share that subject, while the refusal token uses a different subject. This isolates persistent object-store contents without deleting data from other runs. The real asset acceptance parses AssetListSchema and requires exactly the asset it uploaded. The MCP Tasks acceptance enables the existing tick clock. Run selected E2E files with check:run --stack and bun test plus the metrics preload; run-tier.ts accepts tier names rather than file filters.

The fast integration-only tier uses six workers; fast unit partitions retain four. Normal invocations remain serial and mixed fast tiers retain the four-worker unit limit. Entry tests cover flag order, integration selection, normal and mixed commands, partition forwarding and failing exits. All test files, deadlines and required checks remain unchanged.

The real checkInterfaces assertion runs in testing/integration/tooling/check-interfaces.test.ts with its original five-second deadline. Unit cases inject interface reads and retain success, missing-tool, extra-tool, leak and loader-error checks. Both tiers remain mandatory in the fast lane; the standalone interface check also remains blocking.

Live interface integration setup records the actual API/MCP interfaces before assertion timing; setup failures and its total elapsed time remain part of the mandatory integration gate. The assertion keeps its original five-second limit. Display-boundary unit cases inject evidence writes and verify unchanged raw data, measurement labels, retained failures, representative progress and combined transport chunks.

Isolated proxy recorder clients retain the source mount read-only and mount only .stack/e2e/raw-guides writable. Create that evidence directory before container startup. Complete raw pages can then be retained before guide publication without granting write access to source.

Fast verification starts the full formatter check after SDK preparation and alongside scanner preparation, reserving one of the existing four job slots. SDK and scanner ordering is unchanged; other checks wait for preparation and share the same queue, reusing the formatter slot after completion; residue runs last. All results and the original 55-second budget remain blocking.

The live interface integration suite prepares the actual default checkInterfaces result before its assertion. It invokes the default proxy loader, retaining its measured coverage and total mandatory tier runtime. Unit interface cases retain injected data and process-free behavior.

Live interface integration checks exercise the default proxy loader and reject missing tools, missing operations and a leaked tool-only capability using fresh proxy data. Both successful and failing paths are covered in the same process; the coverage merger retains per-process function totals.

Batch formatting regression cases retain exact input bytes, reject comments in TypeScript and JSON, and require both formatting and comment results. Full discovery uses the existing tracked and non-ignored file list and parser rules.

The stream-all-responses final audit passed all 41 checks, with 302 product files at 100% measured lines and functions. All 59 tasks and the complete proxy migration are archived under openspec/changes/archive/2026-11-08-stream-all-responses. Final source delivery passed in 50.190 seconds; reduced verification remains distinct from that full audit.
