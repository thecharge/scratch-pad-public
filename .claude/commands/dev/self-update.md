---
name: "DEV: Self-update"
description: Update the project skills and commands that describe what you changed
category: Development
tags: [development, skills]
---

Keep the skills and commands true.

Skill: project-self-update

**Steps**

1. Follow `project-self-update`: read `.claude/skills/skill-paths.json`, list the changed files with `git diff --name-only origin/main`, and update every skill and command whose paths match.
2. Run `bun run tooling/scripts/check-skills-fresh.ts` and `bun run tooling/scripts/check-agent-knowledge.ts`.
3. Commit the skill changes in the same commit as the code.
