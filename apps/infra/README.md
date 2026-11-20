# @platform/infra

Pulled images are retained when a stack is destroyed, so a test teardown cannot try to remove an image still used by development. Explicit image pruning remains part of the separately authorized prune command.

Configure the product object store with `RUSTFS_ACCESS_KEY` and `RUSTFS_SECRET_KEY` before running `stack:up`; production also needs `PLATFORM_ASSET_HOST`. Missing one credential fails configuration. Without both variables the store is not provisioned. Credentials are passed to Pulumi through the environment, not written into generated stack configuration or Caddy text.

Configured stacks run RustFS 1.0.4 pinned to its registry digest on the internal backend network. Only Caddy reaches its fixed address. The store publishes no port and disables its console. Caddy serves the asset host (`assets.localhost` in development, `assets.proxy` in tests) and preserves Host for signed S3 requests. Data and logs have separate persistent folders under `.stack/data`, owned by the image's 10001:10001 identity. Removing containers retains those folders. The built console and docs are published to their own buckets, with anonymous GetObject only. They are served at `console.sites.<asset host>` and `docs.sites.<asset host>`. Caddy preserves Host, forwards API paths and retries console 404 responses against its index. Docs retain 404 responses. API asset capabilities stream uploads through the API and downloads from the object store through Caddy.

The stack that runs the API: a typed Pulumi program, one stack per environment (`development`, `test`, `production`), run against rootless Podman through its Docker-compatible socket.

- `environmentFor(name)` in `@platform/config/environments` is the description of an environment: the proxy host and port, where its certificates come from, which ports it publishes, whether it mounts the source and whether it has test services. It is parsed against a Zod schema.
- `planFor(environment, root)` turns that description into a `StackPlan`: two networks (`edge`, and `backend`, which is internal), two base data folders plus two when object storage is configured, the proxy container (Caddy, pinned by digest, with its rendered configuration) and the API container, which sits on the backend network only and publishes no port.
- The test environment also runs an identity server, Dex (`renderDexConfig`, `dexIssuerOf` in `src/dex.ts`), on the backend network under the name `dex`: the API verifies its tokens (provider `jwks`) and the group `admin` of its static user makes an administrator. The API has a fixed address in the backend network (`backend` in `packages/config/src/environments.ts`) and the proxy reaches it by that address, because the name did not always answer in time for a proxy on two networks.
- `renderCaddyfile(proxy, host, port)` writes the proxy configuration: TLS, HTTP/1.1, HTTP/2 and HTTP/3, forwarding to the API over HTTP/1.1 without buffering.
- `applyPlan(plan, socket)` creates the resources with `@pulumi/docker`; `runStack(config, env)` reads the Pulumi configuration of the stack and applies the plan; `src/program.ts` is the entry point that Pulumi runs.
- `dataFoldersOf(environment, root)` names the data folders of an environment: `.stack/data/<container name>-data` under the root, one for the proxy (owner `0:0`) and one for the API (owner `1000:1000`, the `bun` user of the image). Configured object storage adds its data and log folders (owner `10001:10001`). They are bind mounts, so the container storage holds no named volume of the stack.
- `src/cli.ts` is the one command line: `up`, `down`, `check` and `prune`. `up` creates the data folders and gives them to the user of the container with a short-lived ownership helper container that mounts only the target folder, disables networking and retains only the CHOWN capability, builds the images with `--layers=false` and a label, sets the identity of the API image as a label of its container (a new build replaces the container) and removes the image it replaced. `prune` stops and removes the containers and networks of the stack, the `.stack/data` and `.stack/state` folders (with `podman unshare rm -rf`, because the files belong to a mapped user), the images with the label and the base images that the Containerfiles name, and prints how many bytes that freed.
- `containers/api` and `containers/curl-h3` are the Containerfiles of the API image and of the static curl 8.23.0 with HTTP/3 that the tests use as their client.

Nothing is generated and committed: the program is the source, and the unit tests with Pulumi mocks (`testing/unit/infra`) check, for each environment, the resources it would create. The stack files (`Pulumi.<environment>.yaml`) and the state are created by the stack scripts and are not committed.

| File                               | Responsibility                                                   |
| ---------------------------------- | ---------------------------------------------------------------- |
| `Pulumi.yaml`                      | Names the project and its Bun entry point                        |
| `package.json`                     | Dependencies and exports                                         |
| `src/index.ts`                     | Exports plan, renderer and resource functions                    |
| `src/program.ts`                   | Starts the Pulumi program                                        |
| `src/stack.ts`                     | Reads configuration and selects the environment                  |
| `src/plan.ts`                      | Builds typed network, container, mount and data-folder plans     |
| `src/apply.ts`                     | Registers the plan with the Docker provider                      |
| `src/caddy.ts`                     | Renders proxy routes from configuration and the message template |
| `src/dex.ts`                       | Renders test identity service configuration                      |
| `src/cli.ts`                       | Lifecycle commands, image builds and readiness                   |
| `src/tools.ts`                     | Installs the pinned Pulumi bundle with its language hosts        |
| `src/runner.ts`                    | Builds and starts the shared local-check container               |
| `src/static.ts`                    | Builds, exports and publishes the static application sites       |
| `src/watchers.ts`                  | Probes recursive watch allocation and releases every handle      |
| `containers/api/Containerfile`     | API bundle and runtime files                                     |
| `containers/curl-h3/Containerfile` | Builds the pinned HTTP/3 client from checksum-verified sources   |
| `containers/console/Containerfile` | Builds and packages only the static console output               |
| `containers/docs/Containerfile`    | Builds and packages only the static documentation output         |
| `containers/checks/Containerfile`  | Pinned Node and Bun runtimes, with Chromium for browser checks   |

Development also runs the console and documentation site. `developmentApps` in the environment description gives each app its command, proxy host and fixed backend address. Their source is mounted at `/app`, and polling enables Vite and Astro updates. Caddy routes API requests on those hosts to the API and other requests, including WebSocket upgrades, to the app server. The console uses its own proxy origin for API calls.

The command line also accepts `status`, `logs`, `reset` and `tools`. `status <environment>` prints the selected containers; `logs <environment>` prints the last 200 API log lines. `reset <environment>` destroys that stack, removes only its configured data folders, then recreates it; it removes persisted data. `tools` installs the stack tools without selecting an environment. Root scripts include `stack:status`, `stack:logs`, `dev:logs` and `dev:reset`.

Use the `project-stack` skill and `/dev:stack` for the local app loop. Container execution, output ownership and application runtime image audits are recorded in task 6.7 of the product change. Static sites use separate scratch images containing only their app output; build tooling stays in build stages. `static.ts` exports these assets and publishes them through the proxy from the edge network. Credentials travel through stdin. Built output is under `.stack/static/<environment>/<app>`. The console uses its page origin for API requests unless an explicit API origin is configured.

`bun run check:run <command> [arguments]` runs a command in the checks container. The repository is mounted at its original absolute path, and `--userns=keep-id` keeps output owned by the calling user. The image tag is the SHA-256 of its Containerfile; an existing matching image is reused. No repository source or dependency tree is copied into this image. It uses the installed dependencies through the repository mount. Standard input stays open through Podman, Git index and repository environment variables are forwarded by name, output is inherited, and build or command failures remain blocking. It mounts no container-engine socket and publishes no port.

Root formatting, lint, type checking, spelling and unit-test commands use this runner. Verification uses it for every phase, including end-to-end and coverage. `check:run --stack` mounts the local engine socket and a unique temporary directory outside the checkout at their original paths. Temporary fixtures stay outside the repository and are removed after execution. Nested checks stay inside the current controller. No account directories or provider credentials are mounted. Pre-commit and commit-message checks use the same runner, including staged formatting and message input. Application runtime image audits, ownership and real container execution are recorded in task 6.7.

Pulumi installation lives in `src/tools.ts`. Both tool installers use `tooling/scripts/download-tool.ts` to verify bytes before extraction. The root `tools:install` command installs verification binaries and then calls this application's `tools` command.

Development startup allocates recursive watches for the API and workspace packages, then closes every probe handle. Allocation failure blocks startup before tools, builds or container changes and reports its cause and relevant inotify settings. The probe neither reserves watches for the running servers nor changes system settings. Console and docs use polling; API uses Bun watch mode. Fixed backend addresses avoid an upstream DNS lookup for each new connection.

Reset and prune require authorization for data removal. `stack:down` retains data. `stack:check` refreshes the configured API image identity before asking Pulumi to expect no changes. `stack:status` prints status and published ports; only Caddy publishes the configured TLS port over TCP and UDP.

Installer unit cases inject extraction results. `testing/integration/infra/install-bundles.test.ts` runs real archive extraction and checks the language host next to Pulumi. Watcher unit cases check allocation failures and handle cleanup. A development reload proof receives an update through Caddy, reads the edited result without rebuilding, then restores exact source bytes. The recorded acceptance probe also requires zero failures from 40 parallel WebSocket connections per app.
