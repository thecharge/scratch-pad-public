---
name: project-openapi-sdk
description: Work with the OpenAPI baseline and the generated SDK package. Use when an API change breaks the openapi check, when regenerating or packing the SDK, or when its license or pack check fails.
---

# OpenAPI and SDK

The OpenAPI document is generated from the capability registry. `openapi/baseline.json` is the committed snapshot; `oasdiff` fails a breaking change against it.

## Commands

- `bun run openapi:check`: compare the generated document with the baseline.
- `bun run openapi:update`: accept an intended change.
- `bun run sdk:generate`: regenerate `packages/sdk/generated` with `@hey-api/openapi-ts`. Nothing there is edited by hand.
- `bun run tooling/scripts/build-sdk.ts`: build `packages/sdk/dist` (JS and declarations).
- `bun run tooling/scripts/check-sdk-pack.ts`: the packed SDK must import no `@platform/*` package or source path.

## The SDK package

The generator configuration disables crash-report files with `logs.file: false`; failures still appear in command output. SDK error logs are not ignored, and the final `untracked` verification phase rejects leftover files.

It is the only publishable package: not private, version, `files`, `exports` and `types` pointing at `dist`, no `workspace:` dependency, `"license": "Apache-2.0"` and a LICENSE file. Every other manifest is private with no license.

## Async

The generator awaits the `aip` and `errors` helpers. In the SDK, `unwrap` and `waitForOperation` are async and `createSdkClient` is async too: consumers write `await createSdkClient(...)`. The served document is built through `lazy(...)`, a loader you call with `await`. `packages/openapi/src` (the generator and the served document) is async from `generateOpenApi` down. The scripts (they use `filterAsync`, `flatMapAsync`, `someAsync`, `everyAsync`, `findAsync` and `reduceAsync` from `@platform/store` when a callback awaits) and `packages/openapi/src` are async: `createRegistry`, `generateOpenApi` and the registry `list` are awaited before their result is used.

The OpenAPI generator builds its operations with `all` from `@platform/util`, not `Promise.all`.

The SDK generator, the pack check and the API page generator run their parallel work with `all` from `@platform/util`. `generatedCodeTypechecks(project?)` takes the tsconfig to check and `currentDocument(title?, version?)` the document info, `buildSdk(outDir?)` the output folder and `packSdk(build?)` the build step, so the unit suites can call them on fixtures.

The entry points of the SDK scripts return exit codes and take their targets as parameters: `runBuildSdk(outDir?, execute?)`, `runGenerateSdk(mode, target?)`, `runOpenApi(mode, baseline?)`, `checkSdkPack(pack?)`, `generateApiDocs(outputDir, sdkEntry?)` and `packSdk(build?, tar?, packageDir?)`.

## Files

`tooling/scripts/openapi-check.ts`, `generate-sdk.ts`, `build-sdk.ts`, `check-sdk-pack.ts`, `generate-api-docs.ts`, `packages/openapi/src`, `packages/sdk/package.json`, `docs/sdk.md`.

## Event responses

The document also says how the headers work: OpenAPI ignores `Accept` and `Content-Type` as header parameters (S30), so every operation lists 406, an operation with a body lists 415, an operation that takes a collection lists `application/x-ndjson` next to `application/json` as a request body, and `info.description` states the header rules (`packages/openapi/src/generate.ts`; the collection is found by `collectionOf` in `@platform/aip`). A capability with an `events` source gets `text/event-stream` next to `application/json` in its 200 response (`successContent` in `packages/openapi/src/generate.ts`). `followOperation(client, name)` in `packages/sdk/src/follow.ts` reads the stream form of an operation (`Accept: text/event-stream`, `parseAs: "stream"`): it yields each state until the operation is done, raises the typed error of an operation that ended with an error, and raises an unavailable error when the stream ends before `done`, a frame is not valid or the answer is not a stream. Lists are read with `paginate`. The SDK sends `Accept` and `Content-Type` by default. When the events source declares an `item` schema (the administrator stream `events.get` does: one API event per frame, while the JSON form is the list of recent events), the stream form is described with that schema.

Default SDK packing builds in a temporary package containing the manifest, license and readme, so concurrent consumers never clean shared SDK output. Injected builds retain their supplied package directory. The migration drift fixture lives outside the source tree and imports the schema and SQLite helpers by resolved absolute paths.

## Asset streams

A capability with `media` declares binary request bodies under its accepted media types and a required SHA-256 header in OpenAPI. `uploadAsset` sends a ReadableStream without JSON serialization and validates returned metadata. `downloadAsset` obtains owner-authorized metadata, then reads its signed URL as a ReadableStream without forwarding bearer credentials to the object store. Its minimal client contract is defined in `packages/types/src/sdk.ts`. The SDK fixtures instantiate the built SDK client and exercise the source helpers.

runGenerateSdkDocs accepts an injected generator for command-wrapper tests. generateSdkDocs accepts injected packing, recording and proxy lifecycle for unit tests. Its four original real documentation assertions now run through Caddy in the SDK E2E suite.

The SDK E2E suite injects `sdkProxySession` and `sdkProxyRunner` into the existing recorder. Each API session uses a fresh scoped backend reached through Caddy; the installed SDK consumer runs on the edge network, and declaration compilation runs in a container with networking disabled. Normal SDK documentation generation uses the same proxy session and consumer executor. It runs scenarios sequentially, closes the proxy and removes its packed temporary package on success or failure.

The SDK build command wrapper injects its builder for unit tests. Real successful outputs, emitted bundle and invalid-output assertions remain in SDK pack integration; fixture preparation is included in suite and shipment time. Build and declaration failures propagate unchanged.

Installed SDK protocol acceptance uses the packed package with its import external to the scenario bundle. The consumer checks its installed runtime path and injects the real curl protocol transport through the generated client configuration. The suite retains its native-fetch consumer and declaration assertions and adds JSON, pagination, typed errors, event and input/output stream cases over HTTP/1.1, HTTP/2 and HTTP/3. Its three successful recordings feed the additional generated stream guide.

The repository SDK guide describes protocol transport injection and distinguishes it from native fetch protocol support. It links the successful aggregate recording to the generated stream guide and retains the remaining integration and determinism gaps.

SDK integration now runs all twenty-one original cases in an isolated edge consumer through Caddy, plus a direct-backend refusal assertion. Per-case authentication and memory databases remain in the real source API backend. The backend runs as a Bun test with the existing metrics preload and exits gracefully before cleanup. Coverage orchestration passes `TEST_CHILD_REPORT_DIR` and merges nested LCOV and JUnit reports, retaining API and SDK source coverage and individual child timings. Ordinary fast integration runs do not request coverage. No model client or inference is involved.

Recorder unit fixtures obtain their real SDK from an isolated pack and pass its entry explicitly. They do not clean or rebuild the workspace SDK declarations while concurrent type checking reads them. Package extraction, bundle presence and generation assertions remain unchanged.

`generateApiDocs` accepts injected live-interface and page readers for unit cases. These cases render the actual baseline and isolated packed SDK without starting the recorder proxy. Its default arguments keep real proxy recording in documentation production.

API reference examples save their original recordings through guidePage and use the same labelled display copies as client guides. This changes example presentation only; OpenAPI schemas, the committed baseline and generated SDK contracts remain unchanged.
