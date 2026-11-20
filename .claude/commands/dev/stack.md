---
name: "DEV: Stack"
description: Inspect and run the local application stack through the infrastructure app
category: Development
tags: [development, stack]
---

Skill: project-stack

Startup probes recursive watcher allocation before builds. Resolve an allocation failure before retrying; do not change system settings without authorization. Use the infrastructure `tools` command for its pinned Pulumi bundle.

Read the current environment description, then use `bun run stack:status development` for state, `bun run dev` to start the app containers, and `bun run dev:logs` for API output. Use the proxy hosts in the environment description to reach the console and documentation server.

Configure both RustFS credentials to include the product object store and static application publication. Production also needs its asset host. Static sites use `console.sites.<asset host>` and `docs.sites.<asset host>`; development hot reload keeps its existing app hosts. Only console and docs buckets are public for reads.

Run focused container checks after topology changes. Prove source reload through the proxy and record evidence in the current OpenSpec change. Follow `project-develop` for validation and delivery.

Reset and prune remove data. Run them only with authorization for that removal.

Test orchestration runs inside `check:run --stack` with the local engine socket. Startup ownership preparation uses a network-disabled helper mounting only its target folder. Host reset and prune remain separately authorized destructive operations.

Current bench:stack output goes to .stack/benchmarks; archive evidence is retained unchanged.
