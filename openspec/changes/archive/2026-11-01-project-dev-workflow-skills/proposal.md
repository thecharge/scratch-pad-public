## Why

The user found that `.claude` holds area skills but no development commands, no skill that ties the whole development loop together, no live view of what is done and tested, and no stated rule for when and how the skills are updated. The previous change (`agent-skills-async-coverage`, archived) required "skills and commands"; only the OpenSpec commands exist. Verified on 2026-11-01: `.claude/commands` holds only `opsx/apply.md`, `archive.md`, `explore.md`, `propose.md`; `project-self-update` step 6 tells the reader to update commands that do not exist; in the previous session the project skills were not invoked at all. This change holds what is left of that requirement.

## What Changes

The user's requirement, 2026-11-01: "make the skills and push to main and this also should be in the self improvement skill called self update when and how to update the skills".

1. A project skill `project-develop` with the whole loop: record the requirement in OpenSpec, implement, add the 2x2 cases, run `verify`, regenerate the documentation, update the skills, archive.
2. Project commands in `.claude/commands/dev`: `/dev:verify`, `/dev:test`, `/dev:capability`, `/dev:docs`, `/dev:status`, `/dev:self-update`. Each names the skill it uses and runs or follows the real script.
3. `/dev:status` prints live numbers read from the repository and its tools: open OpenSpec changes with task progress, units still owing cases, the coverage mode, test files per tier, skills and commands, and the git position against `origin/main`.
4. `skills-fresh` and `agent-knowledge` cover commands: a malformed command, a command naming a missing skill, or a command not listed in `CLAUDE.md` fails.
5. `CLAUDE.md` and `AGENTS.md` say to invoke the matching skill before work in an area.
6. `project-self-update` states when the skills are updated and how.

## Capabilities

### New Capabilities
- `dev-workflow-skills`: the development loop skill, the development commands, the live status command, the checks that keep commands and skills correct, and the update rules in the self-update skill

### Modified Capabilities

## Impact

`.claude/skills`, `.claude/commands/dev`, `CLAUDE.md`, `AGENTS.md`, `tooling/scripts` (status script, two checks), `packages/constants`, `packages/messages`, `packages/types`, `testing/unit/tooling`, `docs/`.
