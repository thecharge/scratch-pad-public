## ADDED Requirements

### Requirement: The Accept header is required and chooses the response form
The REST API SHALL answer a capability request as one JSON document when it accepts `application/json` and, for event capabilities only, as a Server-Sent Events stream when it accepts `text/event-stream`; files are answered with their own media type (see the files requirement). Every response SHALL be written to the connection through a stream, never buffered by the adapter, for all operations. Lists and operations stay AIP documents (see the AIP-158 and AIP-151 requirements). A request without an `Accept` header or with an unsupported one SHALL be refused before the capability runs.

#### Scenario: JSON document
- **WHEN** a caller gets a book with `Accept: application/json`
- **THEN** the response is one JSON document with the same content as before this change, written through a stream

#### Scenario: Missing Accept
- **WHEN** a request carries no `Accept` header
- **THEN** the response is 400 with an AIP-193 body whose reason is `ACCEPT_REQUIRED` and which names the header

#### Scenario: Unsupported Accept
- **WHEN** a request accepts only `text/html`
- **THEN** the response is 406 with an AIP-193 body whose reason is `ACCEPT_UNSUPPORTED`

#### Scenario: Streamed on HTTP/1.1
- **WHEN** a response whose producer works over time is sent over HTTP/1.1
- **THEN** it carries `Transfer-Encoding: chunked`, no `Content-Length`, and the first part arrives before the last part is produced; a response whose data the server already holds may be sent by the runtime with a length (verified in `evidence/4.1-wire-framing.md`)

### Requirement: Requests carry the headers they need
A request with a body SHALL carry a supported `Content-Type`, else it SHALL be refused before the capability runs with `CONTENT_TYPE_REQUIRED` (400) or `CONTENT_TYPE_UNSUPPORTED` (415), each with an AIP-193 body that names the header.

#### Scenario: Body without Content-Type
- **WHEN** a request sends a JSON body without `Content-Type`
- **THEN** the response is 400 with reason `CONTENT_TYPE_REQUIRED`

#### Scenario: Unsupported Content-Type
- **WHEN** a request sends a body with `Content-Type: text/plain`
- **THEN** the response is 415 with reason `CONTENT_TYPE_UNSUPPORTED`

### Requirement: Lists follow AIP-158
A list operation SHALL follow AIP-158 (https://google.aip.dev/158, source S2 in `sources.md`): `page_size` is optional, a missing or `0` value takes the documented default, a value above the maximum is coerced down to it, and a negative value is refused with `INVALID_ARGUMENT`; `page_token` is optional and the other arguments must match the call that produced it; the response carries one page of resources and `next_page_token`, which is empty only at the end of the collection. AIP-158 states "The response must not be a streaming response", so a list SHALL NOT be answered as a stream of elements: the page document is the unit, and the earlier idea of a newline-delimited list is withdrawn. The page document is still written to the connection through a stream (chunked on HTTP/1.1, framed on HTTP/2 and HTTP/3) without being buffered by the adapter; the user accepted this reading on 2026-11-03 on condition that it is tested and validated, so the tests SHALL prove it (see the scenarios below).

#### Scenario: Page and token
- **WHEN** a caller lists books with `page_size` 2 and there are three
- **THEN** the response holds two books and a non-empty `next_page_token`, and the next call with that token holds the third book and an empty `next_page_token`

#### Scenario: Written through a stream and still a valid page
- **WHEN** a list response is read over HTTP/1.1, HTTP/2 and HTTP/3
- **THEN** the assembled body validates as one AIP-158 page document (the resources and the token field), not as a stream of elements, and when the page is produced over time its first bytes arrive before the last are produced

#### Scenario: No list is a stream of elements
- **WHEN** the conformance check reads the OpenAPI document
- **THEN** no list operation declares `text/event-stream` or a newline-delimited media type as its response, and the check fails and names the operation if one does

#### Scenario: Negative page size
- **WHEN** a caller lists with `page_size` -1
- **THEN** the response is the AIP-193 error for `INVALID_ARGUMENT`

#### Scenario: Page size above the maximum
- **WHEN** a caller lists with a `page_size` above the maximum
- **THEN** the page holds at most the maximum

### Requirement: Long-running operations follow AIP-151
A method that takes a significant time (AIP-151 gives 10 seconds as a rule of thumb) SHALL return a `google.longrunning.Operation`-shaped resource instead of its final response (https://google.aip.dev/151, source S1). The API SHALL implement the Operations service with its five methods - list, get, delete, cancel and wait (https://github.com/googleapis/googleapis/blob/master/google/longrunning/operations.proto, source S3) - and SHALL NOT define its own interface for operations. An error that prevents the operation from starting SHALL be an AIP-193 error response; a failure during the run SHALL be in the operation's `error` field. AIP-151 states "The response must not be a streaming response", so the response to the starting call is the operation document. Verified gap (commands in `sources.md`): the repository has one operations capability, `operations.get`; list, delete, cancel and wait are missing. Progress SHALL be available through the operation's metadata on get and wait, and, as the user decided on 2026-11-03, through an event capability of operation progress (see the events requirement).

#### Scenario: Start
- **WHEN** a caller starts a reindex
- **THEN** the response is an operation with a name and `done` false, and an operation get returns its metadata

#### Scenario: Wait
- **WHEN** a caller waits on the operation
- **THEN** the call returns when the operation is done or the timeout passes, with the operation

#### Scenario: Cancel and delete
- **WHEN** a caller cancels a running operation and deletes a finished one
- **THEN** the first ends with the cancelled state and the second is no longer found

#### Scenario: List
- **WHEN** a caller lists operations
- **THEN** the page follows the pagination requirement

#### Scenario: Failure during the run
- **WHEN** the work fails
- **THEN** the operation is done and its `error` holds the AIP-193 error

#### Scenario: Written through a stream and still an Operation
- **WHEN** the starting call and the get call are read over HTTP/1.1, HTTP/2 and HTTP/3
- **THEN** the assembled body validates as one Operation document, and when it is produced over time its first bytes arrive before the last are produced

### Requirement: Request bodies are read as streams
The HTTP adapter SHALL read request bodies as streams. A chunked upload of a JSON document SHALL be accepted. An operation that takes a collection SHALL accept `Content-Type: application/x-ndjson` and validate each line against the same schema as a single element.

#### Scenario: Chunked JSON upload
- **WHEN** a caller sends a JSON document with `Transfer-Encoding: chunked`
- **THEN** the operation receives the whole document and answers as for a normal body

#### Scenario: Invalid line
- **WHEN** a newline-delimited request has a line that does not match the schema
- **THEN** the request fails with the AIP-193 invalid-argument error that names the line

### Requirement: Failures keep their meaning in a stream
A failure found before the capability runs (headers, authentication, authorization, routing, validation, rate limit) SHALL keep its HTTP status and its AIP-193 JSON body. A failure after a stream is open SHALL end the stream abnormally and the SDK SHALL map it to its typed error. A stream that ends before it is complete SHALL be reported as an incomplete response.

#### Scenario: No token
- **WHEN** a caller without a token calls a protected operation
- **THEN** the response is 401 with the AIP-193 body and no stream

#### Scenario: Failure during the run
- **WHEN** a capability fails after the stream opened
- **THEN** the stream ends abnormally and the SDK raises its typed error

#### Scenario: Stream ends early
- **WHEN** a stream ends before it is complete
- **THEN** the reader reports an incomplete response as an error

### Requirement: Events are a capability kind with three faces
An event capability SHALL be defined once and SHALL be served as an HTTP endpoint with `text/event-stream` and keep-alive, as an MCP capability and as an MCP tool; it SHALL appear in OpenAPI, the SDK (an async iterable), the skills and the generated documentation. The first event capabilities SHALL be the administrator event stream (existing) and the progress of an operation (the user's choice, 2026-11-03). The MCP face SHALL follow the MCP specification 2026-07-28 (https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions, source S6): the client opens `subscriptions/listen` with a `notifications` filter, the server acknowledges first with `notifications/subscriptions/acknowledged`, and sends only the types the client asked for. That revision replaced `resources/subscribe` and the GET endpoint with `subscriptions/listen` and removed `Last-Event-ID` resumability from MCP (https://modelcontextprotocol.io/specification/2026-07-28/changelog, source S4), so a broken MCP stream is re-opened by the client; resume by `Last-Event-ID` is therefore a feature of this API's own HTTP endpoint only, and is not claimed for MCP. The MCP tool is a bounded read of the same events.

#### Scenario: Event over HTTP
- **WHEN** a caller with the scope accepts `text/event-stream` on an event endpoint
- **THEN** events arrive as they happen, a keep-alive keeps the connection, and a reconnect with `Last-Event-ID` resumes after the last event received

#### Scenario: Event over MCP
- **WHEN** an MCP client sends `subscriptions/listen` for the event capability
- **THEN** the first message is the acknowledgment with the subset the server honours, and later messages are only the requested types

#### Scenario: Operation progress
- **WHEN** a caller subscribes to the progress of a running operation over HTTP and over MCP
- **THEN** progress events arrive while it runs and the stream ends when the operation is done, and the final state equals what get returns

#### Scenario: Event as an MCP tool
- **WHEN** an MCP client calls the tool for the event capability
- **THEN** it receives the events available within the bounds of the call, from the same definition

#### Scenario: Not an event capability
- **WHEN** a request for a non-event operation accepts only `text/event-stream`
- **THEN** the response is 406 with reason `ACCEPT_UNSUPPORTED`

### Requirement: Files are streamed in both directions
Upload and download of media over the HTTP API SHALL be streams: no file is held whole in memory, download SHALL support `Range` (206) and `Accept-Ranges`, upload SHALL enforce the size limit and the media-type allow-list from the configuration package and SHALL verify a declared checksum, and a partial upload SHALL be removed. Media capabilities SHALL be described in OpenAPI, exposed by the SDK as `ReadableStream` in and out, and documented by the end-to-end suites.

#### Scenario: Ranged download
- **WHEN** a caller downloads part of a file with `Range`
- **THEN** the response is 206 with that part and its `Content-Range`

#### Scenario: Upload over the limit
- **WHEN** an upload exceeds the size limit
- **THEN** it is refused with an AIP-193 error and nothing is stored

#### Scenario: Checksum mismatch
- **WHEN** an upload's declared checksum does not match its content
- **THEN** it is refused and the partial file is removed

#### Scenario: Large file memory
- **WHEN** a file larger than the process memory budget is uploaded and downloaded
- **THEN** both succeed and the measured memory stays below the budget

### Requirement: Assets live in the object store and are downloaded through the proxy at a dedicated URL
An asset SHALL be stored in a RustFS object store (https://github.com/rustfs/rustfs, sources S16, S17, S18 in `sources.md`: Apache-2.0, S3-compatible, documented for Podman, with multipart upload, presigned GET and PUT URLs and range reads listed as supported by its own documentation) that runs in the stack on the backend network, and SHALL be downloaded by its bytes through Caddy at a dedicated URL, not through the API process. This is the user's stated preference (2026-11-03); a protected download endpoint of the API is the alternative the user named and is not built unless the user asks. The MCP face SHALL follow the shape of the Skills extension (https://modelcontextprotocol.io/extensions/skills/overview, source S14; https://modelcontextprotocol.io/seps/2640-skills-extension, source S15, where each file is a resource under a URI scheme, `skill://<skill-path>/<file-path>`, listed with pagination and read with `resources/read`): an asset SHALL be a resource under an asset URI scheme, listed with `resources/list`, whose read gives its metadata and a `resource_link` to the dedicated download URL (https://modelcontextprotocol.io/specification/2026-07-28/server/tools, source S10), and the bytes SHALL be streamed from that URL. Upload SHALL stream through the API into the object store by S3 multipart upload without holding the file in memory. The claims about RustFS rest on its own documentation and SHALL be proven by runs in the stack before they are relied on. Decided by the user on 2026-11-03: the scheme is `asset://`; the dedicated URL is a path on the proxy; a download is authorized by a token that the proxy checks before it forwards the request, so no byte leaves the object store for a request without a valid token; the maximum size of an asset is 20 MB, a value in `packages/config` stored in bytes, where this change reads MB as 10^6 bytes (20,000,000), the user having given "20MB" without a unit definition. The mechanism of the token check at Caddy is deferred by the user (2026-11-03) to a later, separate change that will fix authentication and authorization in general and be run through OpenSpec; this change does not research, choose or build it, and the user asked that it not be delineated here.

#### Scenario: Download through the proxy
- **WHEN** a caller follows the download URL of an asset through Caddy
- **THEN** the bytes are streamed from the object store, a `Range` request gets 206, and the API process does not carry the bytes

#### Scenario: Asset as an MCP resource
- **WHEN** an MCP client lists resources and reads an asset
- **THEN** the asset appears under the asset URI scheme and its read gives the metadata and a `resource_link` to the download URL

#### Scenario: Over the size limit
- **WHEN** an upload of 20 MB plus one byte is sent
- **THEN** it is refused and nothing is stored

#### Scenario: Upload to the object store
- **WHEN** a caller uploads a file larger than the memory budget
- **THEN** it is stored by multipart upload, the checksum is verified, and a failed upload leaves no partial object

#### Scenario: Object store claims
- **WHEN** the stack test runs
- **THEN** presigned GET and PUT, range reads and multipart upload are exercised against the running RustFS through the proxy and the results are in the generated pages

### Requirement: The MCP endpoint follows the MCP transport
The MCP endpoint SHALL follow the Streamable HTTP transport of revision 2026-07-28 (https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http, source S5): clients send POST with an `Accept` header listing both `application/json` and `text/event-stream`; the server answers either one JSON object or an SSE stream and the client supports both; every POST carries `MCP-Protocol-Version`, `Mcp-Method` and `Mcp-Name`; there is no GET stream endpoint and no protocol-level session (changelog, source S4). The rules of this change for `Accept` (`ACCEPT_REQUIRED`, `ACCEPT_UNSUPPORTED`) apply to the REST API, not to the MCP endpoint, whose errors are the ones the MCP specification defines. The endpoint answers with an SSE stream (`responseMode: "sse"`), a choice this specification permits, and long operations SHALL report through `notifications/progress` (https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/progress, source S8) when the request carries a `progressToken`, and through the Tasks extension `io.modelcontextprotocol/tasks` (https://modelcontextprotocol.io/extensions/tasks/overview, source S7) for operations that outlive the request: the task handle maps to the AIP-151 operation, `tasks/get` to get, `tasks/cancel` to cancel. Verified on 2026-11-03 (`evidence/5.1-sdk-probe.md`): the installed SDK `@modelcontextprotocol/server` 2.4.0 answers `server/discover` and `subscriptions/listen` (acknowledgment first, then the event) but does not serve the Tasks extension (`tasks/get` answers `Method not found`, and a tool call from a client that declares the extension is answered inline), so the server side of `io.modelcontextprotocol/tasks` is written in this repository. List operations over MCP follow the MCP cursor pagination (https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination, source S9), mapped to `page_token` and `next_page_token`.

#### Scenario: Tool call
- **WHEN** a client calls a tool with the required headers
- **THEN** the HTTP response has the media type `text/event-stream` and carries the tool result

#### Scenario: Missing protocol header
- **WHEN** a POST lacks `MCP-Protocol-Version`
- **THEN** the endpoint answers as the MCP specification requires for that case

#### Scenario: Long tool with progress
- **WHEN** a client calls the reindex tool with a `progressToken`
- **THEN** progress notifications with increasing `progress` arrive before the result

#### Scenario: Long tool as a task
- **WHEN** a client that declared the tasks extension calls the reindex tool
- **THEN** the server returns a task handle, `tasks/get` reports its status, and `tasks/cancel` cancels it

### Requirement: The infrastructure is code in the monorepo
The repository SHALL hold the infrastructure of the test and run stack in `infra/`, run as a Pulumi program against rootless Podman: a Containerfile for the API, the reverse proxy container with its configuration, a curl container with HTTP/3, and a runner container. Every image SHALL be pinned by digest, any image built in the repository SHALL take its sources from release archives with pinned checksums, and no image SHALL be run before it is pinned. A `stack` check SHALL run the mock unit tests of the program, validate the rendered proxy configuration with the proxy itself and check the pins, and SHALL report a missing Podman with the install command.

#### Scenario: Unpinned image
- **WHEN** an image reference in `infra/` has no digest
- **THEN** the stack check fails and names the reference

#### Scenario: Invalid proxy configuration
- **WHEN** the Caddy configuration is invalid
- **THEN** the stack check fails with Caddy's message

#### Scenario: Stack up and down
- **WHEN** `bun run stack:up` and `bun run stack:down` run
- **THEN** the proxy answers on port 8443 over HTTP/1.1, HTTP/2 and HTTP/3 and every container is removed afterwards

#### Scenario: Podman missing
- **WHEN** Podman is not installed
- **THEN** the check reports it and prints how to install it

### Requirement: The infrastructure is an application and local development runs in local containers
The infrastructure SHALL be an application of the monorepo, `apps/infra`, like `apps/api`, `apps/console` and `apps/docs`: one place that holds the Pulumi program, the plan of each environment, the proxy configuration, the Containerfiles, the stack commands (up, down, check, status, logs, reset, tools) and its own README with a map of the files; the shared constants, schemas and environment values stay in the repository's shared packages as the standards require. The root scripts `stack:*` and `dev` SHALL only call that application. Local development SHALL happen in local containers: one command starts the proxy, the API, the console and the documentation site as containers with the source mounted and each service in watch or development mode, so that a change to a file on the machine shows in the running service without a rebuild; no service of the product runs on the host except the command itself. The services SHALL be reached through the proxy at stable addresses, the data SHALL live in volumes that a reset command removes, and the logs of each service SHALL be readable with one command. The layout, the addresses and the way the development servers work behind the proxy SHALL be chosen by recorded research in `sources.md`.

#### Scenario: One place
- **WHEN** a developer looks for anything that creates or describes the stack
- **THEN** it is in `apps/infra` or in the shared packages named in its README, and the root scripts hold no logic

#### Scenario: Develop in containers
- **WHEN** the developer runs `bun run dev` and then edits a file of the API, the console or the documentation site
- **THEN** the running container serves the change without a rebuild, and the service is reached through the proxy

#### Scenario: Reset
- **WHEN** the developer runs the reset command
- **THEN** the containers and the data volumes of the development stack are gone and the next start begins clean

### Requirement: Infrastructure follows the repository's standards and one stack serves every environment
The infrastructure SHALL be strictly typed and per environment (development, production and others), built from reusable packages, and its code and its state SHALL be tested. The tool SHALL be chosen by recorded research of open source TypeScript tools such as Pulumi (tests and state of the infrastructure expected); if none covers the requirements, custom packages SHALL drive OpenTofu and Ansible and make the infrastructure an application of the monorepo. The infrastructure SHALL be a Pulumi program fed by an environment description in `packages/config` that is parsed against a Zod schema; Containerfiles and the proxy configuration SHALL carry no comments and SHALL hold no address, port or host literal outside the environment description. The scripts that manage the stack SHALL be asynchronous, SHALL have 2 positive and 2 negative cases per unit and 100% line and function coverage, and the infrastructure checks SHALL be blocking in the hooks, `verify` and CI. Development, tests and production SHALL use the same Containerfiles, the same images and the same proxy topology, differing only by environment configuration.

#### Scenario: Research recorded
- **WHEN** the infrastructure tool is chosen
- **THEN** the change holds the research with its sources, the requirement-by-requirement comparison and the decision

#### Scenario: State test per environment
- **WHEN** the tests run for each environment
- **THEN** the planned state of the environment is compared to its expected state and a difference fails the test

#### Scenario: Plan differs from the expected state
- **WHEN** the program plans a resource that the expected state of an environment does not list
- **THEN** the mock unit test of that environment fails and names the resource

#### Scenario: Comment in an infrastructure file
- **WHEN** a Containerfile or the proxy configuration holds a comment
- **THEN** the comments check fails and names the file

#### Scenario: Literal in an infrastructure file
- **WHEN** an infrastructure file holds an address or port that is not taken from the environment description
- **THEN** the literals check fails

#### Scenario: Development profile
- **WHEN** `bun run dev` runs
- **THEN** it starts the same images and topology as the test and production profiles, with only the development configuration added

#### Scenario: Production profile
- **WHEN** the production profile is rendered
- **THEN** it contains no test service and no source mount

### Requirement: The API is reachable only through the proxy
The API container SHALL publish no port and SHALL sit on a network that the runner container and the curl container are not on, and SHALL refuse a request without the proxy's marker.

#### Scenario: Runner cannot reach the API
- **WHEN** the runner container tries to open a connection to the API service
- **THEN** the connection fails

### Requirement: Caddy is the only entrance and serves HTTP/1.1, HTTP/2 and HTTP/3
Every request to the API and the MCP endpoint SHALL pass through Caddy, which SHALL terminate HTTP/1.1, HTTP/2 and HTTP/3 and forward to the API without buffering. The API SHALL refuse a request that lacks the proxy's marker with `PROXY_REQUIRED`. Caddy SHALL run as a container pinned by digest, and its configuration SHALL be in the repository.

#### Scenario: Through the proxy over each version
- **WHEN** a stream is requested through Caddy over HTTP/1.1, HTTP/2 and HTTP/3
- **THEN** each response reports its negotiated protocol and its events arrive in order and before the last one is produced

#### Scenario: Direct connection
- **WHEN** a request reaches the API port without the proxy's marker
- **THEN** the response is refused with reason `PROXY_REQUIRED` and an AIP-193 body

#### Scenario: Streaming not buffered
- **WHEN** a long-running operation sends progress through the proxy
- **THEN** the client receives the first progress event before the operation finishes

### Requirement: The proxy is performant
The repository SHALL measure the proxy against a direct connection to the API on the same machine: requests per second, latency percentiles and time to the first event of a stream. The numbers SHALL be saved as evidence and reported; a limit set by the user SHALL fail the check when exceeded.

#### Scenario: Measurement
- **WHEN** the benchmark runs
- **THEN** the report contains throughput, p50, p95 and p99 latency and time to the first event for both paths

### Requirement: The API is observable for latency, memory, garbage collection and load
The API process SHALL measure itself and expose the measurements as metrics that tests and operators read: request latency per operation, form and HTTP version as histograms (so percentiles can be computed), time to the first byte, bytes sent and received, requests in flight, process memory (resident set size, heap used and total, external and array buffers), garbage collection (number and duration of collections, by kind where the runtime says it), event loop delay and utilization, open streams and open subscriptions, and operations running. The metrics SHALL be served to administrators in a standard exposition format and as a capability with the same faces as any capability (HTTP, MCP tool and resource, OpenAPI, documentation). The set of metrics, their names and units SHALL be chosen by recorded research (task 7.7), with every claim about a runtime interface backed by a fetched URL in `sources.md`.

#### Scenario: Latency is measured per operation
- **WHEN** an operation is called over each HTTP version
- **THEN** the metrics hold a latency observation labelled with the operation, the form and the version, and a percentile can be computed from the histogram

#### Scenario: Memory and collection are visible
- **WHEN** the API has served load
- **THEN** the metrics report the resident set size, the heap, the number and total duration of garbage collections, and the event loop delay

#### Scenario: The tests measure with the metrics
- **WHEN** an integration, end-to-end or benchmark run finishes
- **THEN** the run has read the metrics of the API it exercised, the report shows them per operation, form and HTTP version, and `verify` fails when a measured value exceeds the budget set for it or when a metric the run expects is missing

#### Scenario: The round trip is explored with the metrics
- **WHEN** the metrics are in place and the exploration runs
- **THEN** the evidence shows, per operation kind and HTTP version, the time of each leg of the round trip next to a baseline that does no work, and either names every cost that does not belong or records that none was found

#### Scenario: Metrics need the administrator scope
- **WHEN** a caller without the administrator scope reads the metrics
- **THEN** the response is refused with an AIP-193 body

### Requirement: Every test uses the proxy
Every integration test and end-to-end test SHALL run inside the stack, in the runner container, and every test of the list that follows - integration test, end-to-end test, the end-to-end API tests that produce the documentation, the SDK suites, the console UI scenarios, the real-client suite, the Inspector CLI tests, the scripted harness acceptance test SHALL send its requests through Caddy and know only its origin. Automated tests SHALL use deterministic stubs for model behavior, SHALL NOT launch any model client or request model inference, and SHALL NOT read provider credentials or incur model token usage.

#### Scenario: Test stack
- **WHEN** an integration or end-to-end suite runs
- **THEN** it runs in the runner container, Caddy and the API start with it, and the suite receives only the proxy origin

#### Scenario: Protocol assertion
- **WHEN** a test asserts the negotiated protocol
- **THEN** it uses the curl container with `--http1.1`, `--http2` or `--http3-only` against the proxy and reads the protocol that curl reports

#### Scenario: Address outside the configuration
- **WHEN** a test or product file holds the address of the API port
- **THEN** the `url-literals` check fails

### Requirement: The OpenAPI document describes the forms and the headers
The generated OpenAPI document SHALL describe `application/json` and `text/event-stream` responses with their schemas, the Operations service and the AIP-158 list parameters, the required `Accept` and `Content-Type` headers, and the streamed request bodies, and the baseline SHALL be updated on purpose.

#### Scenario: Drift
- **WHEN** an operation answers a form or requires a header that the document does not describe
- **THEN** the openapi or sdk check fails

### Requirement: The SDK and the console consume the streams
The generated SDK SHALL send the required headers, consume streamed JSON documents, event streams and media, resolve typed results for single-resource calls and AIP-158 list pages, expose event capabilities as async iterables, and map AIP-193 failures and incomplete event streams to typed errors. Long-running calls SHALL return an Operation whose run failures appear in its `error` field. The SDK SHALL NOT fail its drift check, pack check or suites. The console data provider SHALL read the streams and give the console the same values as before.

#### Scenario: SDK single call
- **WHEN** a consumer awaits a get call
- **THEN** it receives the typed book

#### Scenario: SDK list
- **WHEN** a consumer awaits a list call
- **THEN** it receives one typed page with its items and next page token

### Requirement: The end-to-end API tests and the end-to-end SDK tests are self-documenting
The end-to-end API suite (`testing/e2e/api`) and the end-to-end SDK suite (`testing/e2e/sdk`) SHALL each cover every response form, every HTTP version, every required header and its refusal, request streaming, the long-running operation and a failure during the run, SHALL send every request through Caddy, and SHALL each produce the documentation of what they cover: the API suite the API pages, the SDK suite the SDK pages.

#### Scenario: API suite
- **WHEN** the end-to-end API suite runs
- **THEN** it passes through the proxy and writes the API pages with one documented step per request, showing its headers, the negotiated protocol and the events

#### Scenario: SDK suite
- **WHEN** the end-to-end SDK suite runs
- **THEN** it passes through the proxy and writes the SDK pages with one documented step per call, showing the headers the SDK sent, the typed result or typed error, and the events read

### Requirement: The end-to-end tests produce the documentation of every behavior
The end-to-end tests (API, SDK, MCP, console UI and recorder suites) SHALL cover every form, every HTTP version, every required header and its refusal, request streaming, the long-running operation, the MCP stream, the SDK and the console, and SHALL produce the documentation: each step of each scenario is a documented step with a pass or fail flag, a description, its request headers, the negotiated protocol, the events or lines received in order and what it checked. The user-approved client display MAY use labelled placeholders for changing measurements and representative progress examples, including repeated successful working-task polls. Complete inputs with every actual event, measurement and assertion SHALL remain in internal recordings before display transformation. Terminal results, errors, malformed records, other methods and failed checks SHALL remain unsampled. A failing scenario SHALL publish nothing, and a second run SHALL leave the pages identical. No behavior page is written by hand.

#### Scenario: Passing run
- **WHEN** every end-to-end scenario passes
- **THEN** the pages are written and show the headers, the protocol and the events

#### Scenario: Representative examples retain complete evidence
- **WHEN** independent successful captures contain different measurements, progress samples or repeated working-task polls
- **THEN** labelled client examples remain identical while internal recordings retain every actual event, measurement and assertion

#### Scenario: Failing run
- **WHEN** one scenario fails
- **THEN** nothing is written

#### Scenario: Every refusal is shown
- **WHEN** the error-cases check runs
- **THEN** each new error reason appears in a generated page

### Requirement: Tests leave the repository clean
A run of the tiers or the hooks SHALL leave no untracked file in the repository, and a check SHALL fail when it does.

#### Scenario: Stray file
- **WHEN** a test run leaves an untracked file
- **THEN** the check fails and names the file

### Requirement: GitHub workflows are disabled
The repository SHALL contain no active GitHub workflow, and verification SHALL run locally through the hooks and `verify`.

#### Scenario: Workflow present
- **WHEN** a file exists under `.github/workflows`
- **THEN** the workflows check fails and names the file

### Requirement: The tests report latency, usage and performance
Every integration and end-to-end run SHALL record, per operation, response form and HTTP version, latency (p50, p95, p99), the time to the first byte or element, throughput, bytes, and the memory and CPU of each container, SHALL save the report as evidence and SHALL show it in generated internal repository documents under `docs/`. Performance, protocol verification and browser test reports and their screenshots SHALL NOT be published on the client documentation site. Client API, MCP, SDK and administrator UI guides SHALL remain on that site. A limit set by the user SHALL fail the run when exceeded.

#### Scenario: Report produced
- **WHEN** an end-to-end run passes
- **THEN** the report holds the figures for every operation, form and version, and the generated internal documents show them

#### Scenario: Failing run
- **WHEN** a scenario fails
- **THEN** no report is published

### Requirement: Every main spec states its purpose
Each main spec SHALL state its purpose in plain language, and the archive of a change SHALL leave no `TBD` purpose.

#### Scenario: Placeholder purpose
- **WHEN** a main spec holds `TBD` in its purpose
- **THEN** the check fails and names the spec

### Requirement: Every claim from the internet is sourced, verified and falsifiable
Every statement in the specs, the design, the tasks, the evidence and the generated pages that rests on a resource outside the repository (a tool, a library, a protocol, a version, a license, a behavior) SHALL cite the resource by its URL, and the URL SHALL have been fetched in this work with the result recorded: the date, the HTTP status, the SHA-256 of the fetched content, and the quoted passage that supports the statement. Each statement SHALL also carry a falsification attempt: what would show it false and the command, test or second source that was run to try to show it, with its output. A statement without a fetched URL and a recorded attempt SHALL NOT be written as fact; it SHALL be marked as unverified. The record SHALL be kept per file and per task: every file of the change that makes such a statement ends with a sources table, and every task that rests on such a statement lists its sources and attempts in its evidence file. A research task is not done until each of its sources has a record, and a tool is not chosen on an unverified statement.

#### Scenario: Verified source
- **WHEN** a statement names a tool's capability
- **THEN** the sources table holds the URL, the fetch date, the status, the content hash, the quoted passage and the falsification attempt with its output

#### Scenario: Unreachable or changed source
- **WHEN** a recorded URL does not return the recorded status or hash on re-fetch
- **THEN** the sources check fails and names the file, the task and the URL

#### Scenario: Statement without a source
- **WHEN** a file of the change states an external fact with no entry in its sources table
- **THEN** the sources check fails and names the file

#### Scenario: Research task
- **WHEN** the infrastructure research is marked done
- **THEN** every candidate tool has verified sources per requirement, a recorded attempt to disprove each claim, and the comparison cites only those records

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
| S32 | https://raw.githubusercontent.com/caddyserver/website/6b06285cb94fbd415df864dbd1ed12a984963582/src/docs/markdown/caddyfile/directives/reverse_proxy.md | 2026-11-07T20:36:16.960179+00:00 | 200 | 5a18aff58be22b0fae19995a8dabbb1393ecabf2e2fa4b194b5438f6106a88ed | The proxy also supports WebSocket connections, performing the HTTP upgrade request then transitioning the connection to a bidirectional tunnel | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S34 | https://docs.podman.io/en/latest/markdown/podman-run.1.html | 2026-11-07T20:36:17.103922+00:00 | 200 | 9a24002566287e3af6b347f882a378e849686b5d4e5b92fd7c6c0ce893d338c2 | keep-id $UID $UID (Map user account to same UID within container.) | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S35 | https://github.com/rustfs/rustfs/pull/8183.patch | 2026-11-07T20:46:26.993235+00:00 | 200 | 2e34ef2b55b4d11588e9360e463d84b6690d559597fe8ce477d334c591f12800 | RUSTFS_WEBSITE_DOMAINS | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S36 | https://github.com/rustfs/rustfs/pull/8183.patch | 2026-11-07T20:46:27.704544+00:00 | 200 | 2e34ef2b55b4d11588e9360e463d84b6690d559597fe8ce477d334c591f12800 | Website requests are anonymous. \| Grant `s3:GetObject` through the bucket policy | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 2/2 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S37 | https://raw.githubusercontent.com/rustfs/rustfs/1.0.1/Cargo.toml | 2026-11-07T20:36:17.048979+00:00 | 200 | f2e0ea9ece0f233b010d1203260cb749cc2e4bdd7cd55c855d2c7e62d5416b55 | version = "1.0.1" | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S38 | https://bun.com/docs/runtime/nodejs-compat | 2026-11-07T20:36:17.288066+00:00 | 200 | 0842789523e3cc9e8f8c7ec18e1329c75dc17ce8fcfef9e233978527a8e68ace | Bun never emits gc, dns or resource entries \| eventLoopUtilization() always returns zeros \| monitorEventLoopDelay(), createHistogram(), timerify() and PerformanceObserver \| GCProfiler and startupSnapshot are implemented | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 4/4 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S39 | https://raw.githubusercontent.com/oven-sh/bun/bun-v1.4.4/package.json | 2026-11-07T20:36:17.092513+00:00 | 200 | 68f7347c90102f4d394f9188fde96afc882cdb8871321d3ed13678002eaa3b35 | "version": "1.4.4" | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S41 | https://raw.githubusercontent.com/containers/common/v0.50.1/libnetwork/netavark/ipam.go | 2026-11-07T20:36:17.141423+00:00 | 200 | aa7a8b5a8a932b5ba90054e5ebe30c98f79013db82044ae4dfd4344ed0738e6a | Each network has their own bucket | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S42 | https://raw.githubusercontent.com/modelcontextprotocol/ext-tasks/main/specification/2026-07-28/tasks.md | 2026-11-07T20:36:17.145578+00:00 | 200 | 5fc22b9b5ff248703927c69855f751a061c2d6170f4dc3923204452f859f91a5 | type CreateTaskResult = Result & Task; | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S43 | https://raw.githubusercontent.com/aip-dev/google.aip.dev/master/aip/general/0193.md | 2026-11-07T20:36:17.161303+00:00 | 200 | d76399f08a3a01256f75f567596e95f57eec9deb6f6f3b28333d80e8f012018a | google.rpc.Status | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
