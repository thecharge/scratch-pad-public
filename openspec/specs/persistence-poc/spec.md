# persistence-poc Specification

## Purpose
Provide SQLite persistence through Drizzle with shared auth migrations and isolated test databases.
## Requirements
### Requirement: SQLite with Drizzle
The POC SHALL persist its example domain in SQLite via Drizzle's `bun-sqlite` adapter, isolated in a db package that capabilities access through an interface.

#### Scenario: Handler uses interface
- **WHEN** a capability handler needs data
- **THEN** it calls the repository interface and imports no driver

### Requirement: Auth tables in the same migrations
When the Better Auth provider is used, its tables SHALL be generated into the Drizzle schema with the Better Auth CLI and applied through the same committed drizzle-kit migrations.

#### Scenario: Fresh database with auth
- **WHEN** the app starts against an empty database with the Better Auth provider configured
- **THEN** application and auth tables exist after migrations run

#### Scenario: Auth disabled
- **WHEN** auth is disabled
- **THEN** the application runs without reading or requiring auth tables

### Requirement: Committed migrations
Schema changes SHALL be generated with `drizzle-kit generate`, committed as SQL, and applied by the Drizzle migrator at startup or by a migrate command.

#### Scenario: Fresh database
- **WHEN** the app starts against an empty database
- **THEN** all committed migrations are applied in order

#### Scenario: Schema drift
- **WHEN** the Drizzle schema differs from committed migrations
- **THEN** CI fails

### Requirement: Test database isolation
Integration and e2e tests SHALL use an isolated in-memory or temporary database.

#### Scenario: Clean state
- **WHEN** a test starts
- **THEN** it begins with freshly migrated empty tables
