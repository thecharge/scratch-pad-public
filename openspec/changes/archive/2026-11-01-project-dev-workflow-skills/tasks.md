## 1. Skills and commands

- [x] 1.1 Write the skill `project-develop` (the whole loop), add it to `skill-paths.json`, `CLAUDE.md` and `AGENTS.md`
- [x] 1.2 Write the commands `/dev:verify`, `/dev:test`, `/dev:capability`, `/dev:docs`, `/dev:self-update` in `.claude/commands/dev`, each with `name`, `description` and a `Skill:` line
- [x] 1.3 Add "When to update" and "How to update" to `project-self-update`
- [x] 1.4 `CLAUDE.md` and `AGENTS.md` tell to invoke the matching skill before work in an area and list the `/dev` commands

## 2. Live status

- [x] 2.1 `tooling/scripts/dev-status.ts` and the command `/dev:status`: exported async functions that read open OpenSpec changes and progress, the unit debt, the coverage mode, test files per tier, skills and commands, and the git position; 2x2 cases; 100% coverage; the script exits 1 and says so when a source is unreadable

## 3. Checks

- [x] 3.1 `check-agent-knowledge.ts` fails a command without front matter, with a `Skill:` naming a missing skill, not listed in `CLAUDE.md`, or `CLAUDE.md` without the `/dev` commands, or `project-self-update` without its two sections; messages in `packages/messages`; negative tests
- [x] 3.2 `skill-paths.json` maps the status script and the command folder; `skills-fresh` passes

## 4. Proof and delivery

- [x] 4.1 `bun run verify` passes with the new checks and 100% coverage; `/dev:status` run and its output saved as evidence in this change
- [x] 4.2 Pushed to `main`; the change archived with `openspec archive`
