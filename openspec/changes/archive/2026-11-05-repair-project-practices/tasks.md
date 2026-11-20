## 1. Assessment and records

- [x] 1.1 Record the initial git state, full verification result, OpenSpec defects and remaining implementation gaps with file references.
- [x] 1.2 Repair streaming delta targets and withdrawn response descriptions, write the missing adapter and AIP deltas, and populate OpenSpec context and artifact rules; validate all artifacts strictly.
- [x] 1.3 Replace the 26 placeholder main-spec purposes with descriptions based on their existing requirements.
- [x] 1.4 Configure project-local Codex command permissions for routine review and verification commands, preserving prompts for destructive commands; validate the policy with the installed Codex CLI.

## 2. Blocking integrity check

- [x] 2.1 Add the async purpose and delta target check with regression cases for accepted and rejected specs, new capabilities and archive exclusion.
- [x] 2.2 Wire the check into constants, messages, hooks and verification; update the rules documentation and matching skills.

## 3. Proof and delivery

- [x] 3.1 Run regression tests, all repository verification steps and strict OpenSpec validation; record the exact results and remaining gaps.
- [x] 3.2 Archive the completed repair change after all its requirements have proof, keeping unfinished streaming work open.

## Proofs

- 1.1: `ASSESSMENT.md` records the initial tree, phase-one findings and completed verification logs; the first resumed full run exited 1 for handoff spelling only.
- 1.2 and 1.3: `openspec validate --all --strict` passed 28 items; `bun run tooling/scripts/check-openspec.ts` passed; the reviewed main-spec diff replaces exactly 26 purposes.
- 1.4: `codex execpolicy check --rules .codex/rules/project.rules` returned allow for `bun run verify` and prompt for `git reset --hard` and `bun run stack:prune`.
- 2.1: `bun test testing/unit/tooling/openspec.test.ts testing/unit/tooling/rules.test.ts` passed 66 cases, including 20 integrity cases.
- 2.2: `check-rules.ts` passed all 46 blocking rules; explicit changed-files `check-skills-fresh.ts` and `check-agent-knowledge.ts` passed. Biome and dprint exited 0 after review.
- 3.1: `bun run verify` exited 0 with `All 40 checks passed.` in `/tmp/scratch-pad-assessment-green-verify.log`; focused tests passed 66 cases and strict OpenSpec validation passed all 28 items. Product findings and proof limits remain in `ASSESSMENT.md`.
- 3.2: `openspec archive repair-project-practices --yes` exited 0, added one dev-standards requirement and created `2026-11-05-repair-project-practices`. Its only incomplete task was this archive action, checked after the successful operation. Streaming remains open.
