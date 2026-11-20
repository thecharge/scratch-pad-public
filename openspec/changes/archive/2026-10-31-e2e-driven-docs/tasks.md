## 1. Step result model

- [x] 1.1 Add `StepResult` and check schemas in packages/types and wire the runners to return them
- [x] 1.2 Console runner records each check (visible, hidden, forbidden request, token storage) with its result
- [x] 1.3 API and MCP runner record expected and actual outcome per step

## 2. Generated pages

- [x] 2.1 Render console pages from `StepResult[]` with flag, description, checks and screenshot
- [x] 2.2 Render API and MCP pages from `StepResult[]` with flag, description, expected/actual, request and response
- [x] 2.3 A failing step fails the run and publishes nothing (tests for console, HTTP and MCP)

## 3. Hand-written documentation

- [x] 3.1 Move architecture, standards, running-verify and enabling-ci from the site to `docs/` (user decision 2026-10-31)
- [x] 3.2 Add the documentation check that fails when a development page is on the site
- [x] 3.3 Make generated pages, screenshots and the report reachable from the navigation

## 4. Proof

- [x] 4.1 Run `bun run docs` and `bun run test:e2e`; open the built docs and confirm each requirement with output
- [x] 4.2 Update DEV_RULES.md; run `bun run verify`; commit and push

## 5. Further requirements (2026-10-31)

- [x] 5.1 Documentation case type with title, description, place, action, expected result, category and flag; pages rendered from it
- [x] 5.2 Categories in pages and navigation (UI, API calls, API handling, troubleshooting, general, OpenAPI, SDK usage)
- [x] 5.3 Focused (cropped) screenshots and an end-to-end check that each image loads and is not blank
- [x] 5.4 Every operation documents each success and each error case from scenarios
- [x] 5.5 Blocking plain-language check (ISO 24495-1) over all pages
- [x] 5.6 OpenAPI reference and SDK reference generated into the site
- [x] 5.7 Feature flags through OpenFeature, with scenarios and generated docs
- [x] 5.8 API versioning `v1`, `v1alpha`, `v1beta` per AIP-185, with scenarios and generated docs
- [x] 5.9 Dedicated folders per test type (unit, integration, e2e); the tiers check enforces the folder; a repository document states the locations and how each tier runs

## 6. API and SDK suites, standalone SDK

- [x] 6.1 Named API end-to-end suites over HTTP and MCP in `testing/e2e/api/` (the user's testing area replaces the `tests/` folder named earlier)
- [x] 6.2 Standalone SDK build (JS and declarations), publishable manifest, no `workspace:*` dependency; update `check-repo` so the SDK is the one publishable package
- [x] 6.3 Check that fails when the packed SDK imports a workspace package or source path
- [x] 6.4 SDK unit, integration and end-to-end suites; the end-to-end suite installs the packed tarball into an empty project and runs against the API
- [x] 6.5 SDK documentation generated from the built package and its suite; the docs build fails if either fails

## 7. Testing area, 2x2 rule, coverage

- [x] 7.1 Dedicated top-level testing area with a test framework package, factories and stacked scenario packages; move every test there
- [x] 7.2 Check that fails when a test or testing helper exists outside the testing area
- [x] 7.5 DEV_RULES rows and hook jobs for 7.2, 7.3 and 7.4
- [x] 6.6 Licensing: repository private and unlicensed; SDK only under Apache-2.0 (manifest field and LICENSE file); `check-repo` enforces both with negative tests

## 8. Tests drive the remaining documentation

- [x] 8.1 OpenAPI operation pages show the checked examples and error cases from the scenarios, and list uncovered operations, statuses and error reasons
- [x] 8.2 The documentation check fails when an operation has no passing scenario
- [x] 8.3 Replace the hand-written `general/` pages and `sdk-usage/sdk.md` with pages generated from scenarios, or remove them, and make the docs-scope check fail on a behavior page without a generated source
- [x] 8.4 OpenAPI docs generated from the running API document, with the MCP tool of each operation read from the running server; check ties operations to tools
- [x] 8.5 Concrete documentation: full URLs for console steps, complete `curl` commands with domain and headers for API steps, endpoint and request for MCP steps, one base-URL setting; a check fails on a vague step; page structure with goal, prerequisites, steps and troubleshooting link
- [x] 8.6 Move every URL, origin, host and port literal into packages/config (localhost and factual public value per surface, Zod-validated); blocking pre-commit check with DEV_RULES row and negative test; remove the constants-package copies
- [x] 8.7 Rules on pre-commit: rules, workflows, typecheck, knip, schemas, error-cases and comments jobs; verify steps without a pre-commit job are listed
- [x] 8.8 Requirements recorded: asynchronous and lazy, no comments, Zod schemas, pre-commit rules, error cases, browser-only defect
- [x] 8.9 Comment wipe covers every file type and dprint runs it through the exec plugin
- [x] 8.10 Check that data shapes in `packages/types` are Zod schemas
- [x] 8.11 Stale statements fixed in the quickstarts and READMEs
- [x] 8.12 End-to-end test: the Node `Buffer` in browser code fails the run and publishes nothing
- [x] 8.13 Documentation screenshots are focused on what the page step checks
- [x] 8.14 Every operation and error reason shown in a generated page; scenarios reach TOKEN_INVALID, TOKEN_EXPIRED, UNKNOWN_VERB, METHOD_NOT_ALLOWED, ORIGIN_NOT_ALLOWED, INTERNAL_ERROR, UNKNOWN_FIELD, BATCH_TOO_LARGE, INSUFFICIENT_SCOPE

## 9. Skills in packages, custom tools, async functions (user, 2026-10-31)


The remaining work of this change (unit 2x2 and coverage, skills in packages, custom tools, async functions) moved to the change `agent-skills-async-coverage` on 2026-10-31.
