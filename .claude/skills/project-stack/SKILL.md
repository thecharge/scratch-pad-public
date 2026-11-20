---
name: project-stack
description: Run or change the local Pulumi and Podman stack, its app development containers, proxy routes and lifecycle commands.
---

# Local stack

Pulled images use `keepLocally: true`: removing a stack removes its resources while retaining images that another environment may still use. Explicit project pruning remains a separately authorized destructive operation.

The product object store is configured with `RUSTFS_ACCESS_KEY` and `RUSTFS_SECRET_KEY`; both are required together. Production also requires `PLATFORM_ASSET_HOST`. `environmentFor` validates this configuration and the CLI forwards it to Pulumi. Configured stacks add digest-pinned RustFS 1.0.4 on the backend network, with separate data and log folders owned by 10001:10001 and no published port. Caddy serves its configured asset host and retains the signed request host. Without credentials the store is not provisioned. Configured stacks also build console and docs into separate scratch images holding only their static output. `static.ts` exports the output and publishes it through Caddy with one signed edge-client invocation; credentials travel on stdin. The websites are `console.sites.<asset host>` and `docs.sites.<asset host>`, separate from the S3 API hostname. Only those two buckets get public GetObject. Caddy preserves Host, forwards API paths, and retries console 404 responses against its index; documentation keeps 404 responses. The API receives private asset storage configuration when the object store is configured. Publication creates its private assets bucket separately from the public website buckets. Native API multipart upload, signed range reads, checksum cleanup and the SDK round trip passed through Caddy. Asset acceptance is recorded in task 4.7; complete container execution and runtime image audits are recorded in task 6.7.

`bun run check:run <command> [arguments]` starts the shared checks image through `apps/infra/src/runner.ts`. Its pinned Node and Bun bases, empty entrypoint and Containerfile hash determine its runtime. The repository keeps its absolute mount path, output keeps the caller's UID and GID through `--userns=keep-id`, and failures propagate. Ordinary checks mount no engine socket. Explicit `--stack` mode mounts the local engine socket and a unique temporary directory outside the checkout, forwards TMPDIR and removes that directory after execution. Nested commands stay inside the controller. No account directories or provider credentials are mounted. The runner keeps stdin open and forwards the four Git index and repository environment variable names needed by hooks. Use this command for focused local checks and unit tests. The image uses the repository's installed dependencies.

`apps/infra/src/tools.ts` owns Pulumi bundle installation and shares `tooling/scripts/download-tool.ts` for checksum verification. Root `tools:install` installs verification binaries and then calls the infrastructure `tools` command. Real archive extraction belongs to `testing/integration/infra`; unit cases inject the extractor.

Development startup probes recursive watch allocation for the API and workspace packages and releases every handle. Allocation failure stops startup before builds and reports its cause and inotify settings. The probe is not a reservation or an exact count of available watches. Do not change system limits without authorization.

For new proxy connections, run the recorded acceptance probe with 40 parallel WebSocket handshakes per development app and zero failures. Repeated rounds check fixed upstream addresses under connection churn.

Read `apps/infra/README.md` and the environment description in `packages/config/src/environments.ts` before changing topology. Lifecycle commands can run on the host; test orchestration runs inside the checks controller and creates containers through the local engine. Do not start a second development server on the host.

`bun run dev` starts the development API, console, documentation server and Caddy. Source bind mounts let the API watch its entry point and let Vite and Astro poll for edits. The console uses its proxy origin for API calls. The app containers publish no ports; Caddy exposes the configured TLS port and serves the app hosts from the environment description. Development app upstreams have fixed backend addresses.

Use `bun run stack:status development` to inspect the containers and `bun run dev:logs` for the API log. `bun run stack:check development` compares the running stack with the program. `bun run stack:down development` removes the containers while retaining data. `bun run dev:reset` destroys the development stack, removes only its data folders and starts it again; use it only when data removal is authorized. `bun run apps/infra/src/cli.ts tools` installs the stack tools.

`bun run stack:prune` removes all project stacks, state, data and project images. It is destructive and requires authorization. Do not use it as routine cleanup. All persistent stack mounts are folders under `.stack/data`.

Use `project-testing` for the 2x2 plan, proxy and command cases in `testing/unit/infra`. Run focused tests in a container while developing. A hot reload proof must receive an update through Caddy, show the edited result without rebuilding and restore the original source bytes. A running server alone is insufficient proof. Record the command and result in the open OpenSpec change.

The runner now covers root formatting, lint, type checking, spelling and unit commands, plus every verification phase, including end-to-end and coverage. Pre-commit and commit-message checks use the runner. Container execution and runtime image audits are proved in task 6.7. The complete proxy migration passed task 9.1 and the final full audit.

Temporary test API replacement preserves the original MAC address as well as its configured IP so the proxy does not retain an obsolete neighbor entry. Infrastructure command failures print stderr, or stdout when stderr is empty, to retain provider diagnostics.

The workflow guides describe the completed container and proxy paths. Read `docs/running-verify.md` and `docs/testing.md` for those limits. Internal generated protocol reports under `docs/e2e` describe the test stack; client behavior pages stay in `apps/docs`. The scripted MCP harness never starts a model or uses provider credentials.

The checks image includes certutil for explicit local test-CA trust in isolated browser acceptance. Browser clients use the edge network and the scoped API replacement serves the supplied console output. No provider account directory is mounted.

The pinned HTTP/3 client build uses Podman's layer cache. Its Containerfile and build arguments still determine invalidation; checksum checks remain in the build. API source builds retain their uncached setting. Cached client build failures still stop startup. A cold client build can take several minutes; report cold and warm timings separately.

The checks launcher sets DPRINT_CACHE_DIR to the repository-owned .stack/check-cache/dprint directory. This retains compiled formatter plugins across disposable containers. Verification passes --incremental=false, so every configured file is checked each time; no previous formatting result satisfies the gate. Deleting this isolated plugin cache only makes the next run cold.

The checks launcher also caps dprint at sixteen formatting threads through DPRINT_MAX_THREADS. This bounds the formatter alongside unit and integration workers without changing file selection or comparison. Root paths with spaces and both formatter environment assignments are covered by launcher command tests.

Current bench:stack recordings are written to .stack/benchmarks. Archived OpenSpec evidence remains historical and is never the runtime output directory.
