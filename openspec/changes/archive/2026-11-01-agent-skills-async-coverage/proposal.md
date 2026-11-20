## Why

Part of what the user required is not delivered, and the user has twice found work done without a recorded requirement. This change holds everything still open, so the finished change `e2e-driven-docs` can be archived. Verified on 2026-10-31: 141 of 242 units still lack two positive and two negative cases (`testing/unit-debt.json`); about 72 product files are below 100% of lines and functions with `COVERAGE_BLOCKING = false`; no code serves skills from a package; the rule that enforces async only bans `*Sync` calls, not non-async functions; the repository has no `CLAUDE.md`, no `AGENTS.md`, and no project skills beyond the four OpenSpec ones.

## What Changes

The user's requirements, as stated on 2026-10-31:

1. "I want it applied": every function in product source is asynchronous, with an ignore mechanism in tool config when a function must stay synchronous (first stated in journal 0b2b7d1e: "all must be lazy loaded and async one anti pattern i see that none is async").
2. "Everything I have requested delivered with OpenSpec."
3. Skills can be written in a package and presented at the endpoint so an LLM can use them ("The skill:// protocol does not and must not prevent me to write skills in a package"); the user also asks what happens when they define a tool or another item, and how it relates to full MCP compliance.
4. Unit tests follow the 2x2 rule with `it.each` and factories (journal 0b2b7d1e: "tests 2x2 it each not used"; answer: "Every unit has negative and positive test by 2"); coverage is 100% of lines and functions (the user chose lines and functions only, because Bun does not measure branches).
5. "Any dev guide and deliver and knowledge must be local to the repo and pushed to main": `CLAUDE.md` and `AGENTS.md` that give an agent the knowledge of the project. "You will not write claude md and call it a day": the `.claude` folder holds skills covering the whole project, the capability to update the skills when something in the project changes, and a pre-commit hook that checks whether part of the skills or commands needs an update.
6. "You are forbidden for anything in this repo to work with something else than my exclusive yes and OpenSpec": no work outside a recorded requirement.

7. (2026-10-31, later) `createSdkClient` is converted to async ("Yes"). The MCP is tested; skills served from a package are proven through the MCP, and the MCP also offers a tool so the LLM can get them ("skills from package must also be a proof the MCP can give also tool for the LLM"). Authentication on MCP and on the API must work. Running the end-to-end tests must produce the documentation: "if I run e2e tests and this does not produce docs, it will be strike 3". Verified on 2026-10-31: `bun run test:e2e` records only into temporary folders (`testing/e2e/recorder/ui-ui.test.ts`, `testing/e2e/tooling/kb.test.ts`) and writes nothing into `apps/docs`; the pages are written only by `bun run docs:build` or `bun run kb:record`. All of it is delivered through this OpenSpec change.

8. No raw `Promise.all` anywhere (user, 2026-10-31: "heavy usage of promise.all - no way I am allowing this in the codebase - better to have a capped promise all configurable but also with defaults as common util from a util package so everyone can use it and to have a precommit check for that as well - hard no on promise all being used at all - plenty of newbie mistakes here"). Verified on 2026-10-31: `Promise.all` is used 106 times in 54 files of `apps`, `packages` and `tooling`, and 68 times in `testing`.

9. Final verification of the MCP (user, 2026-10-31: "later when done I want you to verify that the MCP works as expected end to end - so it is known it works with LLM and CLI interface harness"). Existing tools: the official MCP SDK client tests in `testing/integration/api/mcp-clients.test.ts`, the MCP Inspector CLI harness and the language-model check `bun run mcp:llm-check` (headless `claude -p`).

Not decided by the user and not assumed here: the factual public URLs (the four values in `packages/config/factual-urls.json` are empty; the docs show localhost with a warning until the user sets them); the list of functions allowed to stay synchronous (to be reviewed by the user).

## Capabilities

### New Capabilities
- `delivery-standards`: unit 2x2 rule and full coverage, skills in packages, custom tools documentation and conformance, every function asynchronous unless ignored, repository knowledge for agents, project skills with self-update and a staleness hook, work only on recorded requirements

### Modified Capabilities

## Impact

`testing/`, `tooling/scripts` (new checks), `lefthook.yml`, `DEV_RULES.md`, `packages/skill-protocol`, `packages/mcp-adapter`, all product source (async conversion), `docs/`, `CLAUDE.md`, `AGENTS.md`, `.claude/skills`, `.claude/commands`.
