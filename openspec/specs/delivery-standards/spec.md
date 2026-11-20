# delivery-standards Specification

## Purpose
Define the tests, coverage, agent knowledge and development practices required to deliver a verified change.
## Requirements
### Requirement: Every unit has two positive and two negative tests
Every unit under test SHALL have at least two positive and two negative cases, written as `test.each` tables built from factories. A blocking check SHALL fail for a unit that has fewer.

#### Scenario: Unit with one negative case
- **WHEN** a unit has two positive cases and one negative case
- **THEN** the check fails and names the unit and the missing case kind

#### Scenario: Unit debt can only shrink
- **WHEN** a unit without the cases is not listed in `testing/unit-debt.json`, or a listed unit now has them
- **THEN** the check fails, so the list of units still owing cases only gets shorter

### Requirement: Full coverage is blocking
The test run SHALL measure coverage and SHALL fail below 100% of lines and functions over product source (user decision, 2026-10-31: lines and functions only, as Bun reports them). While unit debt remains the step is report-only: it lists the failing files and the debt count and exits 0, and one constant flips it to blocking once the debt is cleared.

#### Scenario: Uncovered line or function
- **WHEN** a line or function in product source is not executed by any test
- **THEN** the coverage step fails and names the file and the lines

#### Scenario: Branches are not measured by the runner
- **WHEN** the coverage step runs with `bun test --coverage`, which reports lines and functions only
- **THEN** the step states that branch coverage is not measured; 100% branches is not required (user decision, 2026-10-31)

### Requirement: Skills can be authored in a package and served
The platform SHALL load skills from one or more skill packages in addition to the skills generated from the capability registry. A skill in a package SHALL be a directory with a `SKILL.md` whose frontmatter has `name` (equal to the directory name) and `description`, plus optional supporting files, and SHALL be served through the Skills extension at `skill://<name>/SKILL.md` with its digest, filtered by the same policy as tools. A blocking check SHALL fail a skill package whose `SKILL.md` or frontmatter does not comply with the skills format.

#### Scenario: Package skill served
- **WHEN** a skill directory with a valid `SKILL.md` exists in a configured skill package
- **THEN** `skills/list` includes it and `skills/get` returns its content and digest

#### Scenario: Invalid skill rejected
- **WHEN** a skill's frontmatter `name` differs from its directory name or `description` is missing
- **THEN** the skills check fails and names the file

#### Scenario: Registry skills unchanged
- **WHEN** a capability group has no package skill
- **THEN** its generated skill is still served

### Requirement: Custom tools and skills are documented and conformance-tested
The documentation SHALL state, with a generated end-to-end example for each, what happens when a user defines a new capability (served as HTTP route, MCP tool and OpenAPI operation), a new tool-only item or a new skill, and how each relates to MCP conformance. Every custom tool SHALL pass the same MCP conformance suite as the built-in ones (`tools/list`, input and output schema, error results, visibility by policy).

#### Scenario: New capability
- **WHEN** a capability is added in a package
- **THEN** a scenario calls it over HTTP and MCP and the documentation page shows both calls with flags

### Requirement: Every function is asynchronous unless ignored
A blocking check SHALL fail any function, arrow function or method in product source that is neither `async` nor declared to return a promise, unless it is listed in the ignore configuration (a tool config file, never an inline comment) with a stated reason. The ignore list SHALL be reviewable and shrink-only unless a reason is added.

#### Scenario: Synchronous function
- **WHEN** a product file declares a function that is not async and is not in the ignore list
- **THEN** the check fails and names the file, line and function

#### Scenario: Ignored function
- **WHEN** a function is in the ignore configuration with a reason
- **THEN** the check passes and the reason is shown in the report

### Requirement: The repository carries the project knowledge for agents
The repository root SHALL hold `CLAUDE.md` and `AGENTS.md` that give an agent that is new to the project the knowledge it needs: what the project is, the layout of `apps`, `packages`, `testing` and `tooling`, every command, the OpenSpec workflow, every standing rule from the user, the verification protocol and the open decisions. Both files SHALL be written from the repository's real contents and pushed to main.

#### Scenario: New session
- **WHEN** an agent starts a session in the repository
- **THEN** `CLAUDE.md` and `AGENTS.md` tell it where things live, how to verify, and which rules bind it, without searching the history

#### Scenario: Missing file
- **WHEN** `CLAUDE.md` or `AGENTS.md` is missing, or does not point to `DEV_RULES.md` (which lists every rule and its job, enforced by `check-rules.ts`), or a project skill is missing from `CLAUDE.md` or from `skill-paths.json`
- **THEN** the repository check fails and names the file or skill

### Requirement: Project skills cover the whole project and can update themselves
The `.claude` folder SHALL hold skills and commands that cover the whole project: setup and verification, adding a capability, tests and coverage, generated documentation, OpenAPI and SDK, MCP and skills, rules and hooks, and the OpenSpec workflow. A self-update skill SHALL exist that, when part of the project changes, finds the skills and commands that describe it and updates them.

#### Scenario: Whole-project coverage
- **WHEN** the skills are listed
- **THEN** every area above has a skill that states its purpose, its commands and its files

#### Scenario: Self-update
- **WHEN** a part of the project changes
- **THEN** the self-update skill lists the skills and commands that describe that part and updates them in the same change

### Requirement: A pre-commit hook detects stale skills and commands
A blocking pre-commit job SHALL fail a commit that changes a part of the project covered by a skill or command (by a declared mapping from paths to skills) without changing that skill or command in the same commit, and SHALL name the paths and the skills.

#### Scenario: Code changed, skill not
- **WHEN** a commit changes files that a skill declares as its subject and does not change the skill
- **THEN** the hook fails and names the skill and the changed files

#### Scenario: Both changed
- **WHEN** the commit changes both
- **THEN** the hook passes

### Requirement: Work follows the user's explicit approval and OpenSpec
Every change to this repository SHALL be traced to a requirement the user stated explicitly, recorded in an OpenSpec change and implemented through the OpenSpec workflow. Work outside a recorded requirement SHALL NOT be done.

#### Scenario: Work without a recorded requirement
- **WHEN** a task has no requirement in an open OpenSpec change
- **THEN** it is not started

### Requirement: The end-to-end run produces the documentation
Running the end-to-end tier SHALL write the generated documentation (pages, screenshots, the end-to-end report) into the documentation site when every scenario passes, and SHALL write nothing when any scenario fails. The same scenarios feed the console, API, MCP, SDK and authentication pages.

#### Scenario: Passing run
- **WHEN** `bun run test:e2e` finishes with every scenario passing
- **THEN** the pages and screenshots under `apps/docs` are those the run just produced, each step with its flag

#### Scenario: Failing run
- **WHEN** one scenario fails
- **THEN** no page under `apps/docs` is changed and the failure names the scenario, step and reason

### Requirement: Authentication works on the API and on MCP
Authentication SHALL be proven end to end, over HTTP and over MCP, with the JWKS provider and with Better Auth: a call without a token is rejected with a challenge naming the protected-resource metadata, a valid token with enough scope succeeds, a token with too little scope is forbidden, an expired token is rejected, and a token for another audience is rejected. Each case SHALL appear as a generated documentation step.

#### Scenario: No token
- **WHEN** a protected tool or route is called without a token
- **THEN** the response is 401 with a `WWW-Authenticate` challenge, over HTTP and over MCP

#### Scenario: Insufficient scope
- **WHEN** a token without the required scope calls a protected capability
- **THEN** the call is forbidden and the documentation step shows it

#### Scenario: Valid token
- **WHEN** a token with the required scope calls the capability over HTTP and over MCP
- **THEN** both succeed and the documentation shows both calls

### Requirement: Package skills are proven through MCP and a tool gives them to the LLM
A skill served from a package SHALL be listed and read through the MCP Skills extension by a real MCP client, and the MCP server SHALL also offer a tool that lists and returns skills, so a client or LLM that does not read `skill://` resources can use them. The tool SHALL respect the same policy as the skills extension. An automated end-to-end test with a real MCP client SHALL prove both paths, and the LLM check SHALL record that a language model used the tool.

#### Scenario: Skill through the extension
- **WHEN** a real MCP client calls `skills/list` and `skills/get` for a package skill
- **THEN** the skill, its frontmatter and its digest are returned

#### Scenario: Skill through the tool
- **WHEN** a real MCP client calls the skill tool for the same skill
- **THEN** the same content is returned, and a caller not allowed to see the skill does not receive it

#### Scenario: Language model
- **WHEN** the LLM check runs against the server with the skill tool
- **THEN** the recorded transcript shows the model calling the tool and using the returned skill

### Requirement: The SDK client factory is asynchronous
`createSdkClient` SHALL be asynchronous, the SDK documentation and examples SHALL show `await createSdkClient(...)`, and its entry SHALL be removed from `async-ignore.json`.

#### Scenario: Consumer code
- **WHEN** the packed SDK is installed in an empty project
- **THEN** the documented example with `await createSdkClient(...)` type-checks and runs against the API

### Requirement: Concurrency is bounded and comes from a util package
A util package SHALL export a capped parallel-execution function (a bounded `all` that runs at most N tasks at a time, keeps the result order, and rejects with the first failure after stopping new work) whose limit is configurable through the config package and has a default. All code in `apps`, `packages`, `tooling` and `testing` SHALL use it instead of `Promise.all`, and a blocking pre-commit check SHALL fail any use of `Promise.all`. Exceptions exist only in tool config with a reason.

#### Scenario: Raw Promise.all
- **WHEN** a file calls `Promise.all`
- **THEN** the check fails and names the file and line

#### Scenario: Cap respected
- **WHEN** the util runs 100 tasks with a limit of 5
- **THEN** no more than 5 run at the same time and the results keep the input order

#### Scenario: Configured limit
- **WHEN** the concurrency limit is set in the configuration
- **THEN** the util uses it, and without a setting it uses the documented default

#### Scenario: Failure
- **WHEN** one task rejects
- **THEN** the util rejects with that error and starts no further task

### Requirement: The MCP is verified end to end with a language model and a command-line harness
After the work of this change is on main, the MCP server SHALL be verified end to end by running, against the final main: the real-client test suite, the MCP Inspector command-line harness (tool listing and calls, resources and skills, with and without tokens) and the language-model check (a model discovering and using tools and the skill tool). The commands, outputs and transcripts SHALL be saved as evidence in this change.

#### Scenario: Final run
- **WHEN** the final verification is run
- **THEN** the evidence folder holds the command, its output and the transcript for each of the three, and any failure is reported before any success
