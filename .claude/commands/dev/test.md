---
name: "DEV: Test"
description: Run the unit, integration or end-to-end tier, or the coverage report
category: Development
tags: [development, testing]
---

Run tests by tier.

Skill: project-testing

Use `bun run check:run bun test <files>` for focused unit cases. The root unit tier uses the same container. Integration, end-to-end and coverage orchestration use `check:run --stack`; API acceptance runs through Caddy over all three configured HTTP protocols. No model or inference tests are permitted.

**Input**: A tier after `/dev:test` (`unit`, `integration`, `e2e` or `coverage`). If omitted, ask which.

**Steps**

1. Run `bun run test:unit`, `bun run test:integration`, `bun run test:e2e` or `bun run test:coverage`.
2. For a new exported function add 2 positive and 2 negative cases with `unit(subject, { positive, negative })` in `testing/unit/<area>`.
3. Coverage must list nothing: every product file at 100% of lines and functions.
4. Report failures first, then the pass counts you saw.
