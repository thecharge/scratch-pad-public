---
name: project-docs
description: Generate and check the documentation: scenarios, generated pages, the docs site, plain language, concrete URLs. Use when changing a scenario, a page or the docs build.
---

# Documentation

The site in `apps/docs` is for clients only. Every behavior page is generated from end-to-end scenarios; a failing step publishes nothing.

## Commands

- `bun run kb:record`: run the scenarios and write the pages.
- `bun run docs:build`: record, generate the client reference pages and internal reports, build the site once, open every page in a real browser and write the internal browser report. End-to-end invokes this build, so full verification does not repeat it.
- `bun run tooling/scripts/check-docs-scope.ts`, `check-plain-language.ts`, `check-concrete-docs.ts`, `check-error-cases.ts`: the documentation checks. Each exports an async entry point (`checkDocsScope`, `checkPlainLanguage`, `checkConcreteDocs`, `checkErrorCases`) that takes the repository root and returns the exit code, so the unit suites call it on a temporary repository.

## The end-to-end run writes the pages

`build-docs.ts` records the elapsed time and result of scenario recording, each generator, site build and browser verification in `.stack/verify/docs-phases.json`. The report is cleared before work and saved even when a phase throws. Counts returned by generators are values, not exit statuses. A failed site build still prevents browser verification. Timing instrumentation does not reuse recordings or bypass any check.

`bun run test:e2e` runs every end-to-end file and, only when all pass, runs `tooling/scripts/build-docs.ts`. Client API, MCP, SDK and administrator UI behavior guides go into `apps/docs`. Test performance, protocol verification and browser reports go into repository `docs/e2e`; browser report screenshots go into `docs/e2e/screenshots` with relative links. When any test fails nothing is written (`finishRun` in `run-tier.ts`). The recordings are staged in a temporary folder and copied only when every scenario passed.

A second independent run must leave generated client page text byte-identical. The scenario servers take a tick clock (`createTickClock` from `@platform/test-framework`, passed as `now` to `createApi`) so times, etags and latencies are fixed. `stabilizeResults` numbers the ids (request ids, operation ids) by first appearance and replaces any other timestamp. Retain actual values in internal recordings. The user approved labelled measurement placeholders, combined transport read boundaries and representative first/last progress samples in guide copies.

## Hung browsers

Chrome sometimes disappears without Playwright noticing under Bun: the process is gone, a pending call never returns and the run used to hang. Each browser scenario now has a deadline (`UI_SCENARIO_TIMEOUT_MS`), is retried up to `UI_SCENARIO_ATTEMPTS` times when it times out, and the whole recording has a deadline. A recording takes the lock `withUiLock` so the docs and kb hook jobs never run two browser recordings at once. Failure names the scenario and the seconds.

## Authentication and custom capability pages

`authentication-jwks` and `authentication-better-auth` show the five cases (no token, valid token, too little scope, expired token, other audience) over HTTP and MCP with a status check and a challenge check. `custom-capability` shows a capability, a tool-only item and a package skill from `testing/packages/custom-capability`.

## Headers in scenario steps

A step shows the headers it sent: `Accept`, `Content-Type` when it has a body and `x-platform-proxy` as `<proxy secret>`. A raw request may leave a header out with `omit` (a request without `Accept` goes over a raw socket because `fetch` always adds one). A scenario with `behindProxy: true` runs against an API that requires the proxy secret and sends it, so a step can show the refusal when it is left out. The scenario `required-headers` documents each refusal.

## What a generated step shows

A flag (passed or failed), where to go (a full URL), the action (for example a complete curl command), the expected result and the checks. The URLs come from `packages/config/factual-urls.json`; while they are empty the pages show localhost and a warning.

## Rules

Pages follow ISO 24495-1: title, description, a category folder, sentences of at most 30 words, no banned words. Development pages (architecture, standards, how we test) live in `docs/`, not on the site.

## Async scripts

The documentation check scripts are async and use `filterAsync`, `flatMapAsync`, `someAsync`, `everyAsync`, `findAsync` and `reduceAsync` from `@platform/store` where a callback awaits.

The documentation checks and the API page generator run their parallel work with `all` from `@platform/util`, not `Promise.all`.

`build-docs.ts` exports `buildDocs(root?, record?, build?, browse?, sdk?)`, `astroBuild(root, command?)` and `browseAndReport(root, browse?)` so the unit suites run the whole documentation build against stub steps.

## Files

`testing/packages/recorder/src`, `tooling/scripts/build-docs.ts`, `apps/docs/astro.config.ts`, `tooling/scripts/check-docs-scope.ts`.

`build-docs` (`tooling/scripts/build-docs.ts`) writes internal reports after a passing end-to-end run: `docs/e2e/performance.md` from `tooling/scripts/generate-performance-docs.ts` and `docs/e2e/protocols.md` from `tooling/scripts/generate-protocol-docs.ts`. The browser check writes `docs/e2e/report.md`. They are never public site routes or navigation entries. With no run files the performance and protocol reports are left as they are.

Live asset steps are saved under `.stack/e2e/assets.json`. `generate-asset-docs.ts` validates the recording and refuses failed steps before rendering the client asset guide. Binary curl examples use a file body and the recorded media type. Signed download URLs are hidden in displayed metadata, and ids and timestamps use the existing deterministic normalizer. This generator runs only in documentation production; a failing tier never reaches publication.

The SDK documentation command accepts an injected generator for wrapper tests. `generateSdkDocs` injects packing, recording and proxy lifecycle for unit coverage; its real output-path and refusal assertions live in the SDK E2E suite and retain the actual packed consumer. Normal documentation production starts the proxy stack and runs that real recorder.

The packaged MCP suite records actual protocol requests, progress event frames, subscription acknowledgement order, authentication challenges and skills calls. It writes `.stack/e2e/mcp.json` only after the client assertions pass. `generate-mcp-docs.ts` validates the recorded page, refuses failed steps and renders `api-calls/mcp-tasks-and-progress.mdx` during documentation production. MCP evidence can carry the complete JSON-RPC envelope; the renderer keeps its method, metadata and request headers and labels event streams as text.

The plain-language checker recognizes code fences at line boundaries, so Markdown embedded in a recorded JSON skill does not turn response bytes into prose. Prose after the closing fence remains checked.

The documentation builder accepts its SDK page producer as an optional dependency. Wrapper tests inject it; the SDK recorder tests and normal end-to-end documentation production still run the real recorder.

The HTTP API acceptance client records request headers, status checks, negotiated protocol, response headers and JSON or event chunks in arrival order. Its packaged proxy suite runs all cases over HTTP/1.1, HTTP/2 and HTTP/3 and writes `.stack/e2e/http-api.json` only after every protocol passes. A continuous administrator event response records its explicit client capture duration; operation event responses run to completion. `generate-http-api-docs.ts` validates and renders the client guide during documentation production, refusing failed, missing or malformed evidence. Broader operation and protocol coverage remains tracked in the active product change.

The SDK scenario and page recorders forward optional session and command executors. Both the proxy suite and normal SDK documentation generation supply them for installed consumers. Proxy scenarios run sequentially against fresh scoped backends; pages are written only after all scenarios pass. Generator cleanup closes the proxy and removes its packed temporary package even after recording failure.

Workflow documentation distinguishes internal generated stack reports from client behavior guides and states the current migration gaps. Use `docs/e2e/protocols.md` for observed stack and negotiated-version results; do not insert infrastructure control commands into client behavior pages.

Console documentation recording builds for the test proxy and runs the existing browser scenarios in an edge-network checks container. The scoped backend serves that console build and the shared PKCE stub alongside its API. Seeding and action requests use Caddy. The browser imports the local Caddy root into its certificate database; TLS verification remains enabled. Screenshots and typed results return through an isolated temporary file; publication still follows all scenario assertions. The UI acceptance suite owns one stack for its existing successful, contradictory and defective-source cases. Default recording owns startup and teardown.

The concrete curl renderer compacts only JSON request bodies. NDJSON, plain text and literal asset input retain their recorded content under `--data-raw`, including newlines and leading at signs. File bodies retain the existing `--data-binary` form.

The recording page generator accepts explicit input and destination paths while preserving its original API defaults. Documentation production also consumes `.stack/e2e/sdk-protocols.json` for the installed SDK stream guide. The SDK suite clears that recording before setup and writes it only after all three protocol clients pass. Failed clients cannot publish the guide.

The stream guide generator recognizes signed download requests and renders the existing metadata-to-DOWNLOAD_URL shell pattern. It refuses a signed download without a preceding metadata request. It never substitutes the API host for the signed object-store URL. SDK event and binary response labels follow their recorded Accept headers.

Published protocol guides replace opaque page tokens and signed URLs with named placeholders and say to obtain current values from preceding responses. Raw successful recordings retain the observed values. Runtime metrics and response chunks remain evidence; this display policy does not prove independent-run determinism.

The documentation development command relies on the site build and browser verification already performed by the complete end-to-end tier. A separate docs build is explicit work, not an automatic duplicate after a passing tier.

Opaque pagination placeholders use `PAGE_TOKEN` without angle brackets. The same value can appear in generated headings, where angle brackets would be interpreted as MDX tags. The generator keeps the observed response and substitutes only the documented display placeholder.

The UI recorder subprocess writes its validated path list to a private temporary manifest. Stack diagnostics remain on the log streams. The parent removes stale manifests before launch, refuses missing or malformed results and removes the manifest before successful publication. A successful process exit alone does not publish a recording.

The documentation build wrapper also injects its API page generator. Unit orchestration cases use a stub count; the real API recorder and E2E tier retain their scenario assertions. Default documentation production still calls the real API generator.

Custom-capability E2E now runs all six original cases through Caddy from an isolated edge consumer, including the real generated page over HTTP and MCP, plus direct-backend refusal. Its injected recorder retains scenario and transport forwarding; four stubbed cases prove forwarding and that failed steps or client errors publish no files. Conformance now checks that HTTP-only capabilities are absent from MCP instead of attempting to serialize their stream input. Recorder cleanup excludes the SQLite in-memory identifier. The actual API entry process is launched privately for lifecycle E2E; both original SIGTERM and SIGINT cases retain exit, timeout, flushed-log and trace assertions. Shared scoped files coordinate signals without exposing a backend control port. Fresh file objects avoid cached missing-file metadata. Lifecycle acceptance passed two client cases and nine assertions in 2.26 seconds including cleanup; custom acceptance retained seven cases and eight assertions. Its measured run merged 266 source files and nine timings, with both operation budgets passing. The later asset/list and recorder migration and complete audit passed; see the archived final requirement audit.

The shared API/MCP recorder now runs normal page recording and live interface reads in isolated edge consumers through Caddy. All twenty-two scenarios produced 209 steps through the default path. Authentication E2E retained six original cases plus direct refusal; recorder E2E retained thirty-three original cases plus direct refusal, including every scenario over both transports and failed-publication assertions. Real Better Auth token issuance moved into the scenarios backend; clocks, flags and tamper databases retain their behavior. Raw missing-Accept calls verify TLS and preserve fixture prefixes. The scoped marker probe removes the marker only before the real application guard; separate edge-network checks prove the private API port is unreachable. The measured two-suite run retained forty-one client cases, forty-five timings and 274 source files; all twenty-seven operation budgets passed. The complete audit and independent documentation repeatability checks subsequently passed; see the archived final requirement audit.

API reference unit cases inject live-interface and recorded-page readers. They still render the actual baseline and packed SDK reference, but start no proxy or model process. Normal documentation production retains fresh proxy recordings.

Large recorded response and chunk-transcript blocks use plain text after 4096 characters, including the concrete-URL renderer. The complete recorded text remains present. Regression cases cover the threshold and both URL paths. All forty-six built pages passed browser assertions after this repair; final whole-change verification remains required.

Browser proxy entry waits within the existing step timeout until Linux reports no tentative IPv6 address before launching Chromium. The readiness predicate has two positive and two negative stubbed cases. The proxy hostname maps to its inspected edge address while TLS validation and every UI assertion remain unchanged. Request-error evidence retains the actual browser failure reason. No scenario retry or error suppression is added.

Independent page comparison is a separate acceptance proof. A passing build and browser run does not prove repeatable page bytes. Preserve live metrics, protocol captures and assertion evidence, record any differing pages, and leave the OpenSpec determinism task open until the chosen presentation behavior is implemented and independently repeated. Fixed-clock MCP fixtures and isolated asset owners prevent unrelated runtime state from entering their guides.

The packaged MCP Tasks fixture uses a fixed book name inside its isolated memory database and the injected clock. This avoids random identifiers changing content-derived ETags. It does not normalize progress events or process metrics. Independent repeat recordings must still prove documentation determinism.

Guide writers call guidePage after assertions pass. It saves the complete input with a content digest under .stack/e2e/raw-guides before creating a display copy. Numeric metrics in stats snapshots become labelled values, JSON keys are sorted, read chunks are combined and only first/last MCP progress notifications are shown. Other events, errors, headers, protocols, checks and flags remain. Evidence write failures prevent guide output; malformed payloads are retained. API reference examples use the same display boundary.

Isolated proxy recorder clients retain the source mount read-only and mount only .stack/e2e/raw-guides writable. Create that evidence directory before container startup. Complete raw pages can then be retained before guide publication without granting write access to source.

HTTP and installed-SDK guide generation save the original validated page before removing authorization headers or replacing signed URLs and opaque values in the display copy. Nested page tokens are labelled even inside combined read chunks. Numeric progress counters use a labelled sample value while total workload, complete result/error events and all raw progress events remain recorded. Malformed progress parameters are retained unsampled.

Internal performance generation reads current benchmark recordings from .stack/benchmarks. It leaves those complete recordings unchanged and never writes into an archived change.

Guide copies show one successful working-task poll per task handle before id normalization. Complete terminal results, errors, malformed responses, failed checks and other methods remain. Complete raw pages are saved before sampling; the guide labels repeated polling as representative. Independent captures with differing poll counts must produce identical display pages.

Repository narrative Markdown and active OpenSpec documents have a blocking local-link check in tooling/scripts/check-document-links.ts. It parses CommonMark links/images/reference definitions and checks local targets and heading fragments, including references from unchanged documents to deleted targets. Site MDX/navigation is still verified by the full documentation build. Generated pages and raw evidence never qualify for reduced document shipment.
