## ADDED Requirements

### Requirement: Per-capability policy
The system SHALL evaluate an optional `policy` declared on a capability and return allow or deny with a typed reason for a given principal (user or agent) before the handler runs.

#### Scenario: Allowed principal
- **WHEN** the principal satisfies the capability policy
- **THEN** the pipeline continues to the handler

#### Scenario: Denied principal
- **WHEN** the policy denies the principal
- **THEN** the handler is not invoked and a permission-denied error with the reason code is returned

#### Scenario: No policy declared
- **WHEN** a capability declares no policy
- **THEN** no policy evaluation occurs

### Requirement: Distinct user and agent principals
The policy input SHALL distinguish user and agent principals and include their scopes and roles.

#### Scenario: Agent-only restriction
- **WHEN** a policy permits users but denies agents
- **THEN** an agent principal is denied and a user principal is allowed

### Requirement: Permission before existence
Policy SHALL be evaluated before resource lookup so a denied principal cannot learn whether a resource exists.

#### Scenario: Missing resource, denied caller
- **WHEN** a denied principal requests a resource that does not exist
- **THEN** the response is permission-denied, not not-found

### Requirement: Decision events
Each decision SHALL emit an event with capability id, principal kind, outcome and reason to the observability bus.

#### Scenario: Decision observable
- **WHEN** a policy decision is made
- **THEN** a decision event is published containing no payload data
