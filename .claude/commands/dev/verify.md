---
name: "DEV: Verify"
description: Run every project check in the background and report failures first
category: Development
tags: [development, verify]
---

Run the full project checks.

Use `bun run verify:plan [base-commit head-commit]` to explain a comparison without running tests. It writes `.stack/verify/plan.json`. Full verification also writes a report before execution. Reports currently require every check to execute; candidates do not permit reuse. Missing ranges, dirty inputs and uncertain discovery remain explicit full-run reasons.

Audit transport retries are bounded by `tooling/scripts/audit.ts`; a successful unfiltered audit remains mandatory. Report exhausted attempts as failures.

Use this command for an explicit full audit. During normal development, batch related changes and run focused checks; push invokes the complete pipeline once, so do not run it manually immediately before pushing. Documentation builds inside the end-to-end phase and is not repeated as a separate verification phase.

Skill: project-setup-and-verify

Verification launches local checks in the shared checks container. End-to-end and coverage also run in the `check:run --stack` controller, sharing the local engine socket and an isolated temporary directory outside the checkout. Use `bun run check:run <command> [arguments]` for focused checks; launcher or image failures remain blocking.

**Steps**

1. Run `bun install` if a package was added since the last install, then `bun run verify` in the background and watch it. Do not poll with sleep.
2. When it ends, report the failing step and its output first. The summary line is `All N checks passed.` on success.
3. Fix the cause of a failure and run it again. Never skip a hook.
4. State the exit code and the number of checks in your report.

The pre-push job uses `use_stdin: true` and `PLATFORM_VERIFY_PUSH=1` to forward Git's actual proposed updates to `verification-push.ts`. The verifier records `.stack/verify/push.json` in both lanes. A single existing branch update supplies its old and new object IDs to full report-only planning. Missing, malformed, multiple-ref, new-ref, deleted-ref and non-branch updates cannot nominate one reusable range. Direct full verification reads no stdin. The metadata is diagnostic; it does not satisfy a check or enable evidence reuse.

Pre-commit and commit-message checks also use the shared runner. Keep stdin and the alternate Git index intact when changing launch arguments. After a partial commit, align only the owned staged paths with the formatter result before pushing; preserve unrelated staged work.

The `sources` step rejects changed external evidence and unreviewed change prose. Inspect the named source or file and record reviewed evidence before retrying. It never accepts a new hash automatically.

The fast queue starts formatting only after SDK and scanner preparation finish. All checks and both complete test tiers remain mandatory; use actual combined commit/push timing to assess the 60-second requirement.

Formatting verification checks comments in one read-only batch, then runs the complete non-incremental dprint check. Both results block delivery. Pre-commit retains comment cleanup. The per-file exec formatter was replaced to avoid starting a runtime for every source file; no prior result substitutes for either check.
