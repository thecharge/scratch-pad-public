## ADDED Requirements

### Requirement: Resource names
Resources SHALL expose a `name` field holding a `/`-separated resource name with plural camelCase collection identifiers, the API version SHALL NOT be part of the name, and user-specified ids SHALL match `^[a-z]([a-z0-9-]{0,61}[a-z0-9])?$`.

#### Scenario: Valid name
- **WHEN** a book is returned
- **THEN** its `name` is of the form `publishers/{publisher}/books/{book}`

#### Scenario: Invalid id
- **WHEN** a create request supplies an id containing `:` or uppercase letters
- **THEN** the response is `INVALID_ARGUMENT`

### Requirement: Wire format
JSON fields SHALL be lowerCamelCase on output, snake_case input SHALL also be accepted, timestamps SHALL be RFC 3339 strings with a `Time` suffix, durations SHALL be strings ending in `s`, and unknown request fields SHALL be rejected.

#### Scenario: snake_case input
- **WHEN** a request sends `page_size`
- **THEN** it is treated as `pageSize`

#### Scenario: Unknown field
- **WHEN** a request body contains an undeclared field
- **THEN** the response is `INVALID_ARGUMENT` naming the field

### Requirement: Standard methods
Each resource SHALL implement Get and List; Get and List SHALL use GET without a body, Create SHALL use POST with the `{resource}Id` as a query parameter and ignore a `name` in the body, Update SHALL use PATCH, and Delete SHALL use DELETE without a body and return `200` with `{}`.

#### Scenario: Create ignores name
- **WHEN** a create body contains a `name`
- **THEN** the created resource's name derives from the parent and the id, not from the body

#### Scenario: Delete parent with children
- **WHEN** a parent with children is deleted without `force=true`
- **THEN** the response is `FAILED_PRECONDITION`

### Requirement: Major version in path
The API SHALL put the major version first in the URI path and SHALL NOT expose minor or patch versions; beta APIs SHALL use a `v1beta` style prefix.

#### Scenario: Versioned path
- **WHEN** capabilities are mounted
- **THEN** their paths begin with `/v1/`

### Requirement: Pagination
List capabilities SHALL accept `pageSize` and `pageToken`, return `nextPageToken`, use opaque URL-safe tokens, and leave `nextPageToken` empty only at the end of the collection.

#### Scenario: Negative page size
- **WHEN** `pageSize` is negative
- **THEN** the response is `INVALID_ARGUMENT`

#### Scenario: Zero page size
- **WHEN** `pageSize` is omitted or zero
- **THEN** the configured default is used and no error is returned

#### Scenario: Last page
- **WHEN** the final page is returned
- **THEN** `nextPageToken` is empty

### Requirement: Ordering and filtering
List capabilities MAY accept `orderBy` and `filter`; `filter` SHALL be parsed into a typed AST over a per-capability field allowlist, SHALL support `AND`, `OR`, `NOT`, `-`, the comparison operators and the `:` has operator, and unknown fields SHALL return `INVALID_ARGUMENT`.

#### Scenario: Unknown filter field
- **WHEN** `filter` references a field not on the allowlist
- **THEN** the response is `INVALID_ARGUMENT`

#### Scenario: Injection attempt
- **WHEN** `filter` contains SQL syntax
- **THEN** it is rejected by the parser and never reaches the database layer

### Requirement: Field masks and views
Update SHALL accept `updateMask` as a comma-separated list of paths relative to the resource, an omitted mask SHALL mean all populated fields, indexes into repeated fields SHALL be rejected, output-only fields SHALL be ignored, and reads MAY accept `view` with `BASIC` and `FULL`.

#### Scenario: Index rejected
- **WHEN** a mask path contains `authors.0`
- **THEN** the response is `INVALID_ARGUMENT`

#### Scenario: Output-only in mask
- **WHEN** a mask names an output-only field
- **THEN** that entry is ignored

### Requirement: Field behavior
Every request field SHALL declare `REQUIRED`, `OPTIONAL` or `OUTPUT_ONLY`, and `IMMUTABLE` and `INPUT_ONLY` SHALL be honored.

#### Scenario: Immutable change
- **WHEN** an update changes an immutable field
- **THEN** the response is `INVALID_ARGUMENT`; an unchanged value is ignored

#### Scenario: Missing required field
- **WHEN** a required field is absent
- **THEN** the response is `INVALID_ARGUMENT`

### Requirement: Custom methods
Custom methods SHALL use `:verb` suffixes, POST for side effects and GET only for reads, verb-noun names without prepositions or standard verbs, and state transitions SHALL fail with `FAILED_PRECONDITION` when not allowed.

#### Scenario: Archive
- **WHEN** a POST arrives at `/v1/publishers/p1/books/b1:archive`
- **THEN** the archive capability runs against `publishers/p1/books/b1`

#### Scenario: Illegal transition
- **WHEN** an already archived book is archived again
- **THEN** the response is `FAILED_PRECONDITION`

### Requirement: Batch methods
Batch methods SHALL be `:batchGet` (GET), `:batchCreate`, `:batchUpdate`, `:batchDelete` (POST), synchronous batches SHALL be atomic, and `:batchGet` SHALL return results in request order.

#### Scenario: Atomic failure
- **WHEN** one item in a synchronous batchCreate fails
- **THEN** no item is created

### Requirement: Concurrency and idempotency
Resources MAY expose a quoted `etag`; a mismatching etag on Update or Delete SHALL return `ABORTED`; mutating requests MAY carry a UUID `requestId`, and a repeated `requestId` SHALL return the earlier successful response.

#### Scenario: Etag mismatch
- **WHEN** an update carries a stale etag
- **THEN** the response is 409 `ABORTED`

#### Scenario: Replay
- **WHEN** a create is repeated with the same `requestId`
- **THEN** the original response is returned and no second resource is created

### Requirement: Validate only
Mutating capabilities SHALL accept `validateOnly`, run all permission and validation checks, and return the response the live request would have returned without executing.

#### Scenario: Validation failure
- **WHEN** `validateOnly=true` and the input is invalid
- **THEN** the same error as the live request is returned

### Requirement: Long-running operations
Capabilities that cannot complete synchronously SHALL return an Operation with `name`, `done`, `metadata`, `response` and `error`, retrievable by name.

#### Scenario: Failure during execution
- **WHEN** an operation fails after starting
- **THEN** the error is reported in the Operation `error` field with `done` true

#### Scenario: Failure to start
- **WHEN** an operation cannot be started
- **THEN** a normal error response is returned, not an Operation

### Requirement: Soft delete
Resources that support soft delete SHALL expose `deleteTime` and `purgeTime`, Delete SHALL return the updated resource, List SHALL omit deleted resources unless `showDeleted` is true, and `:undelete` and `:expunge` SHALL exist.

#### Scenario: Undelete live resource
- **WHEN** `:undelete` is called on a resource that is not deleted
- **THEN** the response is 409 `ALREADY_EXISTS`

### Requirement: Error model
Errors SHALL use the body `{"error": {code, message, status, details}}` where `code` is the HTTP status derived from the canonical code table, `details` SHALL include an `ErrorInfo` with `reason` matching `[A-Z][A-Z0-9_]+[A-Z0-9]` (at most 63 characters) and a `domain`, dynamic values SHALL be placed in `ErrorInfo.metadata`, and permission SHALL be checked before existence.

#### Scenario: ErrorInfo present
- **WHEN** any error response is produced
- **THEN** `details` contains an `ErrorInfo` with `reason` and `domain`

#### Scenario: Denied caller, missing resource
- **WHEN** an unauthorized caller requests a missing resource
- **THEN** the response is 403 `PERMISSION_DENIED`

#### Scenario: Status mapping
- **WHEN** a handler raises `ALREADY_EXISTS`
- **THEN** the HTTP status is 409 and `status` is `ALREADY_EXISTS`

### Requirement: Text normalization
User-supplied identifiers and uniqueness checks SHALL use Unicode NFC, and length limits SHALL count code points.

#### Scenario: Equivalent forms
- **WHEN** two display names differ only by NFC versus NFD
- **THEN** a uniqueness check treats them as equal
