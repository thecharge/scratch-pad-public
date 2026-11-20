---
name: project-mcp-skills
description: Work on the MCP server, the skills it serves and MCP conformance. Use when changing tools, the Skills extension, skill sources or the MCP clients guide.
---

# MCP and skills

The API runtime image includes `packages/skills/skills`, including reference files, at the default configured path. The packaged stack tests list and read package skills through Caddy and verify administrator-only visibility. A source-run catalog alone does not prove packaged delivery.

`packages/mcp-adapter` serves every capability as an MCP tool at `/mcp` with the official TypeScript SDK. Tool lists vary by caller because the registry is filtered by policy.

## Skills

`packages/skill-protocol` publishes skills through the SDK's Skills extension (`skills/list`, `skills/get`, `skill://<name>/SKILL.md` URIs, sha256 digests, at most 512 files and 16 MiB per skill). Skills come from two places: the capability registry (one generated skill per resource collection) and skill packages. A skill package is a directory of skill directories; the default is `packages/skills/skills` and `SKILL_DIRS` (comma-separated) in `packages/config` overrides it. A package skill is `<name>/SKILL.md` with frontmatter `name` equal to the directory and `description`, plus optional text files; its access is declared in the frontmatter `metadata` (`auth`, `scopes`, `roles`, `kinds`) and evaluated by the same policy engine as tools (`allowed` in the MCP and skill options). `loadPackageSkills`, `inspectSkill` and `skillPackageProblems` in `packages/skill-protocol/src/package.ts` read and validate them asynchronously from disk on each request. A package skill with the name of a generated skill replaces it. The text of a generated reference (the two JSON Schemas of a capability) is kept per capability object in the `references` cache that the API instance passes in the skill options (`ReferenceCache` in `packages/types`, used by `skillFilesFor` in `packages/skill-protocol/src/generate.ts`), so a request does not rebuild it; the bundles, digests and groups are still built on each request. `bun run tooling/scripts/check-skill-packages.ts` (the `skill-packages` hook job) fails a skill that does not comply: name equal to the directory, description, a valid `metadata` policy, UTF-8 text files, at most 512 files and 16 MiB.

## The skills tools

A client that does not read `skill://` resources uses the capabilities `skills.list` and `skills.get` (tools of the same name, `GET /v1/skills` and `GET /v1/skills/{skill}` over HTTP). They return the same skills as the extension, with the same filtering by auth mode, policy and visibility: `listVisibleSkills` and `readVisibleSkill` in `packages/skill-protocol/src/source.ts`. The documentation scenario `agent-skills` in `testing/packages/recorder/src/scenarios/index.ts` records both over HTTP and MCP.

## Async rules

The MCP tools await the `aip` and `errors` helpers when they build results and errors. `lazy` from `@platform/store` is synchronous: it returns a loader you call with `await`; do not `await lazy(...)` itself. Every function in `mcp-adapter`, `http-adapter` and `skill-protocol` is async, from the request handler down to the helpers; call them with `await`. The `visible` rule and the capability source are async. Keep the list and the flags apart: `Promise.all` over the list gives the flags, then `filter` by index.

## Verification

Conformance suites are in `testing/integration` and `testing/e2e`. `testing/e2e/api/package-skills.test.ts` drives the running server with the official `SkillsClient` (`skills/list`, `skills/get`, verified reads) and with the tools `skills.list` and `skills.get`, for an administrator, a reader and an anonymous caller. The automated MCP harness uses deterministic scripted calls through Caddy and injected stubs for orchestration and transcript handling. It never starts a model CLI, reads provider credentials or requests inference. No model usage or token cost is permitted. `bun run mcp:harness-check` runs this cost-free check; `mcp:llm-check` remains a compatibility alias. The end-to-end harness case records scripted client exchanges; the fast source lane runs its stubbed unit tests.

## Authentication on MCP

A `tools/call` for a tool that needs a token, sent without a token while authentication is on, gets HTTP 401 with a `WWW-Authenticate` challenge that names the protected-resource metadata. An invalid, expired or foreign-audience token gets 401 with `invalid_token`. A caller whose scope is too small does not see the tool and cannot call it. `testing/e2e/api/authentication.test.ts` proves each case with the JWKS provider and with Better Auth.

## Tool-only items

A capability with `onlyOver: mcp` is an MCP tool with no HTTP route and no OpenAPI operation; `onlyOver: http` is the reverse. The MCP server, the HTTP adapter and the OpenAPI generator honor it.

The skill sources, the skill generator, the skill package reader and the MCP server run their parallel work with `all` from `@platform/util`.

The skill package check runs its parallel work with `all` from `@platform/util`.

`inspectSkill(root, name, entryOf?)` takes the catalog reader so a suite can make it crash and prove the crash is rethrown.

`checkSkillPackages(list?)` runs the skill package check and returns the exit code; the unit suites call it with fixture folders.

## Files

`packages/mcp-adapter/src`, `packages/skill-protocol/src`, `docs/mcp-clients.md`, `docs/quickstart-agent.md`.

## Subscriptions, state resources and the watch tool

The tool list of an administrator has 29 tools, including the MCP-only watch tools `operations.watch` and `events.watch` (`docs/mcp-clients.md`). The server declares `resources.subscribe`, so a client opens `subscriptions/listen` with `resourceSubscriptions` and gets the acknowledgment first, then `notifications/resources/updated` for each change. A capability with an `events` source is a resource template `state://<resource>` (`registerStateResource` in `packages/mcp-adapter/src/events.ts`), and `createMcpApp` forwards every change of the `changes` feed to `notify.resourceUpdated`. The `operations.watch` tool is derived by `watchCapability`. Revision 2026-07-28 has no sessions, no GET stream and no `Last-Event-ID` resume; the SDK 2.4.0 supplies subscriptions and permits custom Tasks method handlers. `task-methods.ts` registers get, cancel and update; `tasks.ts` maps owner-bound UUID handles to AIP operations through the capability pipeline. Each Tasks request must declare `io.modelcontextprotocol/tasks`; missing declarations return -32021. Tool callbacks retain SDK content validation and return inline task fields with resultType task. Completed inner tool results carry resultType complete. Ordinary operations.wait requests with a progressToken receive notifications/progress; task-augmented waits return immediately without inline progress. See `openspec/changes/archive/2026-11-08-stream-all-responses/evidence/5.1-task-implementation.md` for the retained implementation proof; the completed acceptance audit is recorded beside it.

## Asset resources

`assets.get` and `assets.list` expose owner-filtered metadata. The `asset://{asset}` template lists and reads metadata through the same capability pipeline. The get tool also returns a `resource_link` to a short-lived signed download through Caddy. Binary upload is HTTP only. Generated skill references describe only a declared raw media body as a binary string; runtime input validation still requires a ReadableStream. Other schema conversion remains strict. The MCP reference excludes HTTP-only capabilities.

The MCP clients guide diagram uses the scripted harness as its third verification client. Keep its title, diagrams and command examples consistent with the no-model testing rule. No Claude login is part of verification.

The original MCP real-client and Inspector cases, Tasks cases, MCP E2E cases and package-skill E2E cases now run in isolated edge consumers against the source API through Caddy. Each suite adds a configured direct-port refusal. The Inspector keeps its Node runtime in the existing checks image identified by the Containerfile hash. Its stdout and stderr are drained together and nonzero exits fail. The Tasks helper preserves fixture path prefixes. Child coverage and timings use separate per-entry directories; a measured five-suite run retained all sixty-five client cases and seventy-five timings. The later complete proxy migration and full audit passed; see the archived final requirement audit.

The operation lifecycle, MCP operation events, HTTP/MCP parity and administrator event suites run in isolated edge consumers through Caddy. All sixty original cases and their deadlines remain; four direct-backend refusals bring the client total to sixty-four. A measured run merged 235 source files and seventy-two timings, with all twenty-two operation budgets passing. Per-case APIs keep separate databases and real JWT verification; operation groups share their real issuer through explicit fixture IDs. Browser preflight and skill-directory cases use the proxy too. The later complete proxy migration and full audit passed; see the archived final requirement audit.

Both MCP adapter integration suites now run their original forty-two cases through Caddy from isolated edge consumers, plus two direct-port refusals. Real source factories retain custom tools, invalid-token challenges, discovery, skills digests, origin policy, rate limits and lazy loading. The no-expiry negative provider remains a deterministic stub. Protected-resource metadata keeps both root and path-specific resource assertions. A measured run with SDK regression coverage passed sixty-six client cases and seventy-two timings, merging 222 source files with all sixteen API operation budgets passing.

Scoped proxy fixtures inspect the assigned edge address and pass explicit per-container host mappings for the configured proxy and backend aliases. This avoids transient DNS reload failures while independent networks are created concurrently. TLS still verifies the configured proxy hostname and scoped CA; the API stays private. Four consumers passed concurrently with all fifty-eight client cases and direct-port refusals retained.

Fresh scripted harness reports are written to `.stack/e2e/mcp-harness.json`; the E2E case writes `.stack/e2e/mcp-harness-e2e.json`. Reviewed OpenSpec evidence remains a frozen delivery record. Running either command after archival does not recreate the active change folder.
