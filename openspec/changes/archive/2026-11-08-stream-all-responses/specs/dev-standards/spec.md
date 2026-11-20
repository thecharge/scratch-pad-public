## MODIFIED Requirements

### Requirement: Every development rule is enforced in pre-commit and blocks
Every development rule SHALL be backed by a blocking automated check in the commit or push hooks and in `bun run verify`. Staged formatting, secret scanning, commit messages and skill freshness SHALL remain commit-time checks. The push hook SHALL invoke the complete `bun run verify` pipeline once, including all end-to-end, coverage and generated-documentation checks. Development SHALL use focused checks while implementing a substantive batch; a separate full run immediately before the push hook SHALL NOT be required. Checks SHALL NOT be skipped or changed to warnings to shorten delivery.

#### Scenario: A batch is committed
- **WHEN** a contributor commits a batch
- **THEN** staged checks block invalid content without rebuilding the documentation or recording the knowledge base

#### Scenario: A batch is pushed
- **WHEN** a contributor pushes a batch
- **THEN** one complete verification pipeline runs and any mandatory failure prevents the push

#### Scenario: The full push command is changed
- **WHEN** the push hook no longer invokes the canonical full verification command
- **THEN** the rule registry check rejects rules whose individual jobs are absent

#### Scenario: The dependency audit loses its connection
- **WHEN** the audit produces no report and fails with the observed connection-closed request error or reaches its time limit
- **THEN** the audit runner allows at most three attempts, each limited to 60 seconds with a five-second kill grace period, and passes only after a fresh unfiltered audit succeeds

#### Scenario: The dependency audit reports findings or cannot recover
- **WHEN** an audit reports vulnerabilities, another error occurs, or all transport attempts fail
- **THEN** the mandatory audit step fails and prevents delivery

### Requirement: Disabled GitHub Actions workflows
No GitHub Actions workflow SHALL exist in the repository: `.github/workflows` SHALL be absent or contain no `.yml` or `.yaml` file, and verification SHALL run locally through the hooks and `bun run verify`.

#### Scenario: A workflow file exists
- **WHEN** a `.yml` or `.yaml` file exists under `.github/workflows`
- **THEN** the workflows check in `verify` fails and names the file

#### Scenario: No workflow exists
- **WHEN** `.github/workflows` is absent or empty
- **THEN** the workflows check passes and no workflow run is started

## ADDED Requirements

### Requirement: Local data and cleanup of the container stack
The data of the container stack SHALL live in folders under one directory of the repository that git ignores, never in named volumes of the container storage. One local command SHALL remove the stack's containers, its data folders and its images, including the untagged images that builds leave, and SHALL report what it removed and the bytes it freed. A build SHALL remove the image it replaces.

#### Scenario: The stack runs and stores data
- **WHEN** the stack is up
- **THEN** every data volume is a bind mount of a folder under `.stack/data` and the container storage holds no named volume of the stack

#### Scenario: The prune command runs
- **WHEN** `bun run stack:prune` runs
- **THEN** the stack is stopped, its containers, `.stack/data` folders and images are removed, and the command prints what it removed and the bytes freed

#### Scenario: The stack is rebuilt
- **WHEN** the API image is built again
- **THEN** the image it replaces is removed and no untagged copy of it remains

### Requirement: One container per app, with the proxy in front of everything
Each app SHALL have its own container image that holds only that app and what it needs to run: no tooling, no test, no script and no other app. The proxy (Caddy) and the object store (RustFS) SHALL be separate containers, with RustFS behind the proxy. The built console and the built documentation site SHALL be static assets served from RustFS through the proxy, and the API SHALL be reached through the same proxy. The infrastructure app SHALL be the one app that has no container, because it creates the containers from the host. No test and no development SHALL run on the host machine.

#### Scenario: The API image is built
- **WHEN** the API image is built
- **THEN** the image holds the bundle of the API and the files it reads, and no other app, no tooling and no test

#### Scenario: A static site is requested
- **WHEN** a request for the console or the documentation site reaches the proxy
- **THEN** the proxy forwards it to RustFS with the original `Host` and RustFS answers with the built asset

## Verified external sources

| Source | URL | Fetched UTC | HTTP | SHA-256 | Passage | Falsification and output |
| --- | --- | --- | --- | --- | --- | --- |
| S16 | https://raw.githubusercontent.com/rustfs/rustfs/main/README.md | 2026-11-07T20:36:16.270726+00:00 | 200 | 86c3104b47e4ef7c2059a3684e2687d2a108c936249d5d2dc177f3598634ea2c | RustFS is a high-performance, distributed object storage system built in Rust \| RustFS is released under the permissible Apache 2.0 license \| instead of docker, you can install the RustFS with the below command \| The RustFS container runs as a non-root user rustfs (UID/GID 10001:10001) | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 4/4 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S17 | https://raw.githubusercontent.com/rustfs/rustfs/main/docs/architecture/s3-compatibility-matrix.md | 2026-11-07T20:36:16.284840+00:00 | 200 | e99d1206c667614e715c6fa4377f9edc406ae7650f0a684d17e201d3dab75dd4 | Presigned GET and PUT URLs \| Range and conditional reads \| Multipart upload create/upload/complete/abort \| It does not claim complete coverage of every standard or vendor-specific S3 behavior. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 4/4 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S18 | https://raw.githubusercontent.com/rustfs/rustfs/main/LICENSE | 2026-11-07T20:46:25.247990+00:00 | 200 | 8ef87773cd6df917c9cf75bdb3075d92b78ad4cdf8e51d6c98030292442524d8 | Apache License | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S32 | https://raw.githubusercontent.com/caddyserver/website/6b06285cb94fbd415df864dbd1ed12a984963582/src/docs/markdown/caddyfile/directives/reverse_proxy.md | 2026-11-07T20:36:16.960179+00:00 | 200 | 5a18aff58be22b0fae19995a8dabbb1393ecabf2e2fa4b194b5438f6106a88ed | The proxy also supports WebSocket connections, performing the HTTP upgrade request then transitioning the connection to a bidirectional tunnel | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S35 | https://github.com/rustfs/rustfs/pull/8183.patch | 2026-11-07T20:46:26.993235+00:00 | 200 | 2e34ef2b55b4d11588e9360e463d84b6690d559597fe8ce477d334c591f12800 | RUSTFS_WEBSITE_DOMAINS | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S36 | https://github.com/rustfs/rustfs/pull/8183.patch | 2026-11-07T20:46:27.704544+00:00 | 200 | 2e34ef2b55b4d11588e9360e463d84b6690d559597fe8ce477d334c591f12800 | Website requests are anonymous. \| Grant `s3:GetObject` through the bucket policy | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S37 | https://raw.githubusercontent.com/rustfs/rustfs/1.0.1/Cargo.toml | 2026-11-07T20:36:17.048979+00:00 | 200 | f2e0ea9ece0f233b010d1203260cb749cc2e4bdd7cd55c855d2c7e62d5416b55 | version = "1.0.1" | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
