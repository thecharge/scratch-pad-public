# Claude Code rules for this repository

Read `AGENTS.md` first: it holds the project knowledge (what the project is, layout, commands, rules, process). This file holds what binds Claude Code in particular. The skills in `.claude/skills` cover each area of the project; the table at the end says which skill to use. They are the canonical source shared with Codex through relative links in `.codex/skills` and `.agents/skills`.

## Standing rules from the user

These are stated by the user and bind every session. They are also in `~/.claude/CLAUDE.md` on the user's machine; they are repeated here so a new session finds them in the repository.

1. **Requirements are delivered as written.** Do not substitute, shrink or reinterpret one. Before saying a task is done, list each requirement with its proof (command output, file, URL, screenshot). A requirement without proof is not done. If a requirement is unclear, ask one precise question.
2. **No made-up assumptions.** Every assumption is backed by real data (a command run, a file read, a verified URL) or by the user's confirmation. Never state as done, working, generated or verified what was not run.
3. **Look in the records before saying something is missing.** The user's earlier words are in the session journals (`~/.claude/projects/<project>/*.jsonl`), in OpenSpec changes and the archive, in git history, in memory, and in this repository. Search them and quote the hit before saying a requirement is not written down or asking the user to repeat it.
4. **Documentation is test-driven.** Every step of every console, API and MCP scenario becomes a documented step with a pass or fail flag, a description and its checks.
5. **OpenSpec for everything.** Work only on requirements recorded in an open change, through the OpenSpec workflow. Do not open new changes on your own; leftovers of an archived change go in one new change.
6. **Do not work outside the user's explicit yes.** Do not start agents, tasks or refactors the user did not ask for.
7. **Report outcomes faithfully.** Failures, skipped steps and gaps come before successes. Do not repeat a report that has no new content.
8. **Never make the user write hooks or settings** to cover something you failed to record or follow. Record it in the repository.

9. **No automated model usage.** Never launch an LLM client, access provider credentials or request inference for testing. Use injected harness stubs and scripted official MCP clients through Caddy. `mcp:harness-check` and its compatibility alias `mcp:llm-check` are cost-free protocol checks. No model sign-in is a delivery prerequisite.

## How to work

- One agent at a time, and only for a recorded task. Tell the user what it was started for.
- Never skip a hook. If a hook fails, fix the cause.
- Never use `pkill -f` (it can kill your own shell); stop a process by its PID or port.
- Never run `git checkout -- <file>` or `git stash` on files that hold uncommitted work you did not write.
- Commit trailers: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and the `Claude-Session` URL of the session.
- Use `bun run verify` in the background and watch it; do not poll with sleep.
- Batch related implementation work and use focused checks while editing. The complete verification pipeline runs once at push; do not repeat it manually immediately before pushing. Commit does not build documentation or record the knowledge base.

## Skills in `.claude/skills`

| Skill                                                                                      | Use it when                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `openspec-apply-change`, `openspec-propose`, `openspec-explore`, `openspec-archive-change` | Working through, proposing, exploring or archiving an OpenSpec change                      |
| `project-develop`                                                                          | Starting any work or not knowing the next step: requirement to archive                     |
| `project-overview`                                                                         | Starting in the repository or finding where something lives                                |
| `project-setup-and-verify`                                                                 | Installing, running `verify`, understanding a failing hook                                 |
| `project-capabilities`                                                                     | Adding or changing a capability (HTTP, MCP, OpenAPI, skills)                               |
| `project-stack`                                                                            | Development containers, proxy hosts, lifecycle, status and logs                            |
| `project-testing`                                                                          | Writing tests, the 2x2 rule, coverage, test tiers                                          |
| `project-docs`                                                                             | Scenarios, generated documentation, the docs site, plain language                          |
| `project-openapi-sdk`                                                                      | OpenAPI baseline, the generated SDK and its package                                        |
| `project-mcp-skills`                                                                       | The MCP server, skills, MCP conformance                                                    |
| `project-rules-and-hooks`                                                                  | Dev rules, hooks, adding a check                                                           |
| `project-self-update`                                                                      | Something in the project changed: find and update the skills and commands that describe it |

Use `bun run dev` for development app containers and `bun run check:run <command> [arguments]` for focused checks. Environment descriptions and proxy hosts live in `packages/config/src/environments.ts`; stack lifecycle is `apps/infra/src/cli.ts`. Integration, end-to-end, coverage and documentation orchestration use `check:run --stack` inside the checks container. Application runtime images have been audited; remaining proxy migration still requires its task proofs.

## Development commands in `.claude/commands/dev`

The `project-stack` skill covers `apps/infra`, the development app containers and lifecycle commands. `/dev:stack` applies that skill.

Invoke the matching skill before you work in an area, and use these commands. Each names the skill it applies on a `Skill:` line.

| Command            | Skill                      | Does                                                                            |
| ------------------ | -------------------------- | ------------------------------------------------------------------------------- |
| `/dev:status`      | `project-develop`          | Prints live numbers: open changes, unit debt, coverage mode, tests, skills, git |
| `/dev:verify`      | `project-setup-and-verify` | Runs every check in the background and reports failures first                   |
| `/dev:stack`       | `project-stack`            | Runs and inspects the local application containers                              |
| `/dev:test`        | `project-testing`          | Runs a test tier or the coverage report; the 2x2 cases                          |
| `/dev:capability`  | `project-capabilities`     | Adds or changes a capability                                                    |
| `/dev:docs`        | `project-docs`             | Produces the documentation from the end-to-end run                              |
| `/dev:self-update` | `project-self-update`      | Updates the skills and commands that describe what you changed                  |

The user-authorized alternative `bun run ship:fast` accepts source changes and keeps all static checks, security checks, unit tests and integration tests blocking. Its verification budget is 55 seconds. Normal pushes and `bun run verify` retain full E2E, coverage and documentation production. The fast lane reports its reduced scope and does not claim a fresh full audit.

Architecture decisions require primary research, comparative experiments and deliberate counterexamples before selection. Record observed evidence, failed attempts and remaining uncertainty in the active OpenSpec change; documentation alone does not prove suitability. Include proxy plugins and external services when comparing policy placement.
