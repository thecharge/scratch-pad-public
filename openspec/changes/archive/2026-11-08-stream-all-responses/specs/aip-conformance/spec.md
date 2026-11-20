## MODIFIED Requirements

### Requirement: Concurrency and idempotency
Resources MAY expose a quoted `etag`; a mismatching etag on Update or Delete SHALL return `ABORTED`. The expected version SHALL be checked atomically with the persistent write so concurrent requests using the same original ETag cannot both overwrite the resource. Mutating requests MAY carry a UUID `requestId`, and a repeated `requestId` SHALL return the earlier successful response.

#### Scenario: Etag mismatch
- **WHEN** an update carries a stale etag
- **THEN** the response is 409 `ABORTED`

#### Scenario: Concurrent mutations
- **WHEN** two concurrent Update or Delete requests read the same resource version and carry its ETag
- **THEN** one persistent write succeeds and the other returns `ABORTED` without overwriting the winner

#### Scenario: Replay
- **WHEN** a create is repeated with the same `requestId`
- **THEN** the original response is returned and no second resource is created

### Requirement: Pagination
List capabilities SHALL accept `pageSize` and `pageToken`, return `nextPageToken`, use opaque URL-safe tokens, and leave `nextPageToken` empty only at the end of the collection. Each response SHALL be one AIP-158 page written through a byte stream, without element envelopes or newline-delimited response records.

#### Scenario: Negative page size
- **WHEN** `pageSize` is negative
- **THEN** the response is `INVALID_ARGUMENT`

#### Scenario: Zero page size
- **WHEN** `pageSize` is omitted or zero
- **THEN** the configured default is used and no error is returned

#### Scenario: Last page
- **WHEN** the final page is returned
- **THEN** `nextPageToken` is empty

### Requirement: Long-running operations
Capabilities that cannot complete synchronously SHALL return an Operation with `name`, `done`, `metadata`, `response` and `error`, retrievable by name. The Operations service SHALL support list, get, delete, cancel and wait. Starting and retrieving an operation SHALL produce one Operation document written through a stream.

#### Scenario: Failure during execution
- **WHEN** an operation fails after starting
- **THEN** the error is reported in the Operation `error` field with `done` true

#### Scenario: Failure to start
- **WHEN** an operation cannot be started
- **THEN** a normal error response is returned, not an Operation

### Requirement: Error model
Errors SHALL use the body `{"error": {code, message, status, details}}` where `code` is the HTTP status derived from the canonical code table, `details` SHALL include an `ErrorInfo` with `reason` matching `[A-Z][A-Z0-9_]+[A-Z0-9]` (at most 63 characters) and a `domain`, dynamic values SHALL be placed in `ErrorInfo.metadata`, and permission SHALL be checked before existence. Streaming the body SHALL preserve this error model before execution; failures after a long-running operation starts SHALL use its Operation error field.

#### Scenario: ErrorInfo present
- **WHEN** any error response is produced
- **THEN** `details` contains an `ErrorInfo` with `reason` and `domain`

#### Scenario: Denied caller, missing resource
- **WHEN** an unauthorized caller requests a missing resource
- **THEN** the response is 403 `PERMISSION_DENIED`

#### Scenario: Status mapping
- **WHEN** a handler raises `ALREADY_EXISTS`
- **THEN** the HTTP status is 409 and `status` is `ALREADY_EXISTS`

## Verified external sources

| Source | URL | Fetched UTC | HTTP | SHA-256 | Passage | Falsification and output |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | https://raw.githubusercontent.com/aip-dev/google.aip.dev/master/aip/general/0151.md | 2026-11-07T20:36:16.009380+00:00 | 200 | eb4293bad26eefebecf225e5c669ec9d8caa8268a472db08bbe1eaa767e05347 | The response must not be a streaming response. \| Individual APIs must not define their own interfaces for long-running operations to avoid non-uniformity. \| Errors that prevent a long-running operation from starting must return an error response \| Operations that fail during their execution phase must return an error response \| A good rule of thumb for operation expiry is 30 days. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 5/5 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S2 | https://raw.githubusercontent.com/aip-dev/google.aip.dev/master/aip/general/0158.md | 2026-11-07T20:36:16.001927+00:00 | 200 | 3275e7ac12a1f9f8b3f10e36edb47d942e83293ab5a27aa3aea3107f0f0e7b76 | The response must not be a streaming response. \| If the end of the collection has been reached, the next_page_token field must be empty. \| If the user specifies a negative value for page_size, the API must send an INVALID_ARGUMENT error. \| If the user does not specify page_size (or specifies 0), the API chooses an appropriate default \| If the user specifies page_size greater than the maximum permitted by the API, the API should coerce down to the maximum permitted page size. | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 5/5 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
| S3 | https://raw.githubusercontent.com/googleapis/googleapis/master/google/longrunning/operations.proto | 2026-11-07T20:36:16.008587+00:00 | 200 | 5d2e7f9eeb55b8417b50e0a536a092babd32d26e4fbeb7099c6cdcda6e16db9c | rpc ListOperations \| rpc GetOperation \| rpc DeleteOperation \| rpc CancelOperation \| rpc WaitOperation | Fresh byte/status comparison and normalized passage search; changed and missing inputs tested with stubs. \| HTTP 200; 5/5 passages found; byte digest recorded. Runtime counterexamples and outputs: sources.md and task evidence. |
