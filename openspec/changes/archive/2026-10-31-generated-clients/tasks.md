## 1. Generator and Package

- [x] 1.1 Confirm the rejected hand-built SDK is removed; create `packages/sdk` workspace package
- [x] 1.2 Add `@hey-api/openapi-ts` pinned; config reading `openapi/baseline.json`, emitting client, operations and Zod schemas into `generated/`
- [x] 1.3 Add `bun run sdk:generate`; commit generated output
- [x] 1.4 Scope lint and format ignores to `generated/` only

## 2. Wrapper Helpers

- [x] 2.1 Token injection
- [x] 2.2 Error mapping to AIP-193 ErrorInfo reasons
- [x] 2.3 Async pagination iterator
- [x] 2.4 Operation wait helper with bounded polling
- [x] 2.5 Constants, messages and types placed in their packages; unit tests

## 3. Drift Gate and Hooks

- [x] 3.1 Regenerate-and-diff script
- [x] 3.2 Pre-commit job and `verify` step
- [x] 3.3 Hook-parity fixture test with a hand-edited generated file
- [x] 3.4 `DEV_RULES.md` row; knip config

## 4. SDK Integration Tests

- [x] 4.1 Real server harness with `Bun.serve` and `createApi`, auth off and on
- [x] 4.2 Books get, list, create, update, delete, archive, undelete, batchGet, reindex
- [x] 4.3 Config get and update, operations get, stats and logs
- [x] 4.4 Each AIP error status
- [x] 4.5 Pagination and LRO polling

## 5. MCP Real-Client Tests

- [x] 5.1 Add `@modelcontextprotocol/client`; tests for initialize, tools/list, tools/call, skills methods
- [x] 5.2 Add `@modelcontextprotocol/inspector` dev dependency; subprocess CLI tests for tools/list, tools/call, skills methods
- [x] 5.3 Schema parity test for every capability
- [x] 5.4 Manual Claude Code harness procedure with recorded expected output

## 6. Documentation

- [x] 6.1 SDK guide with Mermaid diagram
- [x] 6.2 MCP-client guide with Mermaid diagram
- [x] 6.3 `packages/sdk` README
- [x] 6.4 Confirm generated reference unchanged and docs build passes

## 7. Final Verify and Push

- [x] 7.1 `bun run verify` passes
- [x] 7.2 Commit and push to main

## 8. Browser End-to-End and Generated Evidence

- [x] 8.1 Add CORS for configured origins to the API, with a preflight test
- [x] 8.2 Stub authorization server with PKCE verification and its tests
- [x] 8.3 Browser scenarios drive the built console in real Chrome (sign in, live requests, request log filter, statistics, no admin scope); a failed expectation, page error, failed request, forbidden request or token in storage fails the scenario
- [x] 8.4 A passing run writes the knowledge-base pages and screenshots into the documentation; a failing run writes nothing (tested, including the reintroduced Node `Buffer` defect)
- [x] 8.5 The built documentation site is opened page by page in Chrome (no errors, images load, diagrams drawn, search works); the result is generated into an end-to-end report page with screenshots
- [x] 8.6 Tests are split into unit, integration and end-to-end tiers; a blocking `tiers` check keeps unit tests from opening ports, databases or processes; end-to-end files run in their own process
- [x] 8.7 shadcn/ui components and Tailwind for the console
