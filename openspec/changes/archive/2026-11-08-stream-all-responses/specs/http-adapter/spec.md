## MODIFIED Requirements

### Requirement: Error mapping
The adapter SHALL map pipeline errors to the AIP-193 JSON error body with the matching HTTP status before a capability starts. A failure during a long-running operation SHALL appear in its Operation error field; a failure inside an open event stream SHALL end that stream.

#### Scenario: Denied request
- **WHEN** policy denies the principal
- **THEN** the response status is 403 with `status` `PERMISSION_DENIED`

## ADDED Requirements

### Requirement: Required headers and streamed bodies

The adapter SHALL require supported Accept headers, supported Content-Type headers for bodies and the configured proxy marker. It SHALL reject missing or unsupported headers before invoking a capability, naming the header in an AIP-193 error. It SHALL read request bodies as streams and write JSON documents through streams; text/event-stream SHALL be reserved for event capabilities.

#### Scenario: Missing Accept

- **WHEN** a request omits Accept
- **THEN** it fails before execution with an AIP-193 error naming Accept

#### Scenario: Streamed JSON

- **WHEN** a caller requests application/json
- **THEN** the response is one JSON document written through a stream

## Verified external sources

| Source | URL | Fetched UTC | HTTP | SHA-256 | Passage | Falsification and output |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | https://raw.githubusercontent.com/aip-dev/google.aip.dev/master/aip/general/0151.md | 2026-11-07T20:36:16.009380+00:00 | 200 | eb4293bad26eefebecf225e5c669ec9d8caa8268a472db08bbe1eaa767e05347 | The response must not be a streaming response. \| Individual APIs must not define their own interfaces for long-running operations to avoid non-uniformity. \| Errors that prevent a long-running operation from starting must return an error response \| Operations that fail during their execution phase must return an error response \| A good rule of thumb for operation expiry is 30 days. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 5/5 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S3 | https://raw.githubusercontent.com/googleapis/googleapis/master/google/longrunning/operations.proto | 2026-11-07T20:36:16.008587+00:00 | 200 | 5d2e7f9eeb55b8417b50e0a536a092babd32d26e4fbeb7099c6cdcda6e16db9c | rpc ListOperations \| rpc GetOperation \| rpc DeleteOperation \| rpc CancelOperation \| rpc WaitOperation | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 5/5 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S43 | https://raw.githubusercontent.com/aip-dev/google.aip.dev/master/aip/general/0193.md | 2026-11-07T20:36:17.161303+00:00 | 200 | d76399f08a3a01256f75f567596e95f57eec9deb6f6f3b28333d80e8f012018a | google.rpc.Status | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 1/1 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
