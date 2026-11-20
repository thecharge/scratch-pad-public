## ADDED Requirements

### Requirement: Single capability definition
The system SHALL provide `defineCapability()` that accepts one Zod 4 definition containing an id, AIP resource and method kind, input and output schemas, documentation text, examples and version, and SHALL register it in a capability registry.

#### Scenario: Capability registered once
- **WHEN** a capability is defined and registered
- **THEN** the registry returns it by id and exposes its schemas, metadata and optional blocks to every adapter

#### Scenario: Duplicate id rejected
- **WHEN** two capabilities are registered with the same id
- **THEN** registration fails with a typed error naming the id

### Requirement: Optional per-capability blocks
A capability SHALL be able to declare `policy`, `mask`, `cache` and `rateLimit` blocks, each optional, and an omitted block SHALL cause the corresponding middleware to be skipped; the `auth` mode is mandatory and is specified by the `authentication` capability.

#### Scenario: Capability without policy or mask
- **WHEN** a capability declares neither `policy` nor `mask`
- **THEN** the pipeline runs neither the policy nor the masking middleware for it

#### Scenario: Auth mode must be explicit
- **WHEN** a capability omits the `auth` mode (`none`, `optional` or `required`)
- **THEN** definition-time validation fails

### Requirement: Transport-agnostic pipeline
The system SHALL execute capabilities through one pipeline over a transport-neutral context, in the order auth, rate limit, policy, input validation, cache, handler, mask, observe, and adapters SHALL NOT implement these steps themselves.

#### Scenario: Same result across transports
- **WHEN** the same capability is invoked with equivalent input and principal over HTTP and over MCP
- **THEN** the pipeline produces the same decision and output data for both

#### Scenario: Invalid input
- **WHEN** input fails schema validation
- **THEN** the handler is not called and a typed validation error is returned
