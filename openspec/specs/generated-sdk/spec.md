# generated-sdk Specification

## Purpose
Generate the client SDK from OpenAPI, keep its wrapper minimal and verify it against a real server.
## Requirements
### Requirement: SDK is generated
The client, operation functions and Zod schemas in `packages/sdk/generated` SHALL be produced by `@hey-api/openapi-ts` from `openapi/baseline.json` through `bun run sdk:generate`, and SHALL NOT be edited by hand.

#### Scenario: Regeneration
- **WHEN** `bun run sdk:generate` runs twice
- **THEN** the output is identical and covers every operation in the OpenAPI document

#### Scenario: No hand-written operations
- **WHEN** the package source outside `generated/` is inspected
- **THEN** it contains only the wrapper helpers

### Requirement: Minimal wrapper
Hand-written code SHALL be limited to token injection, mapping of errors to AIP-193 ErrorInfo reasons, an async pagination helper and a long-running-operation wait helper, and SHALL obey the repo rules.

#### Scenario: Auth token
- **WHEN** a token is configured
- **THEN** every request carries the bearer header

#### Scenario: Error mapping
- **WHEN** the API returns an AIP error
- **THEN** the wrapper throws a typed error exposing the status, code and ErrorInfo reason

#### Scenario: Pagination
- **WHEN** a list spans several pages
- **THEN** the async iterator yields all items lazily and stops requesting when the consumer stops

#### Scenario: Wait helper
- **WHEN** an operation completes after several polls
- **THEN** the helper resolves with its result, and fails with a typed timeout after the bounded poll count

### Requirement: Real-server SDK tests
The SDK SHALL be tested against `Bun.serve` of `createApi` for every capability: books get, list, create, update, delete, archive, undelete, batchGet and reindex, config get and update, operations get, and stats and logs.

#### Scenario: Success and errors
- **WHEN** each capability is called
- **THEN** success is asserted, and each AIP error status the capability can return is asserted

#### Scenario: Auth modes
- **WHEN** the server runs with auth off and with auth on
- **THEN** calls succeed without a token when off, and fail with the unauthenticated reason without a token when on

#### Scenario: Long-running operation
- **WHEN** reindex is started and waited on
- **THEN** polling ends with the completed operation
