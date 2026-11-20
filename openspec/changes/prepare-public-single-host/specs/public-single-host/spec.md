## ADDED Requirements

### Requirement: Single-host application stack

The release MUST retain the original Hono application, OpenAPI, generated SDK, MCP, skills, console, authentication, SQLite, Caddy and documentation.

#### Scenario: Installed consumer drives the stack

- **WHEN** the existing installed-package tests run through Caddy using fixture authentication
- **THEN** they verify the book lifecycle and HTTP/1.1, HTTP/2 and HTTP/3 with TLS

### Requirement: Verified documentation publication

The release MUST publish verified scenario documentation only after successful local verification and browser checks.

#### Scenario: Failed candidate remains unpublished

- **WHEN** a candidate has a failed scenario or browser check
- **THEN** the previous complete documentation publication remains available
