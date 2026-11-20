# Testing

The runners save detailed times under `.stack/verify`: `e2e-suites.json` for end-to-end suites, metrics and documentation production; `docs-phases.json` for recording, generation, site build and browser checks; `coverage-groups.json` for unit and integration coverage groups. Reports are reset at the start of each relevant run. A recorded failure stays a failure and does not authorize skipping a suite.

The root unit command runs in the shared checks container. Use `bun run check:run bun test <files>` for focused cases. The runner preserves the repository path and output ownership and returns the check's exit code. Real runner tests belong to `testing/integration/infra`; unit cases inject command results. Integration, end-to-end and coverage commands run orchestration inside the checks container using `check:run --stack`. This mode mounts the local engine socket and a unique temporary directory outside the checkout. Cleanup runs even when the command fails.

Client API, MCP, SDK and administrator UI documentation is generated into the public site in `apps/docs`. End-to-end performance, protocol verification and browser test reports are internal repository documents under `docs/e2e`. Browser report screenshots live in `docs/e2e/screenshots` and use relative links. Generated reports do not receive exemptions from the public documentation scope check.

All tests, the test framework and the packages that build test scenarios live in `testing/`. Product source (`apps`, `packages`, `tooling`) holds no test and no testing helper; `check-testing-area.ts` fails the commit when one appears.

## Where each tier lives

| Tier        | Folder                        | What it may do                                      | How to run                 |
| ----------- | ----------------------------- | --------------------------------------------------- | -------------------------- |
| Unit        | `testing/unit/<area>/`        | Call code in process. No port, database or process. | `bun run test:unit`        |
| Integration | `testing/integration/<area>/` | Open a port or a database, call the real code.      | `bun run test:integration` |
| End to end  | `testing/e2e/<area>/`         | Run the real server, a browser or the packed SDK.   | `bun run test:e2e`         |

The folder decides the tier. `<area>` is the product package or app under test: `api`, `sdk`, `console`, `aip` and so on. The named API suites over HTTP and MCP are `testing/e2e/api/http.test.ts`, `mcp.test.ts`, `main.test.ts` and `startup.test.ts`; the SDK suites are `testing/unit/sdk`, `testing/integration/sdk` and `testing/e2e/sdk`.

`bun run test:unit` is `tooling/scripts/run-tier.ts unit`; the console tests run in a process of their own because they install a browser DOM.

## Running product services

The infrastructure application in `apps/infra` creates the configured test and development stacks. Use `/dev:stack` with `project-stack`, `bun run dev` for development, and `bun run stack:up test` or `bun run stack:down test` for the test lifecycle. Read hosts and routes from `packages/config/src/environments.ts`. The API and app containers expose services through Caddy. Development reload uses mounted source; tests use packaged consumers and isolated scoped backends where migration has landed.

Current proxy coverage includes HTTP acceptance, packaged MCP, the scripted harness, assets, installed SDK E2E, SDK documentation and console UI scenarios. The complete API integration migration passed task 9.1 and the final full audit. Unit orchestration uses stubs; real consumers and stack lifecycle assertions belong in integration or E2E. Generated internal protocol reports describe the stack and negotiated HTTP versions. Client behavior guides remain generated in `apps/docs`.

## The stack

Infrastructure installer unit cases inject extraction results; real archive extraction belongs to `testing/integration/infra/install-bundles.test.ts`. Watcher unit cases simulate allocation failure and check cleanup. Live development reload proofs run through Caddy and restore all edited source bytes.

Each package depends only on the ones above it in this list.

1. `testing/packages/framework` (`@platform/test-framework`): token issuer, servers, databases, stream and error helpers, the browser DOM (`@platform/test-framework/dom`).
2. `testing/packages/factories` (`@platform/test-factories`): the case factories `positive`, `negative`, `rejected` and `unit`.
3. `testing/packages/scenarios` (`@platform/test-scenarios`): throw-away repositories, the scripted MCP harness, its scenario definitions and proxy fixtures.
4. `testing/packages/recorder` (`@platform/kb-recorder`): runs the scenarios against the real API, the SDK and the console and records the documentation.

The suites in `testing/unit`, `testing/integration` and `testing/e2e` form the top of the stack through `testing/package.json`.

## The 2x2 rule

A unit is an exported function of product source, found by `check-unit-cases.ts` in `packages/*/src`, `apps/*/src` and `tooling/scripts`. Every unit has at least two positive and two negative cases in a `unit(...)` call under `testing/unit`:

```ts
unit(parseName, {
  positive: [positive("a book", ["publishers/p/books/b"], { publisher: "p", book: "b" }), positive(...)],
  negative: [negative("no slash", ["x"], { code: "INVALID_ARGUMENT" }), negative(...)],
});
```

`positive` expects a return value, `negative` expects a thrown error that matches, `rejected` expects a failure value that is returned. The check fails for a unit with fewer cases and names the unit and the missing kind. Units not yet covered are listed in `testing/unit-debt.json`; a unit that gains its cases must be removed from the list, so the list only shrinks.

## Coverage

`bun run test:coverage` runs the unit and integration tiers with `bun test --coverage`, merges the reports and fails below 100% of lines and functions in product source, naming each file and line. It runs in `verify` and in the pre-push hook. Bun reports lines and functions only; branches are not measured.

The automated MCP harness uses deterministic scripted calls through Caddy and injected stubs for orchestration and transcript handling. It never starts a model CLI, reads provider credentials or requests inference. No model usage or token cost is permitted. `bun run mcp:harness-check` runs this cost-free check; `mcp:llm-check` remains a compatibility alias. The end-to-end harness case records scripted client exchanges; the fast source lane runs its stubbed unit tests.

The HTTP API acceptance suite runs through Caddy from an isolated edge client with the built curl client over HTTP/1.1, HTTP/2 and HTTP/3. Every request checks its negotiated protocol and certificate verification. Each protocol gets a fresh authenticated backend, and each case gets a separate publisher. The matrix retains lifecycle, ordering, permission, version and OpenAPI assertions and adds batches, NDJSON and incremental JSON input, operation lifecycle and ordered event responses, assets, administration and required-header refusals. Continuous administrator events use an explicit one-second client capture. Request headers, response headers and chunks are retained in arrival order. The recording is published only after all three protocol clients pass. Broader integration migration and whole-change documentation determinism remain open.

SDK documentation orchestration uses injected packing, recording and proxy lifecycle in unit tests. Its real output-path, page-count and refusal assertions run in the SDK end-to-end suite against the packed package through Caddy. These assertions were moved to their appropriate tier and remain blocking in full verification.

Installed SDK stream acceptance adds three real protocol clients to the existing thirteen SDK E2E cases. All sixteen cases passed in 300.86 seconds, including stack startup and teardown. Fifty-four successful calls feed the generated SDK stream guide. The API matrix separately records 183 successful calls and covers every declared operation and successful response form, including enabled alpha behavior, over each protocol. Current evidence is in the active change's `4.4-4.5-api-matrix.md` and `8.4-sdk-protocol-matrix.md`. These focused results do not replace a full audit or an independent second documentation run.

SDK integration now runs all twenty-one original cases in an isolated edge consumer through Caddy, plus a direct-backend refusal assertion. Per-case authentication and memory databases remain in the real source API backend. The backend runs as a Bun test with the existing metrics preload and exits gracefully before cleanup. Coverage orchestration passes `TEST_CHILD_REPORT_DIR` and merges nested LCOV and JUnit reports, retaining API and SDK source coverage and individual child timings. Ordinary fast integration runs do not request coverage. No model client or inference is involved.

The original MCP real-client and Inspector cases, Tasks cases, MCP E2E cases and package-skill E2E cases now run in isolated edge consumers against the source API through Caddy. Each suite adds a configured direct-port refusal. The Inspector keeps its Node runtime in the existing checks image identified by the Containerfile hash. Its stdout and stderr are drained together and nonzero exits fail. The Tasks helper preserves fixture path prefixes. Child coverage and timings use separate per-entry directories; a measured five-suite run retained all sixty-five client cases and seventy-five timings. The later complete proxy migration and full audit passed; see the archived final requirement audit.

The operation lifecycle, MCP operation events, HTTP/MCP parity and administrator event suites run in isolated edge consumers through Caddy. All sixty original cases and their deadlines remain; four direct-backend refusals bring the client total to sixty-four. A measured run merged 235 source files and seventy-two timings, with all twenty-two operation budgets passing. Per-case APIs keep separate databases and real JWT verification; operation groups share their real issuer through explicit fixture IDs. Browser preflight and skill-directory cases use the proxy too. The later complete proxy migration and full audit passed; see the archived final requirement audit.

Request and response streaming integration now uses isolated edge consumers through Caddy. The raw HTTP helper accepts an optional configured TLS origin, trusts only the supplied CA and writes after the verified handshake. All twelve original upload and response cases retain their assertions and deadlines; two direct-backend refusals bring the total to fourteen. Backend observations retain the chunked-upload assertion. An instrumented run passed with 233 source files, eighteen timings and all three operation budgets. Remaining authentication and adapter integration migration stays open.

Both MCP adapter integration suites now run their original forty-two cases through Caddy from isolated edge consumers, plus two direct-port refusals. Real source factories retain custom tools, invalid-token challenges, discovery, skills digests, origin policy, rate limits and lazy loading. The no-expiry negative provider remains a deterministic stub. Protected-resource metadata keeps both root and path-specific resource assertions. A measured run with SDK regression coverage passed sixty-six client cases and seventy-two timings, merging 222 source files with all sixteen API operation budgets passing.

Scoped proxy fixtures inspect the assigned edge address and pass explicit per-container host mappings for the configured proxy and backend aliases. This avoids transient DNS reload failures while independent networks are created concurrently. TLS still verifies the configured proxy hostname and scoped CA; the API stays private. Four consumers passed concurrently with all fifty-eight client cases and direct-port refusals retained.

API conformance and Better Auth integration run from isolated edge consumers through Caddy. All thirty-one original cases and their deadlines remain, plus two direct refusals. The API factory retains its enabled feature flag and captures the real logger output for credential-redaction assertions. Better Auth keeps real per-case databases, password sign-up, administrator role updates, client creation, token issuance and verification. Its scoped backend serves the current sequential case at the proxy root, matching its configured issuer and resource; control requests select the exact fixture ID. Key-rotation and unsafe-metadata probes remain unchanged. No model service or credentials are involved.

Domain conformance now runs all thirty-four original cases from an isolated edge consumer through Caddy, plus direct-backend refusal. Real JWKS and Better Auth providers retain valid-token and wrong-audience checks. The disabled-auth spy still proves no verification occurs; the database with only application tables is shared with the actual API through the scoped temporary mount. Pipeline spies, redaction and persistence checks remain unchanged. An instrumented run retained thirty-five client cases, thirty-seven timings and 208 source files; all eight operation budgets passed. The later E2E migration and complete audit passed; see the archived final requirement audit.

Custom-capability E2E now runs all six original cases through Caddy from an isolated edge consumer, including the real generated page over HTTP and MCP, plus direct-backend refusal. Its injected recorder retains scenario and transport forwarding; four stubbed cases prove forwarding and that failed steps or client errors publish no files. Conformance now checks that HTTP-only capabilities are absent from MCP instead of attempting to serialize their stream input. Recorder cleanup excludes the SQLite in-memory identifier. The actual API entry process is launched privately for lifecycle E2E; both original SIGTERM and SIGINT cases retain exit, timeout, flushed-log and trace assertions. Shared scoped files coordinate signals without exposing a backend control port. Fresh file objects avoid cached missing-file metadata. Lifecycle acceptance passed two client cases and nine assertions in 2.26 seconds including cleanup; custom acceptance retained seven cases and eight assertions. Its measured run merged 266 source files and nine timings, with both operation budgets passing. The later asset/list and recorder migration and complete audit passed; see the archived final requirement audit.

Asset and list conformance integration now runs through Caddy from isolated edge consumers. All fifty-one original cases remain, with two direct-backend refusals bringing the total to fifty-three. The real asset store uses its existing injected object clients in the backend; clients inspect actual stored keys and bytes through scoped fixture controls. Binary preservation, owner isolation, permissions, media and checksum cleanup assertions remain. Lists seed assets through HTTP and wait for both real operations to complete before comparing page snapshots; this removes a progress-update race without changing the equality assertion or case deadlines. The measured run retained 242 source files and fifty-seven timings, and all ten operation budgets passed. The later recorder migration and complete audit passed; see the archived final requirement audit.

The shared API/MCP recorder now runs normal page recording and live interface reads in isolated edge consumers through Caddy. All twenty-two scenarios produced 209 steps through the default path. Authentication E2E retained six original cases plus direct refusal; recorder E2E retained thirty-three original cases plus direct refusal, including every scenario over both transports and failed-publication assertions. Real Better Auth token issuance moved into the scenarios backend; clocks, flags and tamper databases retain their behavior. Raw missing-Accept calls verify TLS and preserve fixture prefixes. The scoped marker probe removes the marker only before the real application guard; separate edge-network checks prove the private API port is unreachable. The measured two-suite run retained forty-one client cases, forty-five timings and 274 source files; all twenty-seven operation budgets passed. The complete audit and independent documentation repeatability checks subsequently passed; see the archived final requirement audit.

The live API/MCP interface comparison runs in the integration tier. Its unit cases inject interface data; the live assertion and original deadline remain blocking in both delivery lanes.

Generated guides use labelled measurement placeholders and representative first/last progress samples. Complete input recordings, events and checks are saved under `.stack/e2e/raw-guides` before display conversion. Actual protocol recordings and metric budgets remain unchanged. Independent page hashes prove repeatability; rendering the same recording twice is only a focused regression check.
