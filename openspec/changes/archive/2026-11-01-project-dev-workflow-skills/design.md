## Context

Verified in the repository: `.claude/skills` holds 13 skills (4 OpenSpec, 9 `project-*`) mapped to paths in `skill-paths.json`; `check-skills-fresh.ts` treats a change under `.claude/commands/` as a change for every skill; `check-agent-knowledge.ts` checks the guides, the skill front matter, the skill list in `CLAUDE.md` and the mapped paths, but knows nothing about commands.

## Goals / Non-Goals

**Goals:** a reader (agent or person) finds the loop, the commands and the live status from `CLAUDE.md`; skills and commands cannot silently drift.

**Non-Goals:** new product features; changing the OpenSpec commands.

## Decisions

- Commands live in `.claude/commands/dev/<name>.md` and are invoked as `/dev:<name>`, the same layout as `opsx`. Each file has front matter with `name` and `description`, and a line `Skill: <project-skill>` naming the skill it applies.
- `/dev:status` runs `bun run tooling/scripts/dev-status.ts`, an async script that returns an exit code and prints numbers read from `openspec list --json`, `testing/unit-debt.json`, `COVERAGE_BLOCKING`, the test glob per tier, the skill and command folders and `git rev-list`. It runs no test and no coverage, so it takes seconds. It follows every repository rule (async, no comments, no `Promise.all`, 2x2 cases, 100% coverage).
- `check-agent-knowledge.ts` gains the command checks: front matter present, `Skill:` names an existing skill folder, the command is listed in `CLAUDE.md`. The messages come from `packages/messages`.
- `check-skills-fresh.ts` is unchanged in logic; `skill-paths.json` gets the status script and the command folder under the skills that describe them.
- `project-self-update` gets two sections: "When to update" and "How to update". When: a mapped path changed (the hook), a script, rule, check or command was added, removed or renamed, a statement in a skill was found wrong while working, a change is archived, the user states a standing rule. How: read the changed files, make each statement true by running the command it names, keep skills short and link instead of copying, update `skill-paths.json`, `CLAUDE.md`, `AGENTS.md` and the matching command in the same commit as the code, run the two checks.

## Risks / Trade-offs

- More files to keep true; the two checks and the hook carry that cost.
- The status numbers come from reads of files and `git`, not from a test run, so it shows the state of the records and not a fresh proof; the command text says so.
