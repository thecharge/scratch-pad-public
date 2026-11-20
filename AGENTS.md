# Agent guide

This file is the project knowledge for any agent working in this repository. Read it before you search, ask or change anything. `CLAUDE.md` adds the rules that bind Claude Code specifically.

## What this project is

A Bun monorepo where one capability definition is served as an HTTP route, an MCP tool, an OpenAPI operation, an agent skill and a documentation page. The API follows Google AIP. The console is a read-only admin app. The SDK is generated from the OpenAPI document and is the only package that ships.

## Layout

| Folder                  | Holds                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/infra`            | Pulumi application, Podman images, stack lifecycle, checks runner and static site publication                                                                                                                                                                                                                                                        |
| `apps/api`              | The API server; `src/registry.ts` registers capabilities lazily                                                                                                                                                                                                                                                                                      |
| `apps/console`          | The read-only admin console (Refine headless, shadcn/ui, Tailwind)                                                                                                                                                                                                                                                                                   |
| `apps/docs`             | The documentation site for clients (Astro Starlight): UI, API calls, API handling, troubleshooting, OpenAPI, SDK usage                                                                                                                                                                                                                               |
| `packages/*`            | Product libraries: `aip`, `auth`, `auth-better-auth`, `cache`, `capability`, `config`, `constants`, `db`, `errors`, `events`, `flags`, `http-adapter`, `logger`, `masking`, `mcp-adapter`, `messages`, `openapi`, `pipeline`, `policy`, `ratelimit`, `sdk`, `security`, `skill-protocol`, `skills`, `store`, `streams`, `telemetry`, `types`, `util` |
| `testing/`              | Every test and every testing helper: `unit`, `integration`, `e2e`, and the stack in `testing/packages` (`framework`, `factories`, `scenarios`, `recorder`)                                                                                                                                                                                           |
| `tooling/scripts`       | The scripts behind the hooks and `bun run verify`                                                                                                                                                                                                                                                                                                    |
| `docs/`                 | Repository documents for developers: standards, testing, quickstarts, architecture                                                                                                                                                                                                                                                                   |
| `openspec/`             | Specs (`openspec/specs`), open changes (`openspec/changes`) and the archive                                                                                                                                                                                                                                                                          |
| `openapi/baseline.json` | The committed OpenAPI baseline; breaking changes against it fail                                                                                                                                                                                                                                                                                     |

Where things go: new enum or fixed value in `packages/constants`; new shape or contract in `packages/types` as a Zod schema; new text in `packages/messages`; every URL, origin and host in `packages/config`; new check in `tooling/scripts` and `RULE_JOBS` in `packages/constants/src/tooling.ts`.

## Commands

| Command                                                                | Does                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `bun install`                                                          | Installs dependencies and the lefthook git hooks                  |
| `bun run tools:install`                                                | Installs pinned gitleaks, oasdiff and Pulumi tools                |
| `bun run verify`                                                       | Runs everything the hooks check, over the whole repository        |
| `bun run typecheck`, `bun run lint`, `bun run format`, `bun run spell` | Type check, Biome lint, format with Biome and dprint, spelling    |
| `bun run test:unit`, `test:integration`, `test:e2e`                    | Run one test tier; the folder under `testing/` decides the tier   |
| `bun run test:coverage`                                                | Coverage of product source for unit and integration tests         |
| `bun run openapi:check`, `openapi:update`                              | Compare or rewrite the OpenAPI baseline                           |
| `bun run sdk:generate`                                                 | Regenerate the SDK from the OpenAPI document                      |
| `bun run kb:record`                                                    | Run the scenarios and write the generated documentation pages     |
| `bun run docs:build`                                                   | Record, generate, build the site and run the browser checks on it |
| `bun run skills:build`                                                 | Build the skills from the capability registry                     |
| `bun run mcp:harness-check`                                            | Scripted MCP harness check through Caddy without model usage      |

Use `bun run dev` for the container development stack and `bun run stack:status development` or `bun run dev:logs` to inspect it. `bun run stack:up <environment>`, `stack:down <environment>` and `stack:check <environment>` manage development, test or production. Reset and prune remove data and require authorization for that removal. The infrastructure entry is `apps/infra/src/cli.ts`; environment configuration and proxy hosts come from `packages/config/src/environments.ts`.

`bun run check:run <command> [arguments]` runs a focused check in the shared checks container. Root formatting, lint, type checking, spelling and unit commands use that runner. Pre-commit and commit-message checks use the same container, preserving stdin and the Git index. Integration, end-to-end, coverage and documentation orchestration use `check:run --stack` inside the checks container. Application runtime image audits and container execution are proved in task 6.7. SDK E2E consumers and documentation use Caddy; broader API, SDK integration and console migration remains open.

## Rules that bind every change

`DEV_RULES.md` lists every rule and the blocking job that enforces it. The ones that matter most day to day:

- No comments of any kind in code or Markdown; tool exceptions live in tool config files only.
- No inline strings outside `packages/constants` and `packages/messages`.
- No interface, type alias or inline object type outside `packages/types`; every data shape is a Zod schema.
- At most two levels of nesting.
- Everything is asynchronous and lazy. No `*Sync` calls, no module-level `Map` or `Set` outside `packages/store`. No `Promise.all`: use `all` from `@platform/util`, which caps concurrency (`CONCURRENCY_LIMIT`, default 8; browser code and the config package import it from `@platform/util/browser`, which never reads the environment); remaining uses are in `promise-all-ignore.json` (`check-promise-all.ts`). Every function in product source is async unless it is listed in `async-ignore.json` (a per-file maximum that only goes down; `check-async-functions.ts`).
- No URL, origin, host or `localhost` literal outside `packages/config`.
- Tests are flat and use `test.each`; every unit has 2 positive and 2 negative cases built with the factories; tests live only in `testing/`.
- Documentation of behavior is generated by the end-to-end scenarios; a failing scenario publishes nothing.
- Commit messages are Conventional Commits with a lowercase subject and body lines of at most 100 characters.
- Never skip a hook: no `--no-verify`, no `LEFTHOOK_EXCLUDE`.

## Testing

`docs/testing.md` states where each tier lives and how it runs. Unit tests may not open a port, a database or a process. End-to-end files run in their own process. Coverage is 100% of lines and functions of product source; it is blocking: `COVERAGE_BLOCKING` in `packages/constants/src/tooling.ts` is `true`. Bun does not measure branches, so branch coverage is not measured; this is the user's decision.

## Documentation

The site in `apps/docs` is for clients only. Every behavior page is generated by `bun run docs:build` from the scenarios in `testing/packages/recorder`. Pages follow ISO 24495-1 plain language, checked by `check-plain-language.ts`. Generated pages show the URLs from `packages/config/factual-urls.json`; while those are empty they show localhost with a warning.

## Work process

- Project skills have one tracked source in `.claude/skills`. Relative links in `.codex/skills` and `.agents/skills` expose those same skills to Codex. Read the matching skill before work and edit its canonical source when updating it.

- Every change to this repository is traced to a requirement the user stated and recorded in an OpenSpec change. Work outside a recorded requirement is not done.
- Use the OpenSpec workflow: `openspec status`, `openspec instructions apply`, tick a task only after the proving command was run and its output seen, `openspec validate <change>` before each commit, archive finished changes with `openspec archive <change> --yes`.
- Which changes are open, and how far each is, is shown by `/dev:status` (it reads each open change's `tasks.md`). Open a change with `/opsx:propose` before any new work.
- Before you work in an area, invoke the matching project skill (the list is in `CLAUDE.md`) and use the development commands: `/dev:status`, `/dev:verify`, `/dev:test`, `/dev:capability`, `/dev:docs`, `/dev:self-update`. The loop from requirement to archive is the skill `project-develop`.
- Batch related implementation work and use focused checks while editing. Commit keeps staged checks; a normal push runs the complete `bun run verify` once, including documentation in the end-to-end phase. Do not repeat a full run immediately before pushing. Delivery is complete only when this blocking push gate passes.

## Open decisions

Use the `project-stack` skill and `/dev:stack` for the development API, console and documentation containers. Their commands and proxy hosts come from `packages/config/src/environments.ts`. `stack:status` inspects the selected stack; `dev:logs` reads its API log; `dev:reset` removes development data and requires authorization for that removal.

- The four public URLs in `packages/config/factual-urls.json` are empty until the user sets them.
- The list of functions allowed to stay synchronous is reviewed by the user.
- The SDK license is Apache-2.0; the rest of the repository is private and unlicensed.

The user-authorized alternative `bun run ship:fast` accepts source changes and keeps all static checks, security checks, unit tests and integration tests blocking. Its verification budget is 55 seconds. Normal pushes and `bun run verify` retain full E2E, coverage and documentation production. The fast lane reports its reduced scope and does not claim a fresh full audit.

Automated tests must never launch an LLM client, read provider credentials or request model inference. Test harness orchestration with injected stubs and use scripted official MCP clients for proxy acceptance. No model token usage or cost is authorized. The legacy `mcp:llm-check` alias runs the same cost-free harness check.

Architecture decisions require primary research, comparative experiments and deliberate counterexamples before selection. Record observed evidence, failed attempts and remaining uncertainty in the active OpenSpec change; documentation alone does not prove suitability. Include proxy plugins and external services when comparing policy placement.
