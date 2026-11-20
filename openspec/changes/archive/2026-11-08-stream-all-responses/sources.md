# Sources and verification

## Task 6.7 runner sources, 2026-11-07

| File using the source | Primary source | Fetch date | Status | SHA-256 | Quote and local falsification |
|---|---|---|---|---|---|
| `apps/infra/src/runner.ts`, `packages/constants/src/infra.ts` | [Podman 4.9.3 run manual](https://raw.githubusercontent.com/containers/podman/v4.9.3/docs/source/markdown/podman-run.1.md.in) | 2026-11-07 | 200 | `bc9ad37ca2677716ae7f9b8c1062e3a9d1921b8ecd71d92a2f5d07df2da37dbf` | “processes running in the container run as the user's UID”; live output stat matched host UID and GID 1000; exit 23 and missing-command 127 remained failures |
| `apps/infra/containers/checks/Containerfile` | [Node image source README](https://raw.githubusercontent.com/nodejs/docker-node/main/README.md) | 2026-11-07 | 200 | `beaa1d8fac6203da4032d91c9a02957d6083a86be8e05ed3a603c817638c082a` | “The official Node.js docker image”; the built image ran Node `v24.22.2` and Bun `1.3.10`; removing the inherited Node entrypoint made missing executables return the native container error |

Fetched copies are ignored `.stack/runner-research/*.txt`. Registry manifest responses for `library/node:24-bookworm` and `oven/bun:1.3.10-debian` were HTTP 200 on 2026-11-06. Their content SHA-256 values matched their Docker content digests: `8fa96264f302f58bbb13aa7339c541547b56975766ce956c875da149452a3e40` and `367842b35abbdf23f39e23c71f3a08eee940ff2679a14e08a5afcf4a1436cd89`. Those immutable references were pinned before execution. The installed Chromium comes from the base image's configured Debian package repositories; its exact build version is recorded in the task evidence. These records do not complete the repository-wide sources gate in task 1.0.

Fetched 2026-11-03 with `curl -sL`. Each source has its URL, the SHA-256 of the stored copy in `evidence/sources/`, each quoted passage and the falsification attempt. A passage is "found" when its text occurs in the stored copy after both sides have whitespace and the markup characters `*`, backtick, `_`, `[` and `]` removed and case ignored. Where the source has a second form (the rendered page next to the Markdown), the same passage is searched there too; "NO" is reported as it came out. The stored copies are cleaned text or Markdown, not the HTML pages.

## S1 AIP-151 long-running operations

- URL: https://google.aip.dev/151
- Stored copy: `evidence/sources/aip0151.md`
- SHA-256 of the stored copy: `6874209d975bc8ac796a11771a4099194ef9455ce7bbd6ad1ed6aba90998a8f4`
- Fetched from: https://raw.githubusercontent.com/aip-dev/google.aip.dev/master/aip/general/0151.md
- Second source: the rendered page https://google.aip.dev/151, stored as `evidence/sources/google_aip_dev_151.txt`, SHA-256 `3d578a54cefadb6e191a5fd0d00779993050b3a50166157451bcb78c6f1f2dee`

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| The response must not be a streaming response. | yes (1) | yes (1) |
| Individual APIs must not define their own interfaces for long-running operations to avoid non-uniformity. | yes (1) | yes (1) |
| Errors that prevent a long-running operation from starting must return an error response | yes (1) | yes (1) |
| Operations that fail during their execution phase must return an error response | yes (1) | yes (1) |
| A good rule of thumb for operation expiry is 30 days. | yes (1) | yes (1) |

## S2 AIP-158 pagination

- URL: https://google.aip.dev/158
- Stored copy: `evidence/sources/aip0158.md`
- SHA-256 of the stored copy: `3275e7ac12a1f9f8b3f10e36edb47d942e83293ab5a27aa3aea3107f0f0e7b76`
- Fetched from: https://raw.githubusercontent.com/aip-dev/google.aip.dev/master/aip/general/0158.md
- Second source: the rendered page https://google.aip.dev/158, stored as `evidence/sources/google_aip_dev_158.txt`, SHA-256 `881611a4887ef84a577ef11a92f83bae2a890531a02f633ab3f3833a72b81377`

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| The response must not be a streaming response. | yes (1) | yes (1) |
| If the end of the collection has been reached, the next_page_token field must be empty. | yes (1) | yes (1) |
| If the user specifies a negative value for page_size, the API must send an INVALID_ARGUMENT error. | yes (1) | yes (1) |
| If the user does not specify page_size (or specifies 0), the API chooses an appropriate default | yes (1) | yes (1) |
| If the user specifies page_size greater than the maximum permitted by the API, the API should coerce down to the maximum permitted page size. | yes (1) | yes (1) |

## S3 google.longrunning.Operations service

- URL: https://github.com/googleapis/googleapis/blob/master/google/longrunning/operations.proto
- Stored copy: `evidence/sources/operations.proto`
- SHA-256 of the stored copy: `5d2e7f9eeb55b8417b50e0a536a092babd32d26e4fbeb7099c6cdcda6e16db9c`
- Fetched from: https://raw.githubusercontent.com/googleapis/googleapis/master/google/longrunning/operations.proto

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| rpc ListOperations | yes (1) | n/a |
| rpc GetOperation | yes (1) | n/a |
| rpc DeleteOperation | yes (1) | n/a |
| rpc CancelOperation | yes (1) | n/a |
| rpc WaitOperation | yes (1) | n/a |

## S4 MCP 2026-07-28 key changes

- URL: https://modelcontextprotocol.io/specification/2026-07-28/changelog
- Stored copy: `evidence/sources/spec_changelog.md`
- SHA-256 of the stored copy: `280533e289ca1a638973b06f6f4d8a8aff735a3c3fe594ffb32696d63de530f6`
- Fetched from: https://modelcontextprotocol.io/specification/2026-07-28/changelog.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| Remove protocol-level sessions and the Mcp-Session-Id header | yes (1) | n/a |
| Add server/discover | yes (1) | n/a |
| Replace the HTTP GET endpoint and resources/subscribe/resources/unsubscribe with subscriptions/listen | yes (1) | n/a |
| Move experimental tasks out of the core protocol and into an official extension (io.modelcontextprotocol/tasks) | yes (1) | n/a |
| Remove SSE stream resumability and message redelivery (the Last-Event-ID header and SSE event IDs) | yes (1) | n/a |
| Require standard MCP request headers (Mcp-Method, Mcp-Name) | yes (1) | n/a |

## S5 MCP Streamable HTTP

- URL: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
- Stored copy: `evidence/sources/spec_basic_transports_streamable-http.md`
- SHA-256 of the stored copy: `94dfcaf09285c9d8398c9ee0277b440f6d3051b182266c46c9b4e55864665288`
- Fetched from: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| The client MUST include an Accept header listing both application/json and text/event-stream as supported content types. | yes (1) | n/a |
| the server MUST return either Content-Type: application/json (a single JSON object) or Content-Type: text/event-stream (an SSE response stream). The client MUST support both. | yes (1) | n/a |
| Removal of the GET stream endpoint. | yes (1) | n/a |
| Every POST request to the MCP endpoint MUST include an MCP-Protocol-Version header. | yes (1) | n/a |

## S6 MCP subscriptions

- URL: https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions
- Stored copy: `evidence/sources/spec_basic_patterns_subscriptions.md`
- SHA-256 of the stored copy: `a3e81e777bbef20d1885c274095557059125c685697abde14bfad6db570fa1e7`
- Fetched from: https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| subscriptions/listen opens a long-lived notification stream from the server to the client. | yes (1) | n/a |
| The server MUST NOT send notification types the client has not explicitly requested. | yes (1) | n/a |

## S7 MCP Tasks extension

- URL: https://modelcontextprotocol.io/extensions/tasks/overview
- Stored copy: `evidence/sources/mcp-ext-tasks-overview.md`
- SHA-256 of the stored copy: `af7048bc5af31f84754b1a0bd0392236088c621bd38d618fba443a122798c692`
- Fetched from: https://modelcontextprotocol.io/extensions/tasks/overview.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| MCP Tasks let servers return a durable handle instead of blocking | yes (1) | n/a |
| io.modelcontextprotocol/tasks | yes (3) | n/a |
| tasks/get | yes (9) | n/a |
| tasks/update | yes (5) | n/a |
| tasks/cancel | yes (2) | n/a |

## S8 MCP progress

- URL: https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/progress
- Stored copy: `evidence/sources/spec_basic_patterns_progress.md`
- SHA-256 of the stored copy: `5178234f897db0a2b015012f15a9f8790b02900b66b962f1a2519395de74bdfa`
- Fetched from: https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/progress.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| The progress value MUST increase with each notification | yes (1) | n/a |
| notifications/progress | yes (1) | n/a |

## S9 MCP pagination

- URL: https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination
- Stored copy: `evidence/sources/spec_server_utilities_pagination.md`
- SHA-256 of the stored copy: `ac5c57603b3a56dd12196527ba1d3da78eba2db99a9c6f8326c8a24eaefbedd9`
- Fetched from: https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| Pagination in MCP uses an opaque cursor-based approach, instead of numbered pages. | yes (1) | n/a |
| clients MUST NOT assume a fixed page size | yes (1) | n/a |

## S10 MCP tools content types

- URL: https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- Stored copy: `evidence/sources/spec_server_tools.md`
- SHA-256 of the stored copy: `ffd2f284b837a0e00b2cb0a366dfa76d90ff579b759dfdc91f9fcabb8e51e76b`
- Fetched from: https://modelcontextprotocol.io/specification/2026-07-28/server/tools.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| resource_link | yes (5) | n/a |
| Embedded Resources | yes (4) | n/a |

## S11 MCP File Uploads working group charter

- URL: https://modelcontextprotocol.io/community/working-groups/file-uploads
- Stored copy: `evidence/sources/modelcontextprotocol_io_community_working-groups_file-uploads.txt`
- SHA-256 of the stored copy: `d68d9c4591a2065255243e96eef0ea89a4ec298d8d298311694ba78b3f9993be`

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| define how MCP tools and elicitation requests declare file inputs | yes (1) | n/a |
| How a tool returns a file that is too large for a JSON-RPC message | yes (4) | n/a |
| The WG may evaluate approaches such as streaming, chunked transfer, or presigned upload URLs | yes (2) | n/a |
| SEP-2356: Declarative file inputs | yes (2) | n/a |
| Add file downloads to scope as a secondary item | yes (2) | n/a |

## S12 SEP-2356 pull request (GitHub API)

- URL: https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2356
- Stored copy: `evidence/sources/sep-2356-pr.json`
- SHA-256 of the stored copy: `cafddc9bd9f498b78cd535140c0927ba55eadbb1b49956ebe83e269022435d48`
- Fetched from: https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/pulls/2356

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| "merged":false | yes (1) | n/a |
| "state":"closed" | yes (1) | n/a |
| Files are transmitted as RFC 2397 data URIs | yes (1) | n/a |
| data:<mediatype>;name=<filename>;base64,<data> | yes (1) | n/a |

## S13 MCP intro, version 2026-07-28

- URL: https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro
- Stored copy: `evidence/sources/modelcontextprotocol_io_docs_2026-07-28_getting-started_intro.txt`
- SHA-256 of the stored copy: `7a452261d87af7ba4c4874401feb7314f696cd01645246be840411d5e72cb817`

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| Version 2026-07-28 (latest) | yes (4) | n/a |

## S14 MCP Skills extension overview

- URL: https://modelcontextprotocol.io/extensions/skills/overview
- Status: documentation of the MCP project; the SDK support is not yet shown (task 5.1).
- Stored copy: `evidence/sources/mcp-ext-skills-overview.md`
- SHA-256 of the stored copy: `1019ebbc801593872310dc734dbfffe9f00324e91e7f1610d6841839d19e4974`
- Fetched from: https://modelcontextprotocol.io/extensions/skills/overview.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| /2640-skills-extension.md) is Final. | yes (1) | n/a |
| Clients can discover available skills, retrieve their metadata, and read their contents using the existing Resources primitive. | yes (1) | n/a |
| Skill files are served through resources/read. | yes (1) | n/a |
| Servers that declare this extension MUST implement skills/list and skills/get. | yes (1) | n/a |

## S15 SEP-2640 Skills extension (the skill:// scheme)

- URL: https://modelcontextprotocol.io/seps/2640-skills-extension
- Status: documentation of the MCP project, SEP stated Final in S14.
- Stored copy: `evidence/sources/mcp-sep-2640-skills-extension.md`
- SHA-256 of the stored copy: `72e16488444b887e90db1fc0530d882991ec4951cb1724fa59c7090c188ab14a`
- Fetched from: https://modelcontextprotocol.io/seps/2640-skills-extension.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| This SEP has reached Final status | yes (1) | n/a |
| Servers SHOULD use the skill:// URI scheme | yes (1) | n/a |
| skill://<skill-path>/<file-path> | yes (1) | n/a |
| Each file within a skill directory is exposed as an MCP resource. | yes (1) | n/a |

## S16 RustFS README

- URL: https://github.com/rustfs/rustfs
- Status: claims of the RustFS project about itself; no independent run yet (task 6.10). The image digest and its provenance are not yet vetted; no RustFS image is run before they are.
- Stored copy: `evidence/sources/rustfs-readme.md`
- SHA-256 of the stored copy: `86c3104b47e4ef7c2059a3684e2687d2a108c936249d5d2dc177f3598634ea2c`
- Fetched from: https://raw.githubusercontent.com/rustfs/rustfs/main/README.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| RustFS is a high-performance, distributed object storage system built in Rust | yes (2) | n/a |
| RustFS is released under the permissible Apache 2.0 license | yes (1) | n/a |
| instead of docker, you can install the RustFS with the below command | yes (1) | n/a |
| The RustFS container runs as a non-root user rustfs (UID/GID 10001:10001) | yes (1) | n/a |

## S17 RustFS S3 compatibility matrix

- URL: https://github.com/rustfs/rustfs/blob/main/docs/architecture/s3-compatibility-matrix.md
- Status: claims of the RustFS project about itself, from its own test lists; no independent run yet (task 6.10 runs presigned GET and PUT, range reads and multipart upload through the proxy).
- Stored copy: `evidence/sources/rustfs-s3-compatibility-matrix.md`
- SHA-256 of the stored copy: `e690c8a298772137de43e2ff8d91cfcb7c699d8336a467d6ee1a2ddd253a79b9`
- Fetched from: https://raw.githubusercontent.com/rustfs/rustfs/main/docs/architecture/s3-compatibility-matrix.md

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| Presigned GET and PUT URLs | Supported | yes (1) | n/a |
| Range and conditional reads | Supported | yes (1) | n/a |
| Multipart upload create/upload/complete/abort | yes (1) | n/a |
| It does not claim complete coverage of every standard or vendor-specific S3 behavior. | yes (1) | n/a |

## S18 RustFS repository metadata (GitHub API)

- URL: https://github.com/rustfs/rustfs
- Status: repository metadata at the time of fetch; the file `evidence/sources/rustfs-repo.json` is the GitHub API answer.
- Stored copy: `evidence/sources/rustfs-repo.json`
- SHA-256 of the stored copy: `fe76d42ed3a77fbafa67848bc69551a80988bd12287d5ed23ec6e74ce83dd9ca`
- Fetched from: https://api.github.com/repos/rustfs/rustfs

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| "archived": false | yes (1) | n/a |
| "spdx_id": "Apache-2.0" | yes (1) | n/a |

## S19 Pulumi unit testing with mocks

- URL: https://www.pulumi.com/docs/iac/concepts/testing/unit/
- Status: documentation claim, confirmed by a run (task 6.0 evidence, mock test).
- Stored copy: `evidence/sources/pulumi-unit-testing.txt`
- SHA-256 of the stored copy: `dcafa64e9456a8e8dbc92f007cc139a9c5e99c959443b73ce0ed66363099e703`

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| Because mocks don’t do any real work, unit tests run fast. They’re also deterministic, since nothing about them depends on the behavior of an external system. | yes (1) | n/a |
| Unit tests are supported in every general-purpose | yes (1) | n/a |

## S20 Pulumi state and backends

- URL: https://www.pulumi.com/docs/iac/concepts/state-and-backends/
- Status: documentation claim, confirmed by a run (state written under a file backend).
- Stored copy: `evidence/sources/pulumi-state-and-backends.txt`
- SHA-256 of the stored copy: `5b5a76c04e3012f3baec09dcf8b780ef66818f9144bcec88616b5ef876f41003`

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| or your local filesystem | yes (2) | n/a |
| You can manage state yourself with a DIY backend | yes (1) | n/a |

## S21 Pulumi stacks

- URL: https://www.pulumi.com/docs/iac/concepts/stacks/
- Status: documentation claim, confirmed by a run (two stacks, two environments).
- Stored copy: `evidence/sources/pulumi-stacks.txt`
- SHA-256 of the stored copy: `6cfd9a350047a43db5da86b8a81c88221f303a3fd2fd31ebe3943cb2de55e34f`

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| A stack is an isolated, independently configurable instance of a Pulumi program. | yes (1) | n/a |

## S22 OpenTofu test command

- URL: https://opentofu.org/docs/cli/commands/test/
- Status: documentation claim, confirmed by a run (`tofu test`).
- Stored copy: `evidence/sources/opentofu-test.txt`
- SHA-256 of the stored copy: `38ca4cfb3ccf183f66f4b2047d9311696f17cbbc1b3c730b2e2eeafac380cce4`

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| tofu test [options] | yes (1) | n/a |
| *.tftest.hcl | yes (44) | n/a |

## S23 Pulumi Docker provider

- URL: https://www.pulumi.com/registry/packages/docker/
- Stored copy: `evidence/sources/pulumi-docker-registry.txt`
- SHA-256 of the stored copy: `1f34a490c36d12e77f99c8bb1934a28cbdd496268fb6d6737eb7dd18d84b5317`

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| Docker Provider | yes (6) | n/a |
| Docker v5.2.0 | yes (8) | n/a |

## S24 Pulumi repository metadata

- URL: https://github.com/pulumi/pulumi
- Status: repository metadata at the time of fetch.
- Stored copy: `evidence/sources/gh-pulumi-pulumi-repo.json`
- SHA-256 of the stored copy: `08db55f3dcecb29376ef551cf76d65bf97460d459bb1863cd584d8af3715aafb`
- Fetched from: https://api.github.com/repos/pulumi/pulumi

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| "spdx_id": "Apache-2.0" | yes (1) | n/a |
| "archived": false | yes (1) | n/a |

## S25 Pulumi latest release

- URL: https://github.com/pulumi/pulumi/releases/tag/v3.273.0
- Status: the release the trial downloaded; its archive checksum matched (task 6.0 evidence).
- Stored copy: `evidence/sources/gh-pulumi-pulumi-release.json`
- SHA-256 of the stored copy: `d63bf4aafce0a78d0dfb1f0eb14b3881fbcd007ff3c7b2bd20998ad31ad67834`
- Fetched from: https://api.github.com/repos/pulumi/pulumi/releases/latest

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| "tag_name": "v3.273.0" | yes (1) | n/a |

## S26 OpenTofu repository metadata

- URL: https://github.com/opentofu/opentofu
- Stored copy: `evidence/sources/gh-opentofu-opentofu-repo.json`
- SHA-256 of the stored copy: `9765b03a46d6f377d689510fcc31993df809abc0b3b3d19746b0215b7efbaa8c`
- Fetched from: https://api.github.com/repos/opentofu/opentofu

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| "spdx_id": "MPL-2.0" | yes (1) | n/a |
| "archived": false | yes (1) | n/a |

## S27 OpenTofu latest release

- URL: https://github.com/opentofu/opentofu/releases/tag/v1.13.2
- Status: the release the trial downloaded; its archive checksum matched (task 6.0 evidence).
- Stored copy: `evidence/sources/gh-opentofu-opentofu-release.json`
- SHA-256 of the stored copy: `586828d46f7e8c03900d8aa82c0ca16c8fcb8a68ec58082b969ba6d8f7a47951`
- Fetched from: https://api.github.com/repos/opentofu/opentofu/releases/latest

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| "tag_name": "v1.13.2" | yes (1) | n/a |

## S28 Pulumi Docker provider license

- URL: https://github.com/pulumi/pulumi-docker/blob/master/LICENSE
- Stored copy: `evidence/sources/pulumi-docker-LICENSE.txt`
- SHA-256 of the stored copy: `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`
- Fetched from: https://raw.githubusercontent.com/pulumi/pulumi-docker/master/LICENSE

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| Apache License | yes (4) | n/a |
| Version 2.0, January 2004 | yes (1) | n/a |

## S29 Podman installation (the command printed when Podman is missing)

- URL: https://podman.io/docs/installation
- HTTP status: 200 (fetched 2026-11-03)
- Stored copy: `evidence/sources/podman-installation.html`
- SHA-256 of the stored copy: `5f28aba118bab497742985a353a3bfa75ce5863ea5e2af51d91c16e7be528304`

| Quoted passage | Found in the stored copy | Found in the second source |
| - | - | - |
| The podman package is available in the official repositories for Ubuntu 20.10 and newer | yes (1) | n/a |
| sudo apt-get -y install podman | yes (2) | n/a |

Falsification attempt: the stored copy was searched for a different command for the same step (`sudo apt-get -y remove podman` as a stand-in for a changed package name) and for any statement that Ubuntu needs another package; neither was found (0 hits), so the claim stands. This source backs only the install command in the message; it says nothing about rootless Podman 4.9.3, which was observed by running `podman --version`.

## S30 OpenAPI 3.1: Accept and Content-Type are not header parameters

- URL: https://spec.openapis.org/oas/v3.1.0.html (status 200, fetched 2026-11-04); second source https://spec.openapis.org/oas/v3.1.1.html (status 200)
- Stored copies: `evidence/sources/openapi-3.1.0.html` (SHA-256 `156788f23f0e3be376b9635f70451535e4280c3227747dbdd1dd6a0e50f61f1b`) and `evidence/sources/openapi-3.1.1.html` (SHA-256 `95a797a55918e5c9278148ecc7c4a4bd571329f51fbcb5de12672c131c873463`)
- Method: tags removed, whitespace collapsed, spaces before commas and full stops removed, then the passage searched literally.

| Quoted passage | Found in 3.1.0 | Found in 3.1.1 |
| - | - | - |
| If in is "header" and the name field is "Accept", "Content-Type" or "Authorization", the parameter definition SHALL be ignored | yes (1) | yes (1) |
| The key is a media type or media type range | yes (2) | not searched |

Consequence for this change: the required `Accept` and `Content-Type` cannot be described as header parameters (tools ignore them). They are described by the media types the operation lists under `requestBody.content` (what `Content-Type` may be) and under each response's `content` (what `Accept` may name), by the 406 and 415 responses, and by a statement in the description of the document.

Falsification attempt: the stored copy of 3.1.0 was searched for a statement that these three names are honoured as header parameters; none was found, and the 3.1.1 text repeats the same sentence, so a later revision does not reverse it.

## S31 to S34 Development servers behind Caddy on rootless Podman (task 6.11 research)

Fetched 2026-11-04, each with status 200. Method: tags removed, entities decoded, whitespace collapsed, spaces before commas and full stops removed, then the passage searched literally. Stored copies are in `evidence/sources/`.

| Id | URL | Stored copy | SHA-256 |
| - | - | - | - |
| S31 | https://vite.dev/config/server-options | `vite-server-options.html` | `269b5a5e2ff250780e84140e5592a6e46a543cb38d052a5f4e60a7653b7c494b` |
| S32 | https://caddyserver.com/docs/caddyfile/directives/reverse_proxy | `caddy-reverse-proxy.html` | `e8397f6fa4fdef526ada6e59b80357c32cdd45015527125d42f9bbd9e01819a7` |
| S33 | https://docs.astro.build/en/reference/cli-reference/ | `astro-cli-reference.html` | `eeadb83e1974a0c011d1fc1e74cc8bda932d80ae1b3d0484b23e3606812104ed` |
| S34 | https://docs.podman.io/en/latest/markdown/podman-run.1.html | `podman-run.html` | `ae96f321f6d9b08f74fee1757c33bad97abb03208ad2d60d79d0329a7b61b09c` |

| Id | Quoted passage | Found | Falsification attempt and result |
| - | - | - | - |
| S31 | localhost and domains under.localhost and all IP addresses are allowed by default (of `server.allowedHosts`) | yes (1) | Run: the Vite 8.3.5 dev server in a container answered a request with Host `console.localhost` through Caddy with 200 and no configuration, and a request with Host `console` with 403 "Blocked request. This host ("console") is not allowed." The claim that every host is allowed was falsified by that 403; the quoted claim held. |
| S31 | Set this to 0.0.0.0 or true to listen on all addresses, including LAN and public addresses | yes (1) | Run: `vite --host 0.0.0.0` was reachable from the other containers of the network; without it Vite listens on localhost only (not run in this task, stated by the page). |
| S31 | File system watcher options to pass on to chokidar | yes (1) | Run: with `CHOKIDAR_USEPOLLING=1` the dev server logged 0 watcher errors and logged `hmr update /src/styles.css` after the file was edited on the host; without it 37 watcher errors (cause: inotify limit, see the evidence file). |
| S31 | The WebSocket-related options ( protocol, host, port, path, clientPort, timeout, server ) are deprecated | yes (1) | Run: with no HMR option set, the client served by Vite computed its socket address from the page address (`importMetaUrl.hostname`, `importMetaUrl.port`), so a page served through the proxy connects through the proxy. |
| S32 | The proxy also supports WebSocket connections, performing the HTTP upgrade request then transitioning the connection to a bidirectional tunnel | yes (1) | Run: a handshake through Caddy for `vite-hmr` answered 101 Switching Protocols (10 of 10 with an IP upstream; 3 of 10, then 1 of 12, with a name upstream because Caddy's lookup of the name timed out; see the evidence file). |
| S33 | --host [optional host address] and --allowed-hosts (flags of `astro dev`) | yes (4 and 6) | Not run in this task; the docs development server is exercised by the build of 6.11. |
| S34 | keep-id $UID $UID (Map user account to same UID within container.) (of `--userns`) | yes (1) | Not run in this task; the source mount of 6.11 will be written with and without it. |

## S35 to S37 RustFS serves bucket websites (tasks 6.10 and 6.11 research)

Fetched 2026-11-04, each with status 200, from the GitHub API with `curl`. Stored copies are in `evidence/sources/`. Method: the JSON field text was whitespace-collapsed and each passage searched literally in a script.

| Id | URL | Stored copy | SHA-256 |
| - | - | - | - |
| S35 | https://api.github.com/repos/rustfs/rustfs/issues/8081 | `rustfs-issue-8081.json` | `5d65840677778bb40633a4e1e6b7cfb183d627127038410b115cd9042b67dcb4` |
| S36 | https://api.github.com/repos/rustfs/rustfs/pulls/8183 | `rustfs-pr-8183.json` | `9012d263a32873a6b3fe2af51873b3a219c19802ee0c513d7f640c6ab76549cb` |
| S37 | https://api.github.com/repos/rustfs/rustfs/releases?per_page=5 | `rustfs-releases.json` | `f1eea09f98a86fe31d1d4e99580282a1df9a845c2370f06d5914955dd89d119a` |

| Id | Quoted passage | Found | Falsification attempt and result |
| - | - | - | - |
| S35 | the configuration is never used to serve content | yes (1) | A web search summary called this issue open. The fetched record says `state` closed, `state_reason` completed, closed 2026-09-28T10:48:23Z, so the claim that the gap is still open was falsified. |
| S36 | Serve configured bucket websites on `bucket.<RUSTFS_WEBSITE_DOMAINS>` hosts while leaving the S3 API host and path-style object routes unchanged | yes (1) | The record says `merged` true, merged 2026-09-28T10:48:22Z. Not run: RustFS has not been started on this machine, so serving is not shown yet. |
| S36 | Website serving is opt-in through `RUSTFS_WEBSITE_DOMAINS` | yes (1) | Not run, as above. |
| S36 | preserve the original Host through reverse proxies, and grant public `s3:GetObject` for pages that should be served | yes (1) | Not run, as above. |
| S37 | tag_name 1.0.1 published_at 2026-10-03T04:58:30Z (the release after the merge) | yes | These files show dates only: the merge is 2026-09-28 and release 1.0.1 is 2026-10-03. They do not show that release 1.0.1 contains the pull request; the run of task 6.10 must show it. |

## S38 and S39 Runtime interfaces for memory, garbage collection and the event loop (task 7.7 research)

Fetched 2026-11-04, each with status 200. S38 with `curl` as a page (method of S31 to S34), S39 from the GitHub API. Stored copies are in `evidence/sources/`.

| Id | URL | Stored copy | SHA-256 |
| - | - | - | - |
| S38 | https://bun.com/docs/runtime/nodejs-compat | `bun-nodejs-compat.html` | `90ed16bdbefacc2a4fa0c8dbd3f8d023ad5409d15961b98c1ff603eb686cab35` |
| S39 | https://api.github.com/repos/oven-sh/bun/releases?per_page=6 | `bun-releases.json` | `4945079297f8a14ac6fbce6e4ccc150310ab2a1fe3cf36f8cc12032d2243243a` |

| Id | Quoted passage | Found | Falsification attempt and result |
| - | - | - | - |
| S38 | Bun never emits gc, dns or resource entries | yes (1) | Run (`evidence/7.7-experiment-interfaces.txt`, Bun 1.3.10): a `PerformanceObserver` for `gc` saw 0 entries after `Bun.gc(true)` and an allocation burst. The page is confirmed. |
| S38 | eventLoopUtilization() always returns zeros | yes (1) | Run: `performance.eventLoopUtilization` from `node:perf_hooks` returned utilization 0 after a busy loop, and the global `performance.eventLoopUtilization` is not a function. Confirmed. |
| S38 | monitorEventLoopDelay(), createHistogram(), timerify() and PerformanceObserver | yes (1) | Run: `monitorEventLoopDelay` reported a maximum of 77 ms after an 80 ms busy loop, but a median of 0.000135 ms with a 10 ms resolution, so only the maximum is trusted until a load run compares the percentiles. |
| S38 | GCProfiler and startupSnapshot are implemented | yes (1) | Falsified for Bun 1.3.10, the version this project pins: `import { GCProfiler } from "node:v8"` failed with `Export named 'GCProfiler' not found` (`evidence/7.7-experiment-gcprofiler.txt`). The page may describe a newer Bun; it was not run on one. |
| S39 | tag_name bun-v1.4.4 published_at 2026-10-22T10:11:32Z | yes | The newest release in the file is 1.4.4; releases 1.4.0 to 1.4.4 are newer than the pinned 1.3.10 (1.3.14 is the last 1.3). Whether `GCProfiler` exists in 1.4.x was not run. |

## Repository facts (commands run in this work, 2026-11-03, from the repository root)

```
$ grep -n "Operations" packages/constants/src/aip.ts
114:  Operations = "operations",
181:  OperationsGet = "operations.get",
[exit 0]
$ grep -rn "registry.register(CapabilityId.Operations" apps/api/src/registry.ts
29:  await registry.register(CapabilityId.OperationsGet, async () => operationCapability(operations));
[exit 0]
$ grep -rn "ext-tasks" package.json apps/*/package.json packages/*/package.json testing/*/package.json
grep: testing/*/package.json: No such file or directory
[exit 2]
$ ls node_modules/.bun | grep ext-tasks
@modelcontextprotocol+ext-tasks@0.2.2+4f4b4084c8372722
[exit 0]
$ grep -rl "subscriptions/listen" node_modules/.bun/@modelcontextprotocol+core@2.4.0/node_modules/@modelcontextprotocol/core/dist | wc -l
8
[exit 0]
```

Reading: the API registers one operations capability, `operations.get`; AIP-151 requires the Operations service (S3: List, Get, Delete, Cancel, Wait), so four are missing. `@modelcontextprotocol/ext-tasks` is in `node_modules/.bun` but no package.json names it (the grep printed no match line; its exit 2 comes only from the missing `testing/*/package.json` glob). The strings `subscriptions/listen` appear in 8 files of the SDK core 2.4.0 dist; that shows the strings exist, not that the server answers the method; the check that it does is task 5.1.
## RustFS 1.0.4 product stack image, 2026-11-07

The official project workflow names `rustfs/rustfs` as its Docker Hub repository. The registry manifest for 1.0.4 was fetched with HTTP 200 and pinned by its content digest before execution. Image metadata reports version v1.0.4, the same source revision as the project-published release provenance statement, and user `rustfs`. This is source and digest inspection; no independent cryptographic verification of the release statement is claimed.

| Source | URL | Fetched UTC | HTTP | SHA-256 | Short passage | Falsification and observed output |
|---|---|---|---|---|---|---|
| Release README | https://raw.githubusercontent.com/rustfs/rustfs/1.0.4/README.md | 2026-11-07T11:11:15Z | 200 | af10e6431c914217c6e99a260f750ba844b59d592d06e1a9b029acc32455a3eb | UID/GID `10001:10001` | Image metadata inspected before execution; user is `rustfs`. The live stack wrote and read assets successfully using these owned data and log mounts. |
| Docker workflow | https://raw.githubusercontent.com/rustfs/rustfs/1.0.4/.github/workflows/docker.yml | 2026-11-07T11:11:15Z | 200 | 1cb0446ce0faa88583619419de29a62dcd71a7bdfb0ac58f206c09f48bfc32b6 | `REGISTRY_DOCKERHUB: rustfs/rustfs` | Registry manifest returned linux amd64 and arm64 image descriptors plus attestations. |
| Release Containerfile | https://raw.githubusercontent.com/rustfs/rustfs/1.0.4/Dockerfile | 2026-11-07T11:11:15Z | 200 | 2d253e9995f6f7d425b2667f185abb3dee1afc5aca18fb6382dcae6dc7b4a538 | `USER rustfs` | Image inspection reports user rustfs and release 1.0.4. |
| Release provenance | https://github.com/rustfs/rustfs/releases/download/1.0.4/rustfs-1.0.4.provenance.json | 2026-11-07T11:11:16Z | 200 | a4758b844204dfb73c8f1cefee685796723a96d52f5c276bd187b71f9fef4ed1 | `refs/tags/1.0.4` | Statement and image metadata both identify source commit 46337942d55f3a8e6a97b147ca98d9ea8115555d. Statement signatures were not verified. |
| Registry manifest | https://registry-1.docker.io/v2/rustfs/rustfs/manifests/1.0.4 | 2026-11-07T11:11:16Z | 200 | ed9210d6411d77ffceb70d94b964a3cb7d225983368bc25bebe01e995293dcc2 | `schemaVersion: 2` | Body SHA-256 equals Docker-Content-Digest. Pinned pull succeeded with image config 2755bcf766f77f221f39e056864948fb4d1862381831ed0b347226e4bc1a43a9. |

Stored copies are `evidence/sources/rustfs-1.0.4-*`. Signed/presigned requests, ranges and multipart are independent runtime falsification cases in `testing/e2e/stack/object-store.test.ts`; all 8 tests and 18 assertions passed in 208.87 seconds, including teardown, on 2026-11-07. This is the runtime falsification attempt for S17; see `evidence/4.9-object-store.md`.

| Source | URL | Fetched UTC | HTTP | SHA-256 | Short passage | Falsification and observed output |
|---|---|---|---|---|---|---|
| Pulumi RemoteImage | https://www.pulumi.com/registry/packages/docker/api-docs/remoteimage/ | 2026-11-07T11:22:14Z | 200 | b0a6e2ce4cf4150c18ad3b5cc36a1ae4945ba76530bad1b6ada632560b430002 | `keepLocally` | The initial destroy failed because the development stack still used Caddy. After retaining pulled images, the live suite and its asserted destroy passed. Stored copy: `evidence/sources/pulumi-remote-image.txt`. |

The stored Pulumi text omits scripts and markup that contained unrelated public analytics/search keys. The table retains the original HTTP response hash. The normalized text snapshot SHA-256 is `a435b9f93282379d6660d5f832b9c733fd0ac00537aa8a55f6f482c81f045784`.

## Static-site primary sources, 2026-11-07

Stored text snapshots omit scripts and markup. HTTP response hashes and normalized snapshot hashes are recorded separately.

| Source | URL | Fetched UTC | HTTP | Response SHA-256 | Text SHA-256 | Short passage | Falsification |
|---|---|---|---|---|---|---|---|
| caddy-reverse-proxy | https://caddyserver.com/docs/caddyfile/directives/reverse_proxy | 2026-11-07T11:38:20.157620+00:00 | 200 | 2fba8fad663d0ce183e6fbee3be6e8acffb668773d44267555cc879dbe8d17ce | 2fd699c89e93df94ae3659cdd8f660126be77f7c8a9a8527cd1060552269f228 | `handle_response` defines the route to execute when matched | Actual app publication and S3/website isolation are checked by `testing/e2e/stack/object-store.test.ts`; Final live run passed 12 cases and 28 assertions; S3 API operations, anonymous website reads, console fallback and documentation 404 coexist. |
| aws-put-bucket-website | https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketWebsite.html | 2026-11-07T11:38:20.747035+00:00 | 200 | 6f637c84bd31030b9f850b4db7673f7cef222b48f9c6bfe78e5696e40e1fa007 | 0632f6676363b230afb372c6cfc9e416b098c797293d57d4ea38cb6e9deaf929 | `PUT /?website HTTP/1.1` | Actual app publication and S3/website isolation are checked by `testing/e2e/stack/object-store.test.ts`; Final live run passed 12 cases and 28 assertions; S3 API operations, anonymous website reads, console fallback and documentation 404 coexist. |
| curl-manpage | https://curl.se/docs/manpage.html | 2026-11-07T11:38:20.963710+00:00 | 200 | 3d01dafc630b08f29d6a6871120308558a7c6c2359dc13289289b1cd5fe27199 | ff52be86ff33bb33bff1182730305d3c9a21dbc1d28f3509ceb710b8e363bdd9 | `--config <file>` | Actual app publication and S3/website isolation are checked by `testing/e2e/stack/object-store.test.ts`; Final live run passed 12 cases and 28 assertions; S3 API operations, anonymous website reads, console fallback and documentation 404 coexist. |

S35–S37 runtime falsification is now complete on the pinned 1.0.4 image: task 6.10 passed 12 cases and 28 assertions in 191.69 seconds. The first shared S3/website domain failed with 405; the separate sites domain preserves S3 and website behavior. Both built indexes were served exactly, writes without credentials were refused, console fallback returned 200, docs missing paths returned 404, and teardown succeeded. See `evidence/6.10-static-sites.md`.

The stored curl text is limited to the configuration/stdin and AWS V4 authentication passages. Unrelated example credentials are omitted; the HTTP response hash remains the original complete response hash.

## Asset runtime and test cleanup primary sources, 2026-11-07

| Source | URL | Fetched UTC | HTTP | SHA-256 | Short passage | Falsification and observed output |
|---|---|---|---|---|---|---|
| S40 | https://raw.githubusercontent.com/oven-sh/bun/bun-v1.3.10/docs/runtime/s3.mdx | 2026-11-07T13:21:21.346Z | 200 | 4e87d0024447e716473494f7242026be989cdc42d78732ee768196671fb86ecc | Bun automatically handles multipart uploads for large files | Live native API multipart, checksum cleanup, signed range reads and SDK round trip passed: 17 tests, 40 assertions, 205.35 seconds. |
| S41 | https://raw.githubusercontent.com/containers/common/v0.50.1/libnetwork/netavark/ipam.go | 2026-11-07T13:21:21.583Z | 200 | aa7a8b5a8a932b5ba90054e5ebe30c98f79013db82044ae4dfd4344ed0738e6a | Each network has their own bucket | Read-only inspection matched only the deleted test container to 10.91.2.10. After a backed-up, exact-key repair, that address ran the API image and the live stack passed. |

## S42 MCP Tasks implementation source, 2026-11-07

| Source | URL | Fetched UTC | HTTP | SHA-256 | Short passage | Falsification and observed output |
|---|---|---|---|---|---|---|
| S42 | https://raw.githubusercontent.com/modelcontextprotocol/ext-tasks/main/specification/2026-07-28/tasks.md | 2026-11-07T13:32:51.592Z | 200 | 5fc22b9b5ff248703927c69855f751a061c2d6170f4dc3923204452f859f91a5 | `type CreateTaskResult = Result & Task;` | Official ext-tasks 0.2.2 client rejected the initial nested task shape. Flattening the handle and tagging the completed inner result passed 13 integration cases, including polling, cancellation, ordinary progress and operations.wait task augmentation. The packaged proxy run passed in 173.58 seconds, including the official client and modern Inspector CLI. |

The exact fetched copy is `evidence/sources/mcp-tasks-2026-07-28.md`. Its schema and response examples use inline task fields; an inconsistent explanatory sentence mentions an embedded task. The official client codec independently rejects the nested form. SDK 2.4.0 permits application handlers for the three Tasks methods and preserves the task discriminator from registerTool callbacks; the callback also retains normal content and structuredContent for the SDK's base output validation.

## Fresh source review, 2026-11-07

The final table records fresh response bytes, separately from the historical cleaned captures above. Exact status and raw-byte digests are checked; no live hash is accepted automatically.

The historical latest-release labels describe the research date. Fresh feeds identify Pulumi v3.274.1, OpenTofu v1.13.9 and Docker provider v5.2.2. The trial used Pulumi v3.273.0 and OpenTofu v1.13.2; their pinned release endpoints remain the evidence for those downloads. No dependency upgrade is made by this review.

The MCP intro now returns Markdown without the old rendered version label. Its dated links still name 2026-07-28; the normative transport and extension records remain separate. Astro's two flags are separate passages, rather than one invented contiguous quotation.

Caddy's rendered page changes a hit counter on each request. The verifier instead fetches the pinned primary documentation source. Release feed asset download counts also change independently of release content. S37 and S39 therefore verify the version in the pinned release source tree, rather than asserting a current latest release or publication date. Historical feed timestamps above remain dated observations from their stored captures; they are not fresh release-date claims. Runtime compatibility is proved by the recorded test commands, not inferred from release ordering.

Each final record's falsification attempt searches every passage in a new response; a missing passage, altered byte or status is a failure. The stubbed negative cases independently alter each of those inputs and reject failed fetches. Runtime falsification attempts and their observed outputs remain in the task evidence above. A text match establishes that the publisher said something; it does not prove the publisher's claim. Runtime evidence makes that distinction explicit.

The fresh records for S18, S24 and S26 use the actual license texts, rather than mutable repository metadata. Earlier `archived` fields are historical observations only; current archive status is unverified and is not a delivery claim. S12, S35 and S36 use the published proposal patches for their content. Historical issue/PR state and merge timestamps are retained only as dated captures; their current state is unverified and is not inferred from a patch. Feature acceptance rests on the existing real-client and object-store tests. This avoids making an unsupported current-status assertion when anonymous GitHub API access is rate limited.

## Verified external sources

| Source | URL | Fetched UTC | HTTP | SHA-256 | Passage | Falsification and output |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | https://raw.githubusercontent.com/aip-dev/google.aip.dev/master/aip/general/0151.md | 2026-11-07T20:36:16.009380+00:00 | 200 | eb4293bad26eefebecf225e5c669ec9d8caa8268a472db08bbe1eaa767e05347 | The response must not be a streaming response. \| Individual APIs must not define their own interfaces for long-running operations to avoid non-uniformity. \| Errors that prevent a long-running operation from starting must return an error response \| Operations that fail during their execution phase must return an error response \| A good rule of thumb for operation expiry is 30 days. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 5/5 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S2 | https://raw.githubusercontent.com/aip-dev/google.aip.dev/master/aip/general/0158.md | 2026-11-07T20:36:16.001927+00:00 | 200 | 3275e7ac12a1f9f8b3f10e36edb47d942e83293ab5a27aa3aea3107f0f0e7b76 | The response must not be a streaming response. \| If the end of the collection has been reached, the next_page_token field must be empty. \| If the user specifies a negative value for page_size, the API must send an INVALID_ARGUMENT error. \| If the user does not specify page_size (or specifies 0), the API chooses an appropriate default \| If the user specifies page_size greater than the maximum permitted by the API, the API should coerce down to the maximum permitted page size. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 5/5 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S3 | https://raw.githubusercontent.com/googleapis/googleapis/master/google/longrunning/operations.proto | 2026-11-07T20:36:16.008587+00:00 | 200 | 5d2e7f9eeb55b8417b50e0a536a092babd32d26e4fbeb7099c6cdcda6e16db9c | rpc ListOperations \| rpc GetOperation \| rpc DeleteOperation \| rpc CancelOperation \| rpc WaitOperation | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 5/5 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S4 | https://modelcontextprotocol.io/specification/2026-07-28/changelog.md | 2026-11-07T20:36:16.168871+00:00 | 200 | 280533e289ca1a638973b06f6f4d8a8aff735a3c3fe594ffb32696d63de530f6 | Remove protocol-level sessions and the Mcp-Session-Id header \| Add server/discover \| Replace the HTTP GET endpoint and resources/subscribe/resources/unsubscribe with subscriptions/listen \| Move experimental tasks out of the core protocol and into an official extension (io.modelcontextprotocol/tasks) \| Remove SSE stream resumability and message redelivery (the Last-Event-ID header and SSE event IDs) \| Require standard MCP request headers (Mcp-Method, Mcp-Name) | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 6/6 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S5 | https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http.md | 2026-11-07T20:36:16.173770+00:00 | 200 | 94dfcaf09285c9d8398c9ee0277b440f6d3051b182266c46c9b4e55864665288 | The client MUST include an Accept header listing both application/json and text/event-stream as supported content types. \| the server MUST return either Content-Type: application/json (a single JSON object) or Content-Type: text/event-stream (an SSE response stream). The client MUST support both. \| Removal of the GET stream endpoint. \| Every POST request to the MCP endpoint MUST include an MCP-Protocol-Version header. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 4/4 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S6 | https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions.md | 2026-11-07T20:36:16.205292+00:00 | 200 | a3e81e777bbef20d1885c274095557059125c685697abde14bfad6db570fa1e7 | subscriptions/listen opens a long-lived notification stream from the server to the client. \| The server MUST NOT send notification types the client has not explicitly requested. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S7 | https://modelcontextprotocol.io/extensions/tasks/overview.md | 2026-11-07T20:36:16.157874+00:00 | 200 | af7048bc5af31f84754b1a0bd0392236088c621bd38d618fba443a122798c692 | MCP Tasks let servers return a durable handle instead of blocking \| io.modelcontextprotocol/tasks \| tasks/get \| tasks/update \| tasks/cancel | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 5/5 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S8 | https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/progress.md | 2026-11-07T20:36:16.163989+00:00 | 200 | 5178234f897db0a2b015012f15a9f8790b02900b66b962f1a2519395de74bdfa | The progress value MUST increase with each notification \| notifications/progress | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S9 | https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination.md | 2026-11-07T20:36:16.213814+00:00 | 200 | ac5c57603b3a56dd12196527ba1d3da78eba2db99a9c6f8326c8a24eaefbedd9 | Pagination in MCP uses an opaque cursor-based approach, instead of numbered pages. \| clients MUST NOT assume a fixed page size | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S10 | https://modelcontextprotocol.io/specification/2026-07-28/server/tools.md | 2026-11-07T20:36:16.211651+00:00 | 200 | ffd2f284b837a0e00b2cb0a366dfa76d90ff579b759dfdc91f9fcabb8e51e76b | resource_link \| Embedded Resources | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S11 | https://modelcontextprotocol.io/community/working-groups/file-uploads | 2026-11-07T20:36:16.487337+00:00 | 200 | da2655ff3a7163bec66c4d16d79556ae709fbeeee7abf921a0466e37f296350a | define how MCP tools and elicitation requests declare file inputs \| How a tool returns a file that is too large for a JSON-RPC message \| The WG may evaluate approaches such as streaming, chunked transfer, or presigned upload URLs \| SEP-2356: Declarative file inputs \| Add file downloads to scope as a secondary item | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 5/5 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S12 | https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2356.patch | 2026-11-07T20:46:24.857817+00:00 | 200 | f65504f296fd1a7c625088b655965a0a940317861a0f45eef0e372ecb16539bd | Files are transmitted \| base64 | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S13 | https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro | 2026-11-07T20:36:16.590123+00:00 | 200 | 17bf734c7cc2b4ce2385199657ef12dda5b0adae07c5aff1fb56499ae1b7d4f1 | 2026-07-28 | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S14 | https://modelcontextprotocol.io/extensions/skills/overview.md | 2026-11-08T05:46:50.570628+00:00 | 200 | 0d9e23e7f6b25790f15dfd6d57ca657bfd48eae3ed4f5d8e9986831d95d63721 | /2640-skills-extension.md) is Final. \| Clients can discover available skills, retrieve their metadata, and read their contents using the existing Resources primitive. \| Skill files are served through resources/read. \| Servers that declare this extension MUST implement skills/list and skills/get. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 4/4 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S15 | https://modelcontextprotocol.io/seps/2640-skills-extension.md | 2026-11-07T20:36:16.386914+00:00 | 200 | 72e16488444b887e90db1fc0530d882991ec4951cb1724fa59c7090c188ab14a | This SEP has reached Final status \| Servers SHOULD use the skill:// URI scheme \| skill://<skill-path>/<file-path> \| Each file within a skill directory is exposed as an MCP resource. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 4/4 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S16 | https://raw.githubusercontent.com/rustfs/rustfs/main/README.md | 2026-11-07T20:36:16.270726+00:00 | 200 | 86c3104b47e4ef7c2059a3684e2687d2a108c936249d5d2dc177f3598634ea2c | RustFS is a high-performance, distributed object storage system built in Rust \| RustFS is released under the permissible Apache 2.0 license \| instead of docker, you can install the RustFS with the below command \| The RustFS container runs as a non-root user rustfs (UID/GID 10001:10001) | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 4/4 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S17 | https://raw.githubusercontent.com/rustfs/rustfs/main/docs/architecture/s3-compatibility-matrix.md | 2026-11-07T20:36:16.284840+00:00 | 200 | e99d1206c667614e715c6fa4377f9edc406ae7650f0a684d17e201d3dab75dd4 | Presigned GET and PUT URLs \| Range and conditional reads \| Multipart upload create/upload/complete/abort \| It does not claim complete coverage of every standard or vendor-specific S3 behavior. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 4/4 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S18 | https://raw.githubusercontent.com/rustfs/rustfs/main/LICENSE | 2026-11-07T20:46:25.247990+00:00 | 200 | 8ef87773cd6df917c9cf75bdb3075d92b78ad4cdf8e51d6c98030292442524d8 | Apache License | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S19 | https://www.pulumi.com/docs/iac/concepts/testing/unit/ | 2026-11-08T05:46:50.588000+00:00 | 200 | 6b92a2d55533fbfb714da0feffc500267d84f229f11a23ea9614037f3a09f9e2 | Because mocks don’t do any real work, unit tests run fast. They’re also deterministic, since nothing about them depends on the behavior of an external system. \| Unit tests are supported in every general-purpose | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S20 | https://www.pulumi.com/docs/iac/concepts/state-and-backends/ | 2026-11-08T05:46:50.596792+00:00 | 200 | 2c1ca97bd15d8bdee8a141725ac36a5f4156a9848e4f3e253678b683191f51cc | or your local filesystem \| You can manage state yourself with a DIY backend | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S21 | https://www.pulumi.com/docs/iac/concepts/stacks/ | 2026-11-08T05:46:50.603209+00:00 | 200 | f552725d318900216698fa02dcc8e40091765638863a5be595f10d3ddfb55b3f | A stack is an isolated, independently configurable instance of a Pulumi program. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S22 | https://opentofu.org/docs/cli/commands/test/ | 2026-11-07T20:36:16.711171+00:00 | 200 | 8fec076d9512c18cade09ba30cb49e7a358475e59078fc38c1b7595fa99f4f79 | tofu test [options] \| *.tftest.hcl | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S23 | https://www.pulumi.com/registry/packages/docker/ | 2026-11-07T20:36:17.194955+00:00 | 200 | e9d8038dbc0cd2a7cee438011c05f45f64f6084478c846ec34163e3b0704cbdb | Docker Provider \| Docker v5.2.2 | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S24 | https://raw.githubusercontent.com/pulumi/pulumi/v3.273.0/LICENSE | 2026-11-07T20:46:25.758346+00:00 | 200 | 0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594 | Apache License | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S25 | https://raw.githubusercontent.com/pulumi/pulumi/v3.273.0/sdk/nodejs/package.json | 2026-11-07T20:36:16.827293+00:00 | 200 | c22cc5b373451d1e972b35214957a032f0a516e6dcafc9f1d6416614bde8d616 | "version": "3.273.0" | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S26 | https://raw.githubusercontent.com/opentofu/opentofu/v1.13.2/LICENSE | 2026-11-07T20:46:26.064966+00:00 | 200 | 142b957651baf401646dd7f3d855cb7c4f6f0921d645faa27e7cb540bc33cf4c | Mozilla Public License | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S27 | https://raw.githubusercontent.com/opentofu/opentofu/v1.13.2/version/VERSION | 2026-11-07T20:37:10.613053+00:00 | 200 | 810ab97f4b3fccb9adf1db7959945b479635931ccc4a0243c34a41b739eae25a | 1.13.2 | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S28 | https://raw.githubusercontent.com/pulumi/pulumi-docker/master/LICENSE | 2026-11-07T20:36:16.747222+00:00 | 200 | cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30 | Apache License \| Version 2.0, January 2004 | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S29 | https://podman.io/docs/installation | 2026-11-07T20:36:16.845261+00:00 | 200 | 5f28aba118bab497742985a353a3bfa75ce5863ea5e2af51d91c16e7be528304 | The podman package is available in the official repositories for Ubuntu 20.10 and newer \| sudo apt-get -y install podman | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S30 | https://spec.openapis.org/oas/v3.1.0.html | 2026-11-07T20:36:17.004011+00:00 | 200 | 156788f23f0e3be376b9635f70451535e4280c3227747dbdd1dd6a0e50f61f1b | If in is "header" and the name field is "Accept", "Content-Type" or "Authorization", the parameter definition SHALL be ignored \| The key is a media type or media type range | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S31 | https://vite.dev/config/server-options | 2026-11-07T20:36:17.118783+00:00 | 200 | a34625a0c76e39b2151a63c708070547c965df4aef9f460a2c940280acec995a | localhost and domains under.localhost and all IP addresses are allowed by default \| Set this to 0.0.0.0 or true to listen on all addresses, including LAN and public addresses \| File system watcher options to pass on to chokidar \| The WebSocket-related options ( protocol, host, port, path, clientPort, timeout, server ) are deprecated | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 4/4 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S32 | https://raw.githubusercontent.com/caddyserver/website/6b06285cb94fbd415df864dbd1ed12a984963582/src/docs/markdown/caddyfile/directives/reverse_proxy.md | 2026-11-07T20:36:16.960179+00:00 | 200 | 5a18aff58be22b0fae19995a8dabbb1393ecabf2e2fa4b194b5438f6106a88ed | The proxy also supports WebSocket connections, performing the HTTP upgrade request then transitioning the connection to a bidirectional tunnel | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S33 | https://docs.astro.build/en/reference/cli-reference/ | 2026-11-07T20:36:17.058696+00:00 | 200 | c596d147e4998ad7927c1fc9ef4fc60178e373ea5df84a2a21285e3c13eb0afb | --host [optional host address] \| --allowed-hosts | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S34 | https://docs.podman.io/en/latest/markdown/podman-run.1.html | 2026-11-07T20:36:17.103922+00:00 | 200 | 9a24002566287e3af6b347f882a378e849686b5d4e5b92fd7c6c0ce893d338c2 | keep-id $UID $UID (Map user account to same UID within container.) | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S35 | https://github.com/rustfs/rustfs/pull/8183.patch | 2026-11-07T20:46:26.993235+00:00 | 200 | 2e34ef2b55b4d11588e9360e463d84b6690d559597fe8ce477d334c591f12800 | RUSTFS_WEBSITE_DOMAINS | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S36 | https://github.com/rustfs/rustfs/pull/8183.patch | 2026-11-07T20:46:27.704544+00:00 | 200 | 2e34ef2b55b4d11588e9360e463d84b6690d559597fe8ce477d334c591f12800 | Website requests are anonymous. \| Grant `s3:GetObject` through the bucket policy | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S37 | https://raw.githubusercontent.com/rustfs/rustfs/1.0.1/Cargo.toml | 2026-11-07T20:36:17.048979+00:00 | 200 | f2e0ea9ece0f233b010d1203260cb749cc2e4bdd7cd55c855d2c7e62d5416b55 | version = "1.0.1" | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S38 | https://bun.com/docs/runtime/nodejs-compat | 2026-11-07T20:36:17.288066+00:00 | 200 | 0842789523e3cc9e8f8c7ec18e1329c75dc17ce8fcfef9e233978527a8e68ace | Bun never emits gc, dns or resource entries \| eventLoopUtilization() always returns zeros \| monitorEventLoopDelay(), createHistogram(), timerify() and PerformanceObserver \| GCProfiler and startupSnapshot are implemented | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 4/4 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S39 | https://raw.githubusercontent.com/oven-sh/bun/bun-v1.4.4/package.json | 2026-11-07T20:36:17.092513+00:00 | 200 | 68f7347c90102f4d394f9188fde96afc882cdb8871321d3ed13678002eaa3b35 | "version": "1.4.4" | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S40 | https://raw.githubusercontent.com/oven-sh/bun/bun-v1.3.10/docs/runtime/s3.mdx | 2026-11-07T20:36:17.127864+00:00 | 200 | 4e87d0024447e716473494f7242026be989cdc42d78732ee768196671fb86ecc | Bun automatically handles multipart uploads for large files | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S41 | https://raw.githubusercontent.com/containers/common/v0.50.1/libnetwork/netavark/ipam.go | 2026-11-07T20:36:17.141423+00:00 | 200 | aa7a8b5a8a932b5ba90054e5ebe30c98f79013db82044ae4dfd4344ed0738e6a | Each network has their own bucket | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S42 | https://raw.githubusercontent.com/modelcontextprotocol/ext-tasks/main/specification/2026-07-28/tasks.md | 2026-11-07T20:36:17.145578+00:00 | 200 | 5fc22b9b5ff248703927c69855f751a061c2d6170f4dc3923204452f859f91a5 | type CreateTaskResult = Result & Task; | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S43 | https://raw.githubusercontent.com/aip-dev/google.aip.dev/master/aip/general/0193.md | 2026-11-07T20:36:17.161303+00:00 | 200 | d76399f08a3a01256f75f567596e95f57eec9deb6f6f3b28333d80e8f012018a | google.rpc.Status | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S44 | https://raw.githubusercontent.com/containers/podman/v4.9.3/docs/source/markdown/podman-run.1.md.in | 2026-11-07T20:36:17.374069+00:00 | 200 | bc9ad37ca2677716ae7f9b8c1062e3a9d1921b8ecd71d92a2f5d07df2da37dbf | processes running in the container run as the user's UID | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S45 | https://raw.githubusercontent.com/nodejs/docker-node/main/README.md | 2026-11-07T20:36:17.395350+00:00 | 200 | beaa1d8fac6203da4032d91c9a02957d6083a86be8e05ed3a603c817638c082a | The official Node.js docker image | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S46 | https://raw.githubusercontent.com/rustfs/rustfs/1.0.4/README.md | 2026-11-07T20:36:17.511613+00:00 | 200 | af10e6431c914217c6e99a260f750ba844b59d592d06e1a9b029acc32455a3eb | 10001:10001 | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S47 | https://raw.githubusercontent.com/rustfs/rustfs/1.0.4/.github/workflows/docker.yml | 2026-11-07T20:36:17.434225+00:00 | 200 | 1cb0446ce0faa88583619419de29a62dcd71a7bdfb0ac58f206c09f48bfc32b6 | REGISTRY_DOCKERHUB: rustfs/rustfs | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S48 | https://raw.githubusercontent.com/rustfs/rustfs/1.0.4/Dockerfile | 2026-11-07T20:36:17.465859+00:00 | 200 | 2d253e9995f6f7d425b2667f185abb3dee1afc5aca18fb6382dcae6dc7b4a538 | USER rustfs | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S49 | https://github.com/rustfs/rustfs/releases/download/1.0.4/rustfs-1.0.4.provenance.json | 2026-11-07T20:36:17.826858+00:00 | 200 | a4758b844204dfb73c8f1cefee685796723a96d52f5c276bd187b71f9fef4ed1 | refs/tags/1.0.4 | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S50 | https://www.pulumi.com/registry/packages/docker/api-docs/remoteimage/ | 2026-11-07T20:36:18.375107+00:00 | 200 | a768508ae12bb8d4cc225475e1d96ff22d3364a37ec948e3850a3880018f14fb | keepLocally | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S51 | https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketWebsite.html | 2026-11-07T20:36:17.825092+00:00 | 200 | 6f637c84bd31030b9f850b4db7673f7cef222b48f9c6bfe78e5696e40e1fa007 | PUT /?website HTTP/1.1 | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S52 | https://curl.se/docs/manpage.html | 2026-11-07T20:36:18.086787+00:00 | 200 | 3d01dafc630b08f29d6a6871120308558a7c6c2359dc13289289b1cd5fe27199 | --config <file> | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S53 | https://nodejs.org/api/fs.html#watcherclose | 2026-11-07T20:36:17.771472+00:00 | 200 | 21b9178884e065bb15852cd5bf2db2f101a2ac499b6adb0f09efa3dfa6fb4bf3 | watcher.close() | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S54 | https://spec.openapis.org/oas/v3.1.1.html | 2026-11-07T20:36:18.215423+00:00 | 200 | 95a797a55918e5c9278148ecc7c4a4bd571329f51fbcb5de12672c131c873463 | If in is "header" and the name field is "Accept", "Content-Type" or "Authorization", the parameter definition SHALL be ignored. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S55 | https://registry-1.docker.io/v2/rustfs/rustfs/manifests/1.0.4 | 2026-11-07T20:37:11.219687+00:00 | 200 | ed9210d6411d77ffceb70d94b964a3cb7d225983368bc25bebe01e995293dcc2 | "schemaVersion": 2 | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S56 | https://dprint.dev/setup/ | 2026-11-08T06:06:21.060406+00:00 | 200 | 31deb936aa73caac8dcebe7db41146b2ed802c74103bdb47864e7865661454ba | If you would like to store the cache in a custom location, then specify a DPRINT_CACHE_DIR environment variable. \| DPRINT_MAX_THREADS | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
