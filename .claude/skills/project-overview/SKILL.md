---
name: project-overview
description: Orient yourself in this repository: what it is, where each kind of file lives, which commands exist. Use when starting a session or when you do not know where something goes.
---

# Project overview

Read `AGENTS.md` and `CLAUDE.md` at the repository root first. They are the source of the facts below.

The project skills are tracked in `.claude/skills` and shared through relative links in `.codex/skills` and `.agents/skills`. Read the same canonical skill regardless of the agent; do not maintain separate copies.

## What it is

A Bun monorepo. One capability definition is served as an HTTP route, an MCP tool, an OpenAPI operation, an agent skill and a documentation page. The API follows Google AIP. The SDK is generated from the OpenAPI document and is the only package that ships.

## What is open

The guides do not name the open change, because that goes stale. Run `/dev:status` for the open changes with their task progress, the unit debt, the coverage mode, the test files per tier and the git position.

## Where things go

- Enum or fixed value: `packages/constants`.
- Shape or contract: `packages/types`, as a Zod schema.
- Text: `packages/messages`.
- URL, origin, host: `packages/config`.
- Hand-written agent skill: `packages/skills/skills/<name>/SKILL.md`.
- Check or hook script: `tooling/scripts`, wired in `packages/constants/src/tooling.ts` and `lefthook.yml`.
- Writing or reading a body as a stream (a JSON document, newline-delimited JSON, event frames): `packages/streams`, which every adapter uses; no adapter builds its own stream framing.
- Infrastructure (the Pulumi program, the plan of each environment, the proxy configuration, the Containerfiles): `apps/infra`; the description of an environment and the pinned images: `packages/config/src/environments.ts`; run it on rootless Podman, one stack per environment (`development`, `test`, `production`).
- Test or testing helper: `testing/` only.
- Remaining `Promise.all` uses: `promise-all-ignore.json`; new code uses `all` from `@platform/util` (browser code and the config package use `@platform/util/browser`; `check-package-graph.ts` guards the package cycle and the console bundle).
- Allowed synchronous functions: `async-ignore.json`, with a reason and a per-file maximum that only goes down.
- Repository document: `docs/`. Client documentation: `apps/docs`.
- Coverage of product source is blocking: `verify` and the pre-push hook fail below 100% of lines and functions.

## Next skills

Local application containers and stack lifecycle: `project-stack`, with `/dev:stack` for the development loop.

Setup and verification: `project-setup-and-verify`. Capabilities: `project-capabilities`. Tests: `project-testing`. Documentation: `project-docs`. OpenAPI and SDK: `project-openapi-sdk`. MCP and skills: `project-mcp-skills`. Rules and hooks: `project-rules-and-hooks`. After a change: `project-self-update`.

The user-authorized alternative `bun run ship:fast` accepts source changes and keeps all static checks, security checks, unit tests and integration tests blocking. Its verification budget is 55 seconds. Normal pushes and `bun run verify` retain full E2E, coverage and documentation production. The fast lane reports its reduced scope and does not claim a fresh full audit.

Automated MCP acceptance uses `bun run mcp:harness-check`: deterministic protocol calls through Caddy and stubbed orchestration tests, with no model inference or provider credentials. The legacy `mcp:llm-check` command delegates to the same cost-free harness.

`apps/infra` owns stack lifecycle and the shared checks runner. The root agent guides list container commands and current migration limits; internal generated stack reports live in `docs/e2e`, separate from client behavior pages.

Pre-commit and commit-message checks use the shared checks container. Its stdin and Git index forwarding preserve staged formatting and partial commits; stack orchestration uses `check:run --stack` inside the controller, sharing the local engine socket and isolated temporary fixtures. Application runtime image audits are recorded in task 6.7; the complete proxy migration passed task 9.1 and the final full audit.

Architecture decisions require primary research, comparative experiments and deliberate counterexamples before selection. Record observed evidence, failed attempts and remaining uncertainty in the active OpenSpec change; documentation alone does not prove suitability. Include proxy plugins and external services when comparing policy placement.
