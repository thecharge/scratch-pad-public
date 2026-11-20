---
name: "DEV: Docs"
description: Regenerate and check the documentation from the end-to-end scenarios
category: Development
tags: [development, documentation]
---

Produce the documentation.

Skill: project-docs

**Steps**

1. Run `bun run test:e2e`. When every scenario passes it writes client behavior pages into `apps/docs` and internal test reports into repository `docs/e2e`; when one fails it writes nothing. Performance, protocol verification and browser reports must never be public site pages.
2. Run it twice and check that `git status` shows no change after the second run.
3. The end-to-end command already builds and browses the site. Use `bun run docs:build` separately only when an independent documentation build is required.
4. The packaged MCP suite records `.stack/e2e/mcp.json`; documentation production renders its requests, progress, authentication and skills into the MCP task guide only when every recorded step passed.
5. Never write behavior pages by hand: change the scenario, and the page follows. Report failures first.

SDK documentation production starts the test proxy stack, installs the packed SDK in an edge-network consumer and records scoped scenarios sequentially before publishing. Its real output and refusal assertions live in the SDK E2E suite; unit tests inject packing, recording and stack lifecycle. No model inference is involved.

The API and installed SDK matrices record each negotiated HTTP version. Documentation production consumes their successful aggregate recordings into the API lifecycle and SDK stream guides. Signed downloads obtain current URLs from metadata; page tokens use the values from preceding responses.

Normal API/MCP page recording and live reference reads use an isolated edge consumer through Caddy. Raw missing-header probes trust the scoped CA. The marker guard probe and direct-port network refusal remain separate assertions. No model or provider account is involved.

Guide publication saves complete recordings under `.stack/e2e/raw-guides` before rendering labelled copies. Compare independent generated page hashes; measurements and progress samples vary internally. A failed recording or evidence write prevents publication.
