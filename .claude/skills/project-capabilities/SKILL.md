---
name: project-capabilities
description: Add or change a capability so it is served over HTTP, MCP, OpenAPI and skills. Use when defining a new capability, changing its schema, auth, policy, mask, cache or rate limit.
---

# Capabilities

A capability is one object made with `defineCapability` from `packages/capability`. It declares its id (a `CapabilityId` enum member), version, method, resource pattern, summary and description (text from `packages/messages`), auth mode (`none`, `optional` or `required`, always explicit), input and output Zod schemas and the handler.

## Steps

1. Add the id to the enum in `packages/constants` and the texts to `packages/messages`.
2. Write the capability in `apps/api/src/capabilities/`.
3. Register a loader in `apps/api/src/registry.ts`. Capabilities load lazily.
4. Run `bun run openapi:update` and `bun run sdk:generate`.
5. Add scenarios in `testing/packages/recorder/src/scenarios` so the documentation shows the capability, and unit tests with the 2x2 factories.
6. Run `bun run verify`.

## Example: the skills tools

`skills.list` and `skills.get` (`apps/api/src/capabilities/skills.ts`) are capabilities, so they are an HTTP route (`GET /v1/skills`, `GET /v1/skills/{skill}`), an MCP tool and an OpenAPI operation. They have auth mode `optional` and filter inside the handler by `context.principal`, using the same policy engine as the other tools. `createRegistry` takes a third argument, a provider of the skill options (the registry as source, the visibility rule, the policy gate, the skill directories); the default denies everything. A handler that needs more than the input is a separate exported async function taking the arguments, so it is testable with the 2x2 factories.

## Long-running operations (AIP-151)

A method that takes a long time returns an operation instead of its result. The Operations service is five capabilities in `packages/aip/src/operation.ts`, registered in `apps/api/src/registry.ts`: `operations.get`, `operations.list` (AIP-158 pages and a `done` or `name` filter), `operations.delete` (removes the record, admin scope), `operations.cancel` (`:cancel`, admin scope; a running operation ends with the CANCELLED error and a finished one is left as it was) and `operations.wait` (`:wait` with a `timeout` such as `5s`, at most 30 seconds). `OperationStore` also has `progress`, `shouldStop` and `watch`; a long handler starts an operation, reports progress, checks `shouldStop` between steps so a cancel is honoured, and completes it (`runReindex` in `apps/api/src/capabilities/books.ts` is the example). A finished or cancelled operation never changes again. The `reindexStepMs` option of `createApi` slows the steps so the documentation scenarios can cancel one; the recorder sets `DOCS_REINDEX_STEP_MS`.

## Event capabilities

A capability that can be followed as it changes declares `events: { name, source }`, where `source(input, context)` resolves to an async iterable of states (`operations.get` uses `OperationStore.watch`). One definition then has these faces. HTTP: the same route answers a stream when the request has `Accept: text/event-stream` (`packages/http-adapter/src/events.ts`: numbered frames, `Last-Event-ID` continues the numbering, a keep-alive comment while idle; the pipeline runs first, so a missing resource or a refused caller is an ordinary JSON error). OpenAPI: the 200 response lists both `application/json` and `text/event-stream`. MCP: a resource template `state://<resource>` (`packages/mcp-adapter/src/events.ts`) that clients subscribe to with `subscriptions/listen`, and a bounded-read tool derived with `watchCapability(base, id)` (`operations.watch`, MCP only, `timeoutMs` and `maxEvents` capped). A store tells MCP about a change by calling the change feed (`ChangeFeed` in `packages/events`, `OperationStore` takes its `onChange`). The documentation scenario `follow-a-long-running-operation` uses the `face` option of a step (`StepFace.Events`, `Listen`, `Resource`). The administrator stream is such a capability: `events.get` (`GET /v1/events`, admin scope) declares `item` for the shape of one frame (an API event) while its JSON form is the list of recent events; `EventBus.stream()` feeds it through `iterate` from `@platform/streams`, and the MCP tool `events.watch` collects frames for a short time. There is no separate SSE app.

## Required headers

`logs.list` answers newest first; the console asks for 100 and lists them oldest first as before. Every list capability follows AIP-158: `pageSize`, `pageToken` in the input, `nextPageToken` in the output, `paginate` from `@platform/aip`. `testing/integration/api/list-conformance.test.ts` fails when a list operation of the registry is not covered or does not follow it, or when the API description offers a stream for a list. The HTTP adapter refuses a request before the capability runs when it lacks what it needs: `Accept` is required and must allow `application/json` (or `text/event-stream` on an event capability), else `ACCEPT_REQUIRED` (400) or `ACCEPT_UNSUPPORTED` (406); a request with a body needs `Content-Type: application/json` or `application/x-ndjson`, else `CONTENT_TYPE_REQUIRED` (400) or `CONTENT_TYPE_UNSUPPORTED` (415). The code is `packages/http-adapter/src/headers.ts`. The API refuses a request without the proxy's `x-platform-proxy` secret with `PROXY_REQUIRED` (403) when `PROXY_SECRET` is configured (`proxyMarker` in `packages/security`, compared in constant time); Caddy adds the header. The SDK sends `Accept` and `Content-Type` by default. An operation whose input has one array field (a batch) also takes `Content-Type: application/x-ndjson`: each line is one element, validated on its own, and a bad line fails the request with its number (`packages/http-adapter/src/input.ts`, `collection.ts`); any other operation answers 415 for that type. A refusal drains the unread request body (`drain` in `@platform/streams`, up to 1 MiB) because the runtime leaves a kept-alive connection unusable otherwise.

## Extra capabilities

`createApi` takes `extraCapabilities` (a list of capabilities registered next to the built-in ones) and `skillDirs`. This is how a package adds its own capability; `testing/packages/custom-capability` is the working example.

## The pipeline

Book Update and Delete requests with an ETag validate it and pass the stored version to the repository's atomic conditional save. A failed comparison returns `ABORTED` and preserves the winning write. Requests without an ETag retain their unconditional write behavior. Deterministic SQLite integration tests synchronize both reads before competing writes.

`packages/pipeline` runs auth, rate limit, policy, validation, cache, handler, mask and observe in that order. A block a capability declares without an implementation fails at start-up.

## Async

The `aip` and `errors` helpers the pipeline calls are async, so build an error with `await`; `message` from `@platform/messages` stays synchronous. The pipeline, the capability registry, policy, rate limit, cache, masking and auth are async too; the pipeline clock (`now`) returns a promise. The exception is the work inside `BoundedStore.update`: its `change` callback and the store helpers stay synchronous so the read and the write cannot be interleaved by another caller. Every function in `apps/api/src` is async, including handlers, loaders and `createRegistry`. Call project functions with `await`, and pass a callback that returns a promise only to `Promise.all`, never to `filter`, `some` or `find` (a promise is always truthy).

The registry and the field behavior helpers run their parallel work with `all` from `@platform/util`, which caps how many tasks run at once.

The registry class declares its constructor and sets its fields in it: Bun counts an implicit constructor as a function that never ran, and 100% of functions is required (the same holds for every class in product source; a stateless class gets an empty constructor, allowed for its file in `biome.json`).

## Files

`packages/capability/src`, `packages/pipeline/src`, `apps/api/src/registry.ts`, `apps/api/src/capabilities`, `docs/quickstart-developer.md`.

## Raw assets

`assets.create` is HTTP only and declares `media` with a body field, media type field, checksum field and header, and an allow-list. The HTTP adapter passes the request stream and cancellation signal to the handler. Upload requires write scope; metadata and lists require read scope and filter by principal subject. `packages/assets` writes bounded multipart parts, verifies SHA-256, removes failed uploads and publishes private owner metadata only after completion. Limits and media types live in `packages/config/src/assets.ts`.
