# dev-standards Specification

## Purpose
Define the formatting, linting, hooks, shared contracts and blocking checks that govern repository changes.
## Requirements
### Requirement: Mandatory Biome
The repository SHALL format and lint JavaScript, TypeScript, JSX, TSX, JSON, JSONC, CSS and GraphQL with Biome v2 at a pinned version, SHALL include the raw-string GritQL plugin, and SHALL fail `verify` and the pre-push hook on any violation; Biome SHALL NOT be bypassable by configuration.

#### Scenario: Unformatted file
- **WHEN** a staged TypeScript file is unformatted
- **THEN** the pre-commit hook fixes it with `biome check --write` and restages it, or fails if unfixable

#### Scenario: Biome missing
- **WHEN** the Biome binary cannot be resolved
- **THEN** the hook fails instead of skipping the check

### Requirement: Mandatory dprint
The repository SHALL format Markdown, TOML, YAML and Dockerfile with dprint plugins, SHALL pin plugin versions in `dprint.json`, and SHALL fail `verify` and the pre-push hook when `dprint check` reports unformatted files.

#### Scenario: Unformatted Markdown
- **WHEN** a staged Markdown file is unformatted
- **THEN** `dprint fmt --staged` fixes it in pre-commit, and `dprint check` fails `verify` for an unformatted file

#### Scenario: dprint missing
- **WHEN** the dprint binary cannot be resolved
- **THEN** the hook fails instead of skipping the check

### Requirement: Formatter ownership
No file type SHALL be formatted by both tools: Biome's formatter and file includes SHALL exclude Markdown, YAML, TOML and the experimental web formats, and the dprint plugin list SHALL contain no TypeScript, JavaScript or JSON plugin.

#### Scenario: Idempotent formatting
- **WHEN** both formatters run twice over a fixture containing every owned file type
- **THEN** the second run changes nothing

#### Scenario: Plugin list
- **WHEN** `dprint.json` is inspected
- **THEN** its plugin list contains no TypeScript, JavaScript or JSON plugin

#### Scenario: Biome and Markdown
- **WHEN** Biome runs over a Markdown file
- **THEN** it does not rewrite the file

### Requirement: Spell checking configuration
cspell SHALL be mandatory and configured in a committed `cspell.json` with the `softwareTerms`, `typescript`, `node` and `npm` dictionaries and a committed project word list, and SHALL check source, docs, configuration and commit messages.

#### Scenario: Unknown word in a commit message
- **WHEN** a commit message contains a misspelled word
- **THEN** the commit-msg hook fails and names the word

#### Scenario: Unknown word in a file
- **WHEN** a staged file contains an unknown word
- **THEN** the pre-commit hook fails and names the word

#### Scenario: Project word accepted
- **WHEN** a word is added to the project word list
- **THEN** it passes the check in hooks and `verify`

### Requirement: Git hooks
Lefthook SHALL run staged-file checks (Biome, dprint, cspell, secret scan, plugin fixtures) in parallel on pre-commit, a broader check on pre-push, and commit message linting on commit-msg, and hooks SHALL install automatically after dependency install.

#### Scenario: Hooks installed
- **WHEN** a contributor runs `bun install`
- **THEN** the lefthook hooks are installed

### Requirement: Secret and leak prevention
A secret scanner wrapped behind one repository script, plus secretlint, SHALL scan staged content in pre-commit and the full repository in `verify`, `.env` files SHALL be ignored by git, and a fixture test SHALL prove the scanner rejects a known fake credential.

#### Scenario: Scanner swappable
- **WHEN** the underlying scanner command changes
- **THEN** only the wrapper script changes and the fixture test still passes

#### Scenario: Secret blocked
- **WHEN** a commit contains a credential-shaped string
- **THEN** the commit is rejected

### Requirement: Diagram validity
Every Mermaid block in the proposal, design, specs and docs SHALL parse, and `verify` SHALL fail when one does not.

#### Scenario: Broken diagram
- **WHEN** a Mermaid block contains a syntax error
- **THEN** the diagram check fails and names the file and block

### Requirement: Dependency and dead-code hygiene
`verify` SHALL run knip and a dependency advisory audit and fail on unused exports or known high-severity advisories.

#### Scenario: Unused export
- **WHEN** a package exports something never imported
- **THEN** knip fails `verify`

### Requirement: One verify command
`bun run verify` SHALL run every mandatory check (Biome, dprint, cspell, secret scan, plugin fixtures, diagram parse, knip, audit, tests, OpenAPI breaking-change gate, docs build) so the gate exists without remote CI.

#### Scenario: Local verification
- **WHEN** a contributor runs `bun run verify` on a clean checkout
- **THEN** all checks run and the command exits non-zero if any fails

### Requirement: Disabled GitHub Actions workflows
No GitHub Actions workflow SHALL exist in the repository: `.github/workflows` SHALL be absent or contain no `.yml` or `.yaml` file, and verification SHALL run locally through the hooks and `bun run verify`.

#### Scenario: A workflow file exists
- **WHEN** a `.yml` or `.yaml` file exists under `.github/workflows`
- **THEN** the workflows check in `verify` fails and names the file

#### Scenario: No workflow exists
- **WHEN** `.github/workflows` is absent or empty
- **THEN** the workflows check passes and no workflow run is started

### Requirement: License undecided
The repository SHALL NOT contain a `LICENSE` file or a `license` field in any `package.json`, and workspace packages SHALL be `private`, until the owner decides.

#### Scenario: Publish protection
- **WHEN** a workspace package is inspected
- **THEN** it has `private: true`

#### Scenario: No license file
- **WHEN** the repository root is listed
- **THEN** there is no `LICENSE` file

### Requirement: Every development rule is enforced in pre-commit and blocks
Every development rule SHALL be backed by a blocking automated check in the commit or push hooks and in `bun run verify`. Staged formatting, secret scanning, commit messages and skill freshness SHALL remain commit-time checks. The push hook SHALL invoke the complete `bun run verify` pipeline once, including all end-to-end, coverage and generated-documentation checks. Development SHALL use focused checks while implementing a substantive batch; a separate full run immediately before the push hook SHALL NOT be required. Checks SHALL NOT be skipped or changed to warnings to shorten delivery.

#### Scenario: A batch is committed
- **WHEN** a contributor commits a batch
- **THEN** staged checks block invalid content without rebuilding the documentation or recording the knowledge base

#### Scenario: A batch is pushed
- **WHEN** a contributor pushes a batch
- **THEN** one complete verification pipeline runs and any mandatory failure prevents the push

#### Scenario: The full push command is changed
- **WHEN** the push hook no longer invokes the canonical full verification command
- **THEN** the rule registry check rejects rules whose individual jobs are absent

#### Scenario: The dependency audit loses its connection
- **WHEN** the audit produces no report and fails with the observed connection-closed request error or reaches its time limit
- **THEN** the audit runner allows at most three attempts, each limited to 60 seconds with a five-second kill grace period, and passes only after a fresh unfiltered audit succeeds

#### Scenario: The dependency audit reports findings or cannot recover
- **WHEN** an audit reports vulnerabilities, another error occurs, or all transport attempts fail
- **THEN** the mandatory audit step fails and prevents delivery

### Requirement: Enums for every closed set of strings
Every closed set of string values SHALL be a TypeScript `enum` declared in the constants package, and no source file SHALL declare a string-literal type or a union of string literals.

#### Scenario: Literal union rejected
- **WHEN** code declares `"a" | "b"` as a type
- **THEN** the pre-commit check fails and names the file and line

#### Scenario: Enum accepted
- **WHEN** a closed set is declared as an enum in the constants package
- **THEN** the check passes and the enum is used by every consumer

### Requirement: One dedicated types package with Zod schemas as the source of truth
All data shapes SHALL be Zod schemas in the types package with their types inferred from them, all behavioral contracts (interfaces with methods) SHALL be declared in the types package, and no other package SHALL declare an `interface`, a type alias or an inline object type; the constants package alone MAY declare the type alias of an enum.

#### Scenario: Local interface rejected
- **WHEN** a package other than types declares an `interface`
- **THEN** the pre-commit check fails

#### Scenario: Inline object type rejected
- **WHEN** a parameter, property or return value is annotated with an inline object type
- **THEN** the pre-commit check fails

#### Scenario: Config is a schema
- **WHEN** the configuration shape is inspected
- **THEN** it is a Zod schema in the types package and the config type is inferred from it

### Requirement: No hardcoded strings anywhere
The raw-string rule SHALL apply to every package except constants and messages, including the config package, tooling scripts and the docs and console applications; error names, separators, environment variable names and header values SHALL come from constants or messages.

#### Scenario: Config package checked
- **WHEN** the config package contains an inline string literal
- **THEN** the pre-commit check fails

#### Scenario: Tooling scripts checked
- **WHEN** a tooling script contains an inline string literal outside an allowlisted command table
- **THEN** the pre-commit check fails

### Requirement: Maximum two levels of nesting
Code SHALL nest at most two levels deep, counting control-flow statements (if, switch, loops, try) and callbacks with block bodies inside one function, and object literals, object types and Zod object schemas SHALL nest at most two levels.

#### Scenario: Third level rejected
- **WHEN** a function nests a loop inside a loop inside an if
- **THEN** the pre-commit check fails and names the function

#### Scenario: Two levels accepted
- **WHEN** a function nests one if inside one loop
- **THEN** the check passes

### Requirement: Meaningful, flat, table-driven tests
Tests SHALL assert behavior of the code under test, SHALL be flat (a `describe` containing `test` or `test.each` cases, no loops, conditionals or try blocks in a test), SHALL use `test.each` for multiple inputs of the same behavior, and SHALL NOT exist only to count (no test that asserts a constant equals itself or that a table is non-empty).

#### Scenario: Loop in a test rejected
- **WHEN** a test file contains a `for` loop or `try` block
- **THEN** the pre-commit check fails

#### Scenario: Table-driven cases
- **WHEN** one behavior is checked with several inputs
- **THEN** a single `test.each` table expresses them (reviewed, not automated: detecting near-identical test bodies is unreliable) (reviewed, not automated: detecting near-identical test bodies is unreliable)

### Requirement: README and quickstarts
The repository SHALL contain a root README, a quickstart for developers, a quickstart for API consumers and an agent quickstart, and every package SHALL contain a README describing its purpose and public API, and the documentation check SHALL fail when a package lacks one.

#### Scenario: Missing package README
- **WHEN** a package directory has no README
- **THEN** `bun run verify` fails

### Requirement: OpenSpec records have meaningful purposes and applicable deltas

Every main spec SHALL have a non-empty Purpose section without a TBD placeholder. A blocking check in pre-commit and `bun run verify` SHALL validate requirement targets in every active change against the current main specs. MODIFIED and REMOVED targets SHALL exist; ADDED targets SHALL be absent; RENAMED operations SHALL name an existing source and an unused destination. Diagnostics SHALL name the file and invalid target. Archived changes SHALL be excluded.

#### Scenario: Meaningful purpose and applicable modification

- **WHEN** a main spec describes its purpose and an active delta modifies an existing requirement
- **THEN** the integrity check passes

#### Scenario: Placeholder purpose

- **WHEN** a main spec has an empty or TBD purpose
- **THEN** the integrity check fails and names the spec

#### Scenario: Missing modification target

- **WHEN** a delta marks a requirement absent from the main spec as MODIFIED
- **THEN** the integrity check fails and names the delta and requirement

#### Scenario: Duplicate addition

- **WHEN** a delta adds a requirement already present in the main spec
- **THEN** the integrity check fails and names the duplicate target

#### Scenario: Invalid rename

- **WHEN** a rename names an absent source or an existing destination
- **THEN** the integrity check fails and names the target

#### Scenario: Historical delta

- **WHEN** an archived delta targets a requirement absent from the current main spec
- **THEN** the integrity check excludes that archived delta

### Requirement: Local data and cleanup of the container stack
The data of the container stack SHALL live in folders under one directory of the repository that git ignores, never in named volumes of the container storage. One local command SHALL remove the stack's containers, its data folders and its images, including the untagged images that builds leave, and SHALL report what it removed and the bytes it freed. A build SHALL remove the image it replaces.

#### Scenario: The stack runs and stores data
- **WHEN** the stack is up
- **THEN** every data volume is a bind mount of a folder under `.stack/data` and the container storage holds no named volume of the stack

#### Scenario: The prune command runs
- **WHEN** `bun run stack:prune` runs
- **THEN** the stack is stopped, its containers, `.stack/data` folders and images are removed, and the command prints what it removed and the bytes freed

#### Scenario: The stack is rebuilt
- **WHEN** the API image is built again
- **THEN** the image it replaces is removed and no untagged copy of it remains

### Requirement: One container per app, with the proxy in front of everything
Each app SHALL have its own container image that holds only that app and what it needs to run: no tooling, no test, no script and no other app. The proxy (Caddy) and the object store (RustFS) SHALL be separate containers, with RustFS behind the proxy. The built console and the built documentation site SHALL be static assets served from RustFS through the proxy, and the API SHALL be reached through the same proxy. The infrastructure app SHALL be the one app that has no container, because it creates the containers from the host. No test and no development SHALL run on the host machine.

#### Scenario: The API image is built
- **WHEN** the API image is built
- **THEN** the image holds the bundle of the API and the files it reads, and no other app, no tooling and no test

#### Scenario: A static site is requested
- **WHEN** a request for the console or the documentation site reaches the proxy
- **THEN** the proxy forwards it to RustFS with the original `Host` and RustFS answers with the built asset
