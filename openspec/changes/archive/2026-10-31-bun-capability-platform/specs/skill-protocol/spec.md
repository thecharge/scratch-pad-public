## ADDED Requirements

### Requirement: Skills extension via the SDK
The MCP server SHALL serve skills through the SDK's Skills extension (`io.modelcontextprotocol/skills`) with a `SkillSource` generated from the capability registry, and SHALL NOT register its own resources under `skill://`.

#### Scenario: Extension advertised
- **WHEN** a client calls `server/discover`
- **THEN** the result lists `io.modelcontextprotocol/skills` and the `resources` capability

#### Scenario: Reserved scheme
- **WHEN** the resource registry is built
- **THEN** no resource other than skill files uses the `skill://` scheme

### Requirement: skill URI layout
Each skill SHALL be served at `skill://<skill-path>/SKILL.md` with supporting files below the same path, and the final `<skill-path>` segment SHALL equal the `name` in the SKILL.md frontmatter.

#### Scenario: Name matches path
- **WHEN** a skill is generated for the books capability group
- **THEN** its SKILL.md URI ends in `<name>/SKILL.md` and its frontmatter `name` equals `<name>`

#### Scenario: Frontmatter fields
- **WHEN** SKILL.md is generated
- **THEN** its frontmatter contains `name` and `description` and no script, hook or `allowed-tools` fields

### Requirement: Listing with digests
`skills/list` SHALL return for every skill the `uri`, verbatim `frontmatter`, and `resources` as `{uri, digest, size}` entries where `digest` is `sha256:` plus 64 lowercase hex characters, built with `skillEntry`, paginated with `cursor` and `nextCursor`.

#### Scenario: Digest matches content
- **WHEN** a client reads a listed resource and hashes it
- **THEN** the hash equals the listed `digest` and the byte length equals `size`

#### Scenario: Limits
- **WHEN** a skill exceeds 512 resources or 16 MiB
- **THEN** the build fails with a typed error

#### Scenario: Cache hint
- **WHEN** `skills/list` is answered on 2026-07-28
- **THEN** the result carries `ttlMs` and `cacheScope` `private`

### Requirement: Get by URI
`skills/get` SHALL accept a SKILL.md URI and return one entry of the same shape, and SHALL return error `-32602` for unknown or non-skill URIs.

#### Scenario: Unknown skill
- **WHEN** a client calls `skills/get` with an unknown URI
- **THEN** the server returns JSON-RPC error `-32602`

### Requirement: Authorization-aware skill visibility
Skills for capabilities the principal cannot invoke SHALL be omitted from `skills/list` and refused by `skills/get` and `resources/read`.

#### Scenario: Hidden skill
- **WHEN** policy denies a principal every capability in a skill group
- **THEN** that skill is not listed and a direct `skills/get` returns `-32602`

### Requirement: Skills regenerate with the registry
Skill files SHALL be rebuilt from the registry at build time and a changed skill SHALL change its digest.

#### Scenario: Capability description changes
- **WHEN** a capability's description changes
- **THEN** the generated SKILL.md and its digest change in the next build
