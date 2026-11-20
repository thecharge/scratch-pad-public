# http-adapter Specification

## Purpose
Project capabilities into versioned HTTP routes, dispatch custom methods and map pipeline errors consistently.
## Requirements
### Requirement: HTTP route projection
The system SHALL expose each registered capability as a Hono route under the major-version path prefix (for example `/v1/...`), with one route registration generated per capability.

#### Scenario: Route generated from capability
- **WHEN** a capability is registered
- **THEN** a Hono route exists at its AIP-derived path and method

#### Scenario: Adapter holds no security logic
- **WHEN** the adapter source is inspected by tests
- **THEN** it imports no policy, masking, rate-limit or cache implementation, only the pipeline

### Requirement: Custom method routing
The system SHALL support AIP-136 custom methods addressed with a `:verb` suffix on resources and collections by rewriting the request path before Hono routing, and SHALL NOT depend on Hono path-parameter syntax for the colon.

#### Scenario: Custom verb dispatched
- **WHEN** a POST arrives at `/v1/publishers/p1/books/b1:archive`
- **THEN** the archive capability is invoked with the resource name `publishers/p1/books/b1`

#### Scenario: Collection-level verb
- **WHEN** a POST arrives at `/v1/publishers/p1/books:batchCreate`
- **THEN** the batchCreate capability is invoked with parent `publishers/p1`

#### Scenario: Unknown verb
- **WHEN** a request uses a verb that no capability declares
- **THEN** the response is an AIP-193 `NOT_FOUND` error

#### Scenario: Wrong HTTP method
- **WHEN** a GET is sent to a POST-only custom method
- **THEN** the response is 405 with an AIP-193 error body

#### Scenario: Conformance over all custom methods
- **WHEN** the test suite runs
- **THEN** every registered custom method is exercised through the public `:verb` path

### Requirement: Error mapping
The adapter SHALL map pipeline errors to the AIP-193 JSON error body with the matching HTTP status before a capability starts. A failure during a long-running operation SHALL appear in its Operation error field; a failure inside an open event stream SHALL end that stream.

#### Scenario: Denied request
- **WHEN** policy denies the principal
- **THEN** the response status is 403 with `status` `PERMISSION_DENIED`

### Requirement: Required headers and streamed bodies

The adapter SHALL require supported Accept headers, supported Content-Type headers for bodies and the configured proxy marker. It SHALL reject missing or unsupported headers before invoking a capability, naming the header in an AIP-193 error. It SHALL read request bodies as streams and write JSON documents through streams; text/event-stream SHALL be reserved for event capabilities.

#### Scenario: Missing Accept

- **WHEN** a request omits Accept
- **THEN** it fails before execution with an AIP-193 error naming Accept

#### Scenario: Streamed JSON

- **WHEN** a caller requests application/json
- **THEN** the response is one JSON document written through a stream
