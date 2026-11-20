## 1. Workspace and Mandatory Dev Standards

- [x] 1.1 Initialize Bun workspace root (`apps/*`, `packages/*`, `tooling/*`), shared strict `tsconfig`, all packages `private: true`, no `license` field and no `LICENSE` file
- [x] 1.2 Install Biome 2.6.4 pinned; configure format and lint for TS/JS/JSX/TSX/JSON/JSONC/CSS/GraphQL, `vcs.defaultBranch`, `noRestrictedImports`, `noRestrictedGlobals`; exclude md, yaml, yml, toml and experimental web formats from the formatter
- [x] 1.3 Configure dprint with Markdown, TOML, Dockerfile and `pretty_yaml` plugins only (no TypeScript or JSON plugin); pin plugin versions from `dprint add`; exclude MDX, Astro, HTML and generated KB
- [x] 1.4 Formatter-ownership test: run Biome and dprint twice over a fixture with every owned file type; second run changes nothing; run dprint and cspell under `bunx`, fall back to `npx` on Node 22+ if Bun fails
- [x] 1.5 Configure cspell 10: `cspell.json` (`version`, `language`, dictionaries `softwareTerms`, `typescript`, `node`, `npm`, `project-words` with `addWords`, `ignorePaths`, `useGitignore`, `failFast`); commit `project-words.txt`; fixture test for commit-message checking
- [x] 1.6 Configure lefthook: pre-commit in parallel (`biome check --write --no-errors-on-unmatched --files-ignore-unknown=true {staged_files}` with `stage_fixed: true`, `dprint fmt --staged`, `cspell --no-progress --no-must-find-files {staged_files}`, secret scan; the Biome plugin fixture job is added with task 2.6), pre-push (`{push_files}`, `dprint check`), commit-msg (commitlint + cspell); `prepare` script installs hooks; hooks fail when a tool cannot be resolved
- [x] 1.7 Secret scanner wrapper (`git diff --cached` through `gitleaks stdin` in pre-commit, `gitleaks git` in verify) plus secretlint; fixture test that a fake credential is rejected; ignore `.env*`; add `.env.example`
- [x] 1.8 Mermaid check script: parse every `mermaid` block in proposal, design, specs and docs with `mermaid.parse` (mermaid 12 under jsdom); wire to hooks and verify
- [x] 1.9 Add commitlint, knip and dependency audit
- [x] 1.10 `bun run verify` script running every mandatory check (biome ci, dprint check, cspell, secret scan, plugin fixtures, mermaid, knip, audit, tests, oasdiff, docs build); hook-parity test running each check on a known-bad fixture
- [x] 1.11 GitHub Actions workflows in `.github/workflows/`: only `workflow_dispatch`, `permissions: contents: read`, every job gated on `vars.CI_ENABLED == 'true'`, actions pinned to full SHAs with a tag comment, `oven-sh/setup-bun` reading the Bun version from `package.json`, job runs `bun run verify`; workflow lint rejects tag-only action references
- [x] 1.12 Add `CODEOWNERS` and a PR template with the standards checklist (no license file)

## 2. Constants, Types, Messages, Config

- [x] 2.1 Create `constants` package (headers, scopes, auth modes, event names, AIP field and query names, error reasons, canonical codes)
- [x] 2.2 Create `types` package (principal, context, event, stats types shared by api and console)
- [x] 2.3 Create `messages` package with typed catalog and id lookup
- [x] 2.4 Create `config` package with Zod-validated env parsing, secret-safe errors, production-only required settings (`auth.enabled`, Better Auth secret)
- [x] 2.5 Biome GritQL plugin `tooling/biome/no-inline-strings.grit` (`engine biome(1.0)`, `language js(typescript, jsx)`, `JsStringLiteralExpression() as $s`, `register_diagnostic` at error severity) registered under `plugins` with `includes` excluding constants packages and fixtures
- [x] 2.6 Plugin fixture suite with recorded outcomes for: inline literals, import sources, object keys, directives, enum names, template literals, `require()`, dynamic `import()`, computed keys, enum initializers, `as const`; try parent conditions with `biome search`; run via `biome lint --only=plugin`
- [x] 2.7 Suppression policy: reviewed plugin suppression comments require a reason; check fails otherwise
- [x] 2.8 Unit tests: config failures, catalog lookups

## 3. Capability Core and Pipeline

- [x] 3.1 Implement `defineCapability()`, registry and duplicate-id error
- [x] 3.2 Field behavior metadata on Zod schemas (`REQUIRED`, `OPTIONAL`, `OUTPUT_ONLY`, `IMMUTABLE`, `INPUT_ONLY`)
- [x] 3.3 Definition-time validation (explicit `auth` mode: `none`, `optional`, `required`)
- [x] 3.4 Pipeline with ordered steps and skip-when-absent semantics
- [x] 3.5 Unit tests for ordering, skipping, validation failure

## 4. AIP Package and Errors

- [x] 4.1 Resource-name parser/builder and id validation incl. NFC (AIP-122, 210)
- [x] 4.2 Wire-format normalizer: camelCase output, snake_case input, RFC 3339 and duration strings, strict unknown-field rejection (AIP-127, 140-143)
- [x] 4.3 Pagination helpers with opaque tokens (AIP-158)
- [x] 4.4 Field mask parser/applier and `view` handling (AIP-157, 161)
- [x] 4.5 Filter parser to typed AST with per-capability allowlist, `orderBy` (AIP-132, 160)
- [x] 4.6 `etag`, `requestId` replay store with TTL, `validateOnly` (AIP-154, 155, 163)
- [x] 4.7 Operation resource and `GET /v1/operations/{id}` (AIP-151)
- [x] 4.8 Soft delete helpers, state transition helper returning `FAILED_PRECONDITION` (AIP-164, 216)
- [x] 4.9 Batch helpers with atomic semantics (AIP-231, 233-235)
- [x] 4.10 Error builder: canonical code to HTTP table, `ErrorInfo` with reason regex and domain, metadata for dynamic values, permission-before-existence (AIP-193)
- [x] 4.11 Unit tests for each normative rule in the aip-conformance spec

## 5. Authentication and Security Middleware

- [x] 5.1 `auth` package: `AuthProvider` interface, principal mapping (anonymous, user, agent, scopes, roles), Hono middleware setting the principal, AIP-193 `UNAUTHENTICATED` with `WWW-Authenticate`
- [x] 5.2 Enablement: `auth.enabled`, per-capability modes, fail-closed `AUTH_NOT_ENABLED`, filtering of required capabilities from MCP and skill listings
- [x] 5.3 `jwks` provider: issuer, JWKS URL, audience from config, jose `createRemoteJWKSet` and `jwtVerify`, cached JWKS, one refetch on unknown `kid`, `expiresAt` required, query-string tokens ignored
- [x] 5.4 `auth-better-auth` package: Better Auth with `jwt()` and `mcp()` and `admin()` plugins, `/token` disabled and `disableSettingJwtHeader` set, Drizzle over `bun:sqlite`, mounted in Hono before catch-all routes with CORS and `trustedOrigins`, `basePath` configurable
- [x] 5.5 Better Auth safety checks: secret at least 32 characters, no localhost in production `trustedOrigins`, DCR off, secret rotation setting, built-in rate limit on in production
- [x] 5.6 Protected Resource Metadata at the RFC 9728 path for the configured resource; `WWW-Authenticate` challenges
- [x] 5.7 CIMD fetch transport for Bun (pinned addresses, no redirects)
- [x] 5.8 Test issuer with JWKS in `testkit` for tests without Better Auth
- [x] 5.9 Rate limiter per principal and capability with `Retry-After` and `ErrorInfo.metadata`
- [x] 5.10 Cache with scope-aware keys storing pre-mask values; map to MCP `ttlMs`/`cacheScope`
- [x] 5.11 Security headers and origin validation
- [x] 5.12 Tests: auth off, auth on, each mode, wrong audience, expired token, two-principal cache isolation; Bun integration test of Better Auth sign-up, authorize, token, JWKS verify

## 6. Policy and Masking

- [x] 6.1 Policy engine with anonymous, user and agent principals, typed reasons
- [x] 6.2 Masking middleware with remove, replace and partial strategies
- [x] 6.3 Export shared sensitive-path list
- [x] 6.4 Decision and masking events to the bus
- [x] 6.5 Tests: capability with neither, only policy, only mask, both

## 7. HTTP Adapter and OpenAPI

- [x] 7.1 Hono adapter generating one route per capability under `/v1`
- [x] 7.2 Path-rewriting `fetch` wrapper for `:verb` custom methods; exhaustive tests including encoded ids, collection-level verbs and wrong HTTP method
- [x] 7.3 Map pipeline errors to AIP-193 responses
- [x] 7.4 Generate and serve OpenAPI 3.1 via `doc31`; bearer JWT scheme only on `required` operations; public `:verb` paths; `readOnly`/`writeOnly`
- [x] 7.5 oasdiff `breaking --fail-on ERR` gate against a committed baseline
- [x] 7.6 Tests: route generation, `openapi: 3.1.0`, adapter-has-no-security-imports

## 8. MCP Adapter and Skills

- [x] 8.1 Mount `createMcpHandler` via `createMcpHonoApp`; per-request factory builds the tool set from the caller's `authInfo`; `legacy` mode configurable
- [x] 8.2 Capability to `registerTool` projection with Zod 4 schemas and AIP-derived annotations
- [x] 8.3 Cache hints on discover, tools/list and resources results
- [x] 8.4 Wire the SDK `requireBearerAuth` and metadata response to the `AuthProvider`; authless tools callable without a token
- [x] 8.5 `SkillSource` over the registry using `skillEntry`; policy-filtered list/get/read; `getPrincipal(ctx)` helper reading `ctx.http?.authInfo` then `ctx.authInfo`
- [x] 8.6 Skill file generator (SKILL.md, references) at build time with digest-change test
- [x] 8.7 Tests: header mismatch, 405, legacy-era client, `-32602` cases, digest and limits
- [x] 8.8 Integration tests: HTTP and MCP parity for every capability, with auth on and off
- [x] 8.9 Conformance test of the resource identifier choice using the SDK client

## 9. Persistence POC

- [x] 9.1 `db` package with Drizzle bun-sqlite, example schema and repository interface
- [x] 9.2 Generate Better Auth tables with `auth generate --adapter drizzle` into the schema; verify the adapter import path against the pinned package
- [x] 9.3 Generate and commit initial migration; migrate command and startup apply
- [x] 9.4 CI-independent check for schema/migration drift in `verify`
- [x] 9.5 Example capabilities for `publishers/{publisher}/books/{book}`: Get, List, Create, Update, Delete (soft), `:archive`, `:undelete`, `:batchGet`, one LRO, one singleton config; at least one `auth: 'none'`, one `optional`, the rest `required`

## 10. Observability

- [x] 10.1 Logger package on pino: synchronous stdout, no worker transports, redact list from masking export
- [x] 10.2 Telemetry package: OTel API/SDK, manual spans per capability, metrics, trace ids in log bindings
- [x] 10.3 Typed event bus and admin-scoped SSE endpoint
- [x] 10.4 Stats and recent-logs capabilities for the console
- [x] 10.5 Bun smoke tests: clean shutdown with flushed logs, spans emitted

## 11. Test Harness and KB Recorder

- [x] 11.1 `testkit` helpers: test server, principals, isolated database
- [x] 11.2 Narrative e2e scenario format (title, intent, steps)
- [x] 11.3 `kb-recorder`: capture HTTP and MCP exchanges, apply masking and scrubber, emit MDX
- [x] 11.4 E2E scenarios for each example capability on both transports, with and without auth
- [x] 11.5 `verify`: secret scan of generated MDX

## 12. Docs App

- [x] 12.1 Scaffold Astro Starlight; register `astro-mermaid` before `starlight()`; Expressive Code themes
- [x] 12.2 Generate API reference from OpenAPI and MCP/skills reference from the registry
- [x] 12.3 Wire KB content collection to recorder output
- [x] 12.4 Guide pages (architecture, auth modes and providers, policy and masking, AIP mapping, retry guidance from AIP-194, standards, running `verify`, enabling CI) with Mermaid diagrams
- [x] 12.5 Link check, spell check and build in `verify`

## 13. Console App

- [x] 13.1 Scaffold React + Vite strict TypeScript app with Refine (headless), shadcn/ui components, Recharts via shadcn chart, TanStack Table; shared types package
- [x] 13.2 Refine `authProvider` over the bearer JWT: authorization-code flow with PKCE, token in memory only, `admin` scope required
- [x] 13.3 Read-only `dataProvider` (list and getOne only) and `liveProvider` adapter over `EventSource` (subscribe/unsubscribe, no publish) with schema validation and drop-and-count of malformed events
- [x] 13.4 Live request stream view
- [x] 13.5 Log view with filters (virtualized rows)
- [x] 13.6 Per-capability stats view with charts
- [x] 13.7 Tests: no admin scope means no data; reload loses the token; no non-GET requests apart from auth; live row appears on an SSE event; fall back to shadcn/ui + TanStack only if Refine adds more than it saves

## 14. Final Verification

- [x] 14.1 Run `bun run verify` (unit, integration, e2e, all gates) under Bun
- [x] 14.2 Confirm hooks and `verify` reject: raw string, unformatted TS, unformatted Markdown, secret, misspelling, broken Mermaid diagram, breaking spec change, tag-only action reference
- [x] 14.3 Resolve the Open Questions in design.md with recorded outcomes
- [x] 14.4 `openspec validate bun-capability-platform`

## 15. Rule Remediation (rejected delivery: rules were not followed)

- [x] 15.1 Probe the Biome node names for string-literal types, interfaces, type aliases and inline object types; record them in the fixture suite
- [x] 15.2 Convert every constant object to a real TypeScript `enum` in the constants package; fix all consumers
- [x] 15.3 Move every environment variable name, separator, error name and header value into constants; remove the config package from the raw-string exemption and fix its violations
- [x] 15.4 Rebuild the types package: Zod schemas with inferred types for every data shape (config, errors, events, principal, capability blocks, pipeline record, filter AST, operation), grouped by domain folder
- [x] 15.5 Move every behavioral contract (AuthProvider, RateLimiter, PolicyEngine, ResponseCache, Masker, Observer, PageTokenCodec, SkillSource-style interfaces) into the types package
- [x] 15.6 Remove every local interface, type alias, inline object type and string-literal union from the other packages
- [x] 15.7 Biome plugins: forbid string-literal types, interfaces, type aliases and inline object types outside the allowed packages; extend the fixture suite
- [x] 15.8 Nesting check: script enforcing at most two levels of control-flow and callback nesting and object-literal nesting; fix every violation
- [x] 15.9 Rule registry mapping each development rule to its blocking pre-commit job, with a test that every job exists in lefthook.yml and `verify`
- [x] 15.10 Add every new check to lefthook pre-commit and to `bun run verify` as blocking jobs
- [x] 15.11 Rewrite the tests: remove filler, flatten, replace loops and try blocks with `test.each` and rejection matchers; add a test-quality check for loops and try blocks in tests
- [x] 15.12 Write the root README, the developer quickstart, the API consumer quickstart, the agent quickstart, `DEV_RULES.md` and a README for every package; add a check that every package has one
- [x] 15.13 Run `bun run verify`, commit through the hooks and push to main

## 16. Async, lazy, bounded state and no comments

- [x] 16.1 Add the `no-comments` rule (TS, TSX and YAML) with an allow-list of reasoned directives; strip every existing comment
- [x] 16.2 Add the `sync-api` rule; convert all tooling scripts and tests to asynchronous file and process APIs
- [x] 16.3 Add the `eager-collection` rule and the `store` package (`BoundedStore`, `lazy`) with tests
- [x] 16.4 Move cache, rate limiter, operation store and idempotency store onto `BoundedStore`; make the capability registry lazy
- [x] 16.5 Register both rules in `RULE_JOBS`, `DEV_RULES.md` and design D21
- [x] 16.6 Ban all comments including directives; move exceptions into tool configuration; add the `strip-comments` wipe to the pre-commit `biome` and `dprint` jobs
- [x] 16.7 Add non-blocking lazy-loading warnings (`eager-invocation`, `heavy-import`) with a configured ignore list
