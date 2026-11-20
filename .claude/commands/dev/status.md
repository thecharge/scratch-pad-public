---
name: "DEV: Status"
description: Print live numbers: open changes, unit debt, coverage mode, tests per tier, skills, commands, git position
category: Development
tags: [development, status]
---

Show the state of the repository from live reads.

Skill: project-develop

**Steps**

1. Run `bun run tooling/scripts/dev-status.ts`.
2. Report the output as it is. The numbers are read from the repository files (the `tasks.md` of each open change, `testing/unit-debt.json`, the test folders, the skill and command folders) and from `git`; the script runs no test and no coverage, so it shows the state of the records and not a fresh proof. Run `/dev:verify` for a proof.
3. If the script says a number is unavailable, report that and its exit code 1.
