# test-driven-docs Specification

## Purpose
Generate client behavior documentation from passing, observable scenario steps and verify the published pages and shared development rules.
## Requirements
### Requirement: Every scenario step is documented with a flag, description and checks
Every step of every end-to-end scenario SHALL appear in the generated documentation with a pass/fail flag, a human-readable description, and the list of checks the step made. The flag SHALL be produced by running the step, never written by hand.

#### Scenario: Console step documented
- **WHEN** a console scenario step runs and its checks pass
- **THEN** the generated page lists the step with the flag PASSED, its description, each check (text expected visible, text expected hidden, requests forbidden, token not in storage), and its screenshot

#### Scenario: API step documented
- **WHEN** an API scenario step runs over HTTP
- **THEN** the generated page lists the step with the flag, its description, the expected outcome and the actual outcome, the request and the response

#### Scenario: MCP step documented
- **WHEN** a scenario step runs over MCP
- **THEN** the generated page lists the step with the flag, its description, the expected outcome and the actual outcome, the tool call and the result

### Requirement: A failing scenario publishes nothing
If any step of any scenario fails, the run SHALL publish no generated page, screenshot or report, and SHALL fail with the step and the reason.

#### Scenario: One step fails
- **WHEN** one scenario among several has a failing step
- **THEN** no page from any scenario is written, and the failure names the scenario, the step and the reason

#### Scenario: Browser-only defect
- **WHEN** the console code is changed to use the Node `Buffer` in the browser
- **THEN** the sign-in scenario fails with the page error and nothing is published

### Requirement: Behavior documentation is generated, not hand-written
Documentation that describes how the console, API or MCP behaves SHALL be produced by the scenarios. A hand-written page describing that behavior SHALL NOT exist in the documentation source.

#### Scenario: Hand-written behavior guide found
- **WHEN** the documentation check finds a hand-written page whose subject is console, API or MCP behavior
- **THEN** the check fails and names the page

### Requirement: Generated documentation is reachable and itself tested
The generated pages, their screenshots and the documentation end-to-end report SHALL be reachable from the documentation navigation, and the built documentation SHALL be opened in a real browser to confirm each page loads without errors, loads its images and draws its diagrams.

#### Scenario: Navigation
- **WHEN** the documentation is built after a passing run
- **THEN** every generated page is listed in the navigation and the report lists every page with a screenshot

### Requirement: Claims about the documentation are backed by run output
Any statement that the documentation was generated or verified SHALL be backed by command output from the run that produced it.

#### Scenario: Delivery report
- **WHEN** the work is reported as done
- **THEN** the report cites the commands run, their results, and the generated files for each requirement of this specification

### Requirement: Product documentation and repository documentation are separate
The documentation site SHALL contain only product documentation for clients: UI and API calls, API handling, troubleshooting, general, OpenAPI, SDK usage and the knowledge base. Guidelines, architecture, development, end-to-end and how-it-is-done documents SHALL live in the repository under `docs/` and SHALL NOT be on the site.

#### Scenario: Development page on the site
- **WHEN** a page about guidelines, architecture, development or end-to-end practice exists under `apps/docs`
- **THEN** the documentation check fails and names the page

### Requirement: A dedicated documentation test-case type
The scenario model SHALL have a documentation case type that carries, per step: a title, a description, the place to go, the action to take, the expected result, a category and a pass/fail flag. The generated page SHALL be rendered from this type so a reader knows where to go, what to click and what is expected.

#### Scenario: Step tells the reader where, what and expected
- **WHEN** a console step is generated
- **THEN** the page states the place, the action (for example which control to click) and the expected result, next to the flag

### Requirement: Documentation has categories
Every generated page SHALL belong to one category, and the navigation SHALL group pages by category.

#### Scenario: Navigation by category
- **WHEN** the documentation is built
- **THEN** the sidebar lists the categories (UI, API calls, API handling, troubleshooting, general, OpenAPI, SDK usage) and each generated page appears under its category

### Requirement: Screenshots are focused on the step
Each screenshot SHALL show the area the step acts on or checks, not the whole page, and SHALL be loaded by the page when the site is served.

#### Scenario: Focused image
- **WHEN** a console step checks a table
- **THEN** its screenshot is cropped to that table and the docs end-to-end run confirms the image loads and is not blank

### Requirement: API documentation covers every error case
The API documentation SHALL document, for every operation, each success and each error case (every critique), generated from the scenarios.

#### Scenario: Error case documented
- **WHEN** an operation can fail with a documented error reason
- **THEN** a generated step shows that failure with its request, response and flag

### Requirement: Strict plain-language documentation (ISO 24495)
Documentation SHALL follow ISO 24495-1 plain-language principles (relevant, findable, understandable, usable) and a blocking check SHALL enforce measurable rules on every page.

#### Scenario: Rule violated
- **WHEN** a page breaks a rule of the check (for example overlong sentences, missing description or missing category)
- **THEN** the check fails and names the page and the rule

### Requirement: OpenAPI and SDK documentation in the site
The documentation site SHALL include an OpenAPI reference generated from `openapi/baseline.json` and an SDK reference generated from `packages/sdk`, each reachable from the navigation.

#### Scenario: References present
- **WHEN** the site is built
- **THEN** pages for the OpenAPI document and for the SDK operations exist and the docs end-to-end run opens them

### Requirement: Dedicated folders per test type
Tests SHALL live in dedicated folders by type (unit, integration, end-to-end) so a reader can find them without reading file names, and the tier check SHALL enforce the folder, not a name marker.

#### Scenario: Test in the wrong folder
- **WHEN** a test that opens a port, database or process is in the unit folder
- **THEN** the tiers check fails and names the file

#### Scenario: Locating end-to-end tests
- **WHEN** a reader opens the repository
- **THEN** the end-to-end tests are in the end-to-end folders, and the documentation states where they are and how they are run

### Requirement: API and SDK have end-to-end suites
The API SHALL have named end-to-end suites that run the real server over HTTP and over MCP, and the SDK SHALL have unit, integration and end-to-end suites. The SDK end-to-end suite SHALL install and use the built standalone package against a running API.

#### Scenario: SDK suite uses the built package
- **WHEN** the SDK end-to-end suite runs
- **THEN** it imports the built package output, not the workspace source, and its steps appear in the generated documentation with flags

### Requirement: The SDK ships as a standalone package
The SDK SHALL have its own build that emits JavaScript and type declarations, a manifest that is publishable (not private, with a version, `"license": "Apache-2.0"`, `files`, `exports` pointing at the build output) and an Apache License 2.0 `LICENSE` file in the package and no `workspace:*` dependency. A check SHALL fail when the packed SDK imports a workspace package or source file.

#### Scenario: Pack and install
- **WHEN** the SDK is built and packed
- **THEN** the tarball installs into an empty project and the example from the SDK documentation runs against the API

#### Scenario: Workspace leak
- **WHEN** the built SDK imports `@platform/*` or a source path
- **THEN** the check fails and names the import

### Requirement: SDK documentation handling
The SDK reference and usage documentation SHALL be generated from the built package and its end-to-end suite, and the documentation build SHALL fail if the SDK build or its suite fails.

#### Scenario: SDK build fails
- **WHEN** the SDK build fails
- **THEN** the documentation build fails and publishes nothing

### Requirement: Dedicated testing area with a framework and stacked packages
All tests, the test framework and the packages that build testing scenarios SHALL live in a dedicated top-level testing area, separate from product source. The packages SHALL be stacked, each depending only on the ones below it (for example framework and factories, then scenario building blocks, then the unit, integration and end-to-end suites).

#### Scenario: No tests in source
- **WHEN** the structure check runs
- **THEN** it fails if a test file or testing helper exists outside the testing area

### Requirement: Licensing
The repository SHALL stay private with no license, and the SDK package SHALL be the only part licensed, under Apache License 2.0. A blocking check SHALL fail if any other manifest has a `license` field or any other package has a license file, or if the SDK lacks the Apache-2.0 field or file.

#### Scenario: Other package licensed
- **WHEN** a package other than the SDK has a `license` field or a LICENSE file
- **THEN** the repository check fails and names the package

#### Scenario: SDK unlicensed
- **WHEN** the SDK manifest has no `Apache-2.0` license or its LICENSE file is missing
- **THEN** the repository check fails

### Requirement: OpenAPI documentation is driven by the tests
Each operation page in the OpenAPI documentation SHALL show, from the end-to-end scenarios that call it, every checked example (request, response, flag) and every checked error case, and SHALL list as not covered any operation, status code or error reason that no scenario exercised.

#### Scenario: Operation with examples
- **WHEN** a scenario calls an operation
- **THEN** its OpenAPI page shows that step's request, response and flag

#### Scenario: Uncovered operation
- **WHEN** an operation in the OpenAPI document has no passing scenario
- **THEN** the documentation check fails and names the operation

### Requirement: No hand-written behavior pages remain
The remaining hand-written pages describing how the API, MCP, SDK or console behave SHALL be replaced by pages generated from scenarios, or removed, and the docs-scope check SHALL fail on a page that has no generated source.

#### Scenario: Hand-written behavior page
- **WHEN** a page under the site describes behavior and is not generated from scenario results
- **THEN** the check fails and names the page

### Requirement: OpenAPI documentation is taken from the running API and MCP
The OpenAPI documentation SHALL be generated from the document served by the running API and SHALL show, for each operation, the matching MCP tool read from the running MCP server (`tools/list`). A blocking check SHALL fail when an operation has no matching MCP tool, or a tool no operation, unless the capability is declared as one-interface-only.

#### Scenario: Operation and tool match
- **WHEN** the documentation is generated
- **THEN** each operation page names its MCP tool, its input schema and the request and response of the scenarios that call both

#### Scenario: Mismatch
- **WHEN** an operation has no MCP tool and is not declared HTTP-only
- **THEN** the check fails and names the operation

### Requirement: Concrete, runnable documentation
Every documented step SHALL be concrete. A step that sends the reader to a page SHALL give its full URL. A step that makes an API call SHALL give a complete `curl` command with the scheme and domain, method, path, headers (including the authorization header with a clearly marked token placeholder) and body, together with the real response. A step that makes an MCP call SHALL give the endpoint URL and a complete request. The end-to-end scenarios run against localhost, but the documented URLs SHALL be the factual public URLs of the console, the API and the MCP endpoint, read from configuration (one setting per surface, supplied by the user). The generated commands SHALL be the ones the scenario ran with the localhost origin replaced by the factual URL, and while a factual URL is not configured the documentation SHALL show the localhost URL from the config and a visible warning on every page that the public URL is not set yet (user decision, 2026-10-31). No domain SHALL be invented.

#### Scenario: Console step with a URL
- **WHEN** a console step opens a page
- **THEN** the step shows the full URL of that page

#### Scenario: API step with curl
- **WHEN** an API step is generated
- **THEN** it shows a complete `curl` command with the domain and headers, and the response

#### Scenario: Vague step
- **WHEN** a generated step has a "where" with no URL or an API call with no domain
- **THEN** the documentation check fails and names the page and step

### Requirement: Documentation is well explained
Each generated page SHALL open with what the reader can do and what they need first (token, scope, base URL), explain each step in plain language, and end with what to do next or where to look when it fails.

#### Scenario: Page structure
- **WHEN** a page is generated
- **THEN** it has the goal, the prerequisites, the steps and the troubleshooting link, and the plain-language check passes

### Requirement: Everything is asynchronous and lazy
Source code SHALL NOT call a synchronous API (any call whose name ends in `Sync`), and SHALL NOT create a `Map`, `Set`, `WeakMap` or `WeakSet` at module, class-field or constructor level outside `packages/store`. State that outlives a call SHALL live in a bounded store. Calls and heavy imports at module level are reported as warnings, not failures. The `structure` job SHALL enforce the blocking part at pre-commit.

#### Scenario: Synchronous call
- **WHEN** a file calls `readFileSync`, `existsSync` or `Bun.spawnSync`
- **THEN** the `structure` job fails with the rule `sync-api` and names the file and line

#### Scenario: Long-lived collection
- **WHEN** a file creates a `Map` at module level outside `packages/store`
- **THEN** the `structure` job fails with the rule `eager-collection`

#### Scenario: Eager invocation
- **WHEN** a module calls a function at module level or imports a heavy module statically
- **THEN** the `structure` job prints a warning (`eager-invocation`, `heavy-import`) and does not fail

### Requirement: There are no comments
No file the repository holds SHALL contain a comment: TypeScript and TSX, YAML, TOML, Markdown and MDX (HTML and `{/* */}` comments), HTML, JSON, CSS, Grit, `.gitignore`, `.env.example`, `CODEOWNERS`. A tool that must be told to look away is configured in the tool's configuration file, never inline. The `comments` job SHALL wipe comments from staged files, the `structure` job SHALL fail if any remain, and dprint SHALL fail its check and remove the comments when formatting for the file types it does not own, through its `exec` plugin.

#### Scenario: Comment in a staged file
- **WHEN** a staged file of any listed type holds a comment
- **THEN** the `comments` job removes it and the commit proceeds with the file restaged

#### Scenario: Comment left in the tree
- **WHEN** a file of any listed type holds a comment and the wipe has not run
- **THEN** the `structure` job fails with the rule `no-comments` and names the file and line

#### Scenario: Text that looks like a comment
- **WHEN** a string, a URL or a fenced or inline code sample holds `//`, `/*` or `<!--`
- **THEN** it is left unchanged

#### Scenario: dprint
- **WHEN** `dprint check` runs on a TypeScript file that holds a comment
- **THEN** it reports the file as not formatted and `dprint fmt` removes the comment

### Requirement: Every data shape is a Zod schema
Every interface or type literal in `packages/types` that holds only data (primitives, literals, arrays, unions and other inferred schema types) SHALL be declared as a Zod schema and exported as `z.infer` of it. Interfaces that hold methods, functions, generics or instances of contracts stay interfaces.

#### Scenario: Data interface
- **WHEN** `packages/types` declares `interface A { a: string }`
- **THEN** the `schemas` job fails and names the type, file and line

#### Scenario: Contract interface
- **WHEN** `packages/types` declares an interface with a method
- **THEN** the `schemas` job passes

### Requirement: Every development rule runs at pre-commit and blocks
Every development rule in `DEV_RULES.md` SHALL be backed by a job in the `pre-commit` section of `lefthook.yml` that blocks the commit, including the rule registry check, the workflow check, the type check, the dead-code check, the schema check and the error-case check. A verify step with no pre-commit job SHALL be listed as pre-push only in `PRE_PUSH_ONLY_STEPS`; the listed steps are the unit and integration tests, the end-to-end tests, the console tests and the dependency audit.

#### Scenario: Verify step without a pre-commit job
- **WHEN** a verify step is neither backed by a pre-commit job nor listed as pre-push only
- **THEN** the rules test fails and names the step

### Requirement: Every operation and error reason is shown in a generated page
Every operation in `openapi/baseline.json` SHALL appear in a generated page as a call, and every error reason the document lists SHALL appear in a generated page as an expected reason, except the reasons listed in `UNREACHABLE_REASONS`, which are reasons no schema in the API can produce. The `error-cases` job SHALL fail otherwise. A scenario that sends a body above a batch limit SHALL send the real request and render a truncated body, and the page SHALL state that the body is truncated.

#### Scenario: Reason not shown
- **WHEN** the document lists a reason and no generated page shows it
- **THEN** the `error-cases` job fails and names the reason

#### Scenario: Operation never called
- **WHEN** an operation has no generated call
- **THEN** the `error-cases` job fails and names the operation

#### Scenario: Truncated batch body
- **WHEN** a scenario sends 1001 items to a batch operation
- **THEN** the server answers BATCH_TOO_LARGE and the page shows two items with the statement that the body is truncated

### Requirement: A browser-only defect fails the run
An end-to-end test SHALL build a temporary copy of the console source that uses the Node `Buffer` in browser code, run the sign-in scenario against it, and expect the run to fail with the page error and publish nothing. The real console source SHALL NOT change.

#### Scenario: Buffer in the browser
- **WHEN** the copy is built and the sign-in scenario runs
- **THEN** the run fails with "Buffer is not defined" and no page or screenshot is written

### Requirement: URLs and hosts live in the config package
Every URL, origin, host name and port used by the platform, the tests, the scenarios and the documentation SHALL be defined in the config package, validated by a Zod schema, and imported from there. For each surface (console, API, MCP endpoint, documentation site) the config SHALL hold both the localhost value the end-to-end tests use and the factual public value the documentation shows. A blocking pre-commit check SHALL fail on any URL, origin, `localhost`, loopback address or host literal outside the config package, and on any such constant left in the constants package.

#### Scenario: URL literal in source
- **WHEN** a source or test file contains a `http://`, `https://`, `localhost` or `127.0.0.1` literal outside packages/config
- **THEN** the check fails and names the file and line

#### Scenario: Missing factual URL
- **WHEN** a factual public URL is not configured
- **THEN** the generated pages show the localhost URL from the config and a warning that names the missing setting, and the build does not fail

#### Scenario: Localhost for tests
- **WHEN** the end-to-end suites start the system
- **THEN** they read the localhost origins from the config package, and the generated docs show the factual public URLs
