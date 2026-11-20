---
name: project-develop
description: Develop a change in this repository from requirement to archive: OpenSpec first, then code, 2x2 cases, verify, documentation, skill updates. Use when starting any work, or when you do not know the next step of a change.
---

# Develop a change

Work only on a requirement that is recorded in an open OpenSpec change. Do not start agents the user did not ask for.

## The loop

1. **Record the requirement.** Write the user's words into an OpenSpec change before any code. `/opsx:propose` creates the change; `openspec validate <name>` must say it is valid. Skill: `openspec-propose`.
2. **Orient.** Run `/dev:status` to see the open changes, the unit debt and the coverage mode. Read `project-overview` for where a file goes.
3. **Implement the next task.** `/opsx:apply <name>` works through `tasks.md`. Use the matching area skill first: `project-capabilities` for a capability, `project-mcp-skills` for MCP and skills, `project-openapi-sdk` for the API contract, `project-rules-and-hooks` for a rule or check.
4. **Add the cases.** Every exported function needs 2 positive and 2 negative cases in `testing/unit` (skill `project-testing`, command `/dev:test`). Coverage of product source must stay at 100% of lines and functions.
5. **Check the batch.** Implement related requirements together and use focused tests, type checking and rule checks while editing. Do not run the full pipeline after each small edit. `/dev:verify` remains available for an explicit full audit; the normal delivery gate runs once at push. Fix the cause of a failure; never skip a hook.
6. **Regenerate the documentation.** `bun run test:e2e` writes the documentation from the end-to-end scenarios when all pass (skill `project-docs`, command `/dev:docs`). Never write behavior pages by hand.
7. **Update the skills.** `/dev:self-update` follows `project-self-update`: change the skill, command and guide that describe what you changed, in the same commit.
8. **Tick and prove.** Tick a task in `tasks.md` only after you saw the command that proves it.
9. **Commit and push.** Commit a substantive batch after focused checks pass. Commit hooks keep staged checks without building documentation or recording the knowledge base. Push to `main`; the pre-push hook runs the complete `bun run verify` once, including end-to-end, documentation and coverage. A separate full run immediately before push is unnecessary. Tick delivery-dependent tasks only after this gate passes.
10. **Archive.** When every task is ticked, `/opsx:archive` (skill `openspec-archive-change`) syncs the specs and moves the change to `openspec/changes/archive`.

## Reporting

Artifact readiness from `openspec status` means the planning artifacts exist. Use task proofs and fresh command output to report implementation progress. Before delivery, run `bun run tooling/scripts/check-openspec.ts` for purposes and active delta targets and `openspec validate --all --strict` for structural validity.

Failures, skipped steps and gaps come before successes. A claim without a command output is not a claim.

## Files

`openspec/changes`, `openspec/specs`, `CLAUDE.md`, `AGENTS.md`, `.claude/skills`, `.claude/commands`.

Architecture decisions require primary research, comparative experiments and deliberate counterexamples before selection. Record observed evidence, failed attempts and remaining uncertainty in the active OpenSpec change; documentation alone does not prove suitability. Include proxy plugins and external services when comparing policy placement.

When the user requests research before proposal review, complete selection research first and retain experiment capsules, counterexamples and limitations. Write concrete product decisions and implementation acceptance tasks, then push the proposal for review when authorized. Do not turn that request into a proposal to research later or begin implementation before the requested review.

For whole-product stencil reviews, trace public/private services, customer/commercial lifecycle, tenant data and objects, development/production fabric, DNS/TLS, localization, documentation and recovery into runtime guards and falsifiable test/hook obligations. Separate selected architecture from unproved compatibility or operational acceptance and keep failed attempts visible. Do not turn a review expansion into unapproved implementation.
