## ADDED Requirements

### Requirement: Read-only console
The console SHALL be a strictly typed React app that only reads data and SHALL NOT expose actions that change API state.

#### Scenario: No write calls
- **WHEN** the console code is analyzed
- **THEN** it issues no non-GET requests other than authentication

### Requirement: Live request stream
The console SHALL show a live list of requests from the event stream with capability, transport, principal kind, outcome and latency.

#### Scenario: New event appears
- **WHEN** the API handles a request
- **THEN** the console list shows it without a manual refresh

### Requirement: Logs and stats views
The console SHALL provide a filterable log view and per-capability statistics for rate, latency, errors and cache hits.

#### Scenario: Filter by capability
- **WHEN** a user filters by capability id
- **THEN** only matching log entries and stats are shown

### Requirement: Shared types
The console SHALL use event and stat types from the shared types package, with runtime validation of incoming events.

#### Scenario: Malformed event
- **WHEN** an event fails schema validation
- **THEN** it is dropped and counted, and the UI does not crash

### Requirement: Admin authorization
The console SHALL require a bearer JWT carrying the admin scope, obtained through the configured provider's authorization-code flow with PKCE, held in memory only, using the same verification as the API.

#### Scenario: Missing scope
- **WHEN** a user without the admin scope opens the console
- **THEN** data requests are rejected and no data is shown

#### Scenario: Token not persisted
- **WHEN** the page is reloaded
- **THEN** the token is not read from local or session storage and the user signs in again

### Requirement: Existing UI libraries
The console SHALL be built from Refine (headless), shadcn/ui components, Recharts charts and TanStack Table, and SHALL NOT contain a hand-written design system, table engine or chart renderer.

#### Scenario: Dependency check
- **WHEN** the console's dependencies are inspected
- **THEN** Refine, shadcn/ui components, Recharts and TanStack Table are present

### Requirement: Read-only data provider
The console's Refine data provider SHALL implement only read operations, and its live provider SHALL subscribe over Server-Sent Events and never publish.

#### Scenario: Write attempt
- **WHEN** a create, update or delete data-provider method is called
- **THEN** it is not implemented and the type checker rejects its use

#### Scenario: Live update
- **WHEN** the API emits a request event on the stream
- **THEN** the live provider delivers it to subscribed views
