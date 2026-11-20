# authentication Specification

## Purpose
Define explicit authentication modes, provider integration, token validation and safe authentication configuration across transports.
## Requirements
### Requirement: Auth enablement switch
The system SHALL provide a validated configuration value `auth.enabled`, SHALL NOT mount authentication routes or call the verifier when it is false, and SHALL refuse to start in a production environment when it is not set explicitly.

#### Scenario: Auth disabled
- **WHEN** `auth.enabled` is false
- **THEN** the Better Auth routes are not mounted and no token verification occurs

#### Scenario: Production without a decision
- **WHEN** the environment is production and `auth.enabled` is unset
- **THEN** startup fails with a typed error naming the setting

### Requirement: Per-capability auth mode
Every capability SHALL declare `auth` as `none`, `optional` or `required`, and a capability without the declaration SHALL fail definition-time validation.

#### Scenario: Authless capability
- **WHEN** a capability declares `auth: 'none'`
- **THEN** it is served with or without a token and never reads credentials

#### Scenario: Optional auth without token
- **WHEN** a capability declares `auth: 'optional'` and no token is presented
- **THEN** it runs with an anonymous principal

#### Scenario: Missing declaration
- **WHEN** a capability omits `auth`
- **THEN** registration fails

### Requirement: Fail closed when auth is disabled
When authentication is disabled, capabilities declaring `required` SHALL NOT be served: over HTTP they SHALL return 401 `UNAUTHENTICATED` with reason `AUTH_NOT_ENABLED`, and over MCP they SHALL be absent from `tools/list` and `skills/list`.

#### Scenario: Required capability, auth off
- **WHEN** a client calls a `required` capability while auth is disabled
- **THEN** the response is 401 with reason `AUTH_NOT_ENABLED`

#### Scenario: Listing with auth off
- **WHEN** a client lists tools while auth is disabled
- **THEN** only `none` and `optional` capabilities appear

### Requirement: Pluggable provider
Authentication SHALL go through an `AuthProvider` interface providing token verification, resource metadata and optional route mounting, and the system SHALL ship a `better-auth` provider and a generic `jwks` provider.

#### Scenario: External issuer
- **WHEN** the `jwks` provider is configured with an issuer, JWKS URL and audience
- **THEN** a JWT signed by that issuer for that audience is accepted and any other is rejected

#### Scenario: Provider swap
- **WHEN** the configured provider changes
- **THEN** no capability, adapter or pipeline code changes

### Requirement: Better Auth with JWT
The `better-auth` provider SHALL run Better Auth with the JWT and MCP plugins mounted in Hono, SHALL disable the `/token` endpoint as the plugin guides require, SHALL issue JWT access tokens whose `aud` equals the configured resource, and SHALL verify tokens against the JWKS with issuer, audience, expiry and signature checks.

#### Scenario: Valid token
- **WHEN** a request carries a JWT issued by Better Auth for the configured resource
- **THEN** verification succeeds and the principal carries the token's subject and scopes

#### Scenario: Wrong audience
- **WHEN** a JWT has a different `aud`
- **THEN** the request is rejected with 401

#### Scenario: Unknown key id
- **WHEN** a JWT names a `kid` not in the cached JWKS
- **THEN** the JWKS is refetched once before the token is rejected

### Requirement: Better Auth configuration safety
The system SHALL require a Better Auth secret of at least 32 characters from configuration, SHALL fail production startup when it is unset, SHALL NOT allow a localhost entry in production `trustedOrigins`, and SHALL keep dynamic client registration disabled by default.

#### Scenario: Weak secret
- **WHEN** the configured secret is shorter than 32 characters
- **THEN** startup fails without printing the secret

#### Scenario: Localhost origin in production
- **WHEN** the environment is production and `trustedOrigins` contains a localhost entry
- **THEN** startup fails

### Requirement: Hono middleware
The `auth` package SHALL provide a Hono middleware that extracts the bearer token, calls the provider, sets the principal on the context, and returns an AIP-193 `UNAUTHENTICATED` error with a `WWW-Authenticate` header on failure.

#### Scenario: Principal on context
- **WHEN** a valid token is presented
- **THEN** downstream handlers read the principal from the Hono context

### Requirement: Protected Resource Metadata
The system SHALL publish RFC 9728 Protected Resource Metadata at the well-known path derived from the configured resource identifier, containing `resource` and at least one `authorization_servers` entry, and MCP 401 responses SHALL carry its URL in `WWW-Authenticate`.

#### Scenario: Host-level resource
- **WHEN** the resource identifier is `https://api.example.com`
- **THEN** metadata is served at `/.well-known/oauth-protected-resource`

### Requirement: Principal roles and scopes
The provider SHALL map token claims to a principal with kind (anonymous, user or agent), scopes and roles, and the `admin` role of the Better Auth admin plugin SHALL map to the `admin` scope.

#### Scenario: Admin mapping
- **WHEN** a user with the `admin` role obtains a token
- **THEN** the principal has the `admin` scope
