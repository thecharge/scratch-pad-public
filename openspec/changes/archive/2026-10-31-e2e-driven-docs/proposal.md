## Why

The user rejected the documentation: the behavior documentation is not driven by the end-to-end tests. Verified in the repository on 2026-10-31: the console pages (`apps/docs/src/content/docs/kb/console-*.mdx`) hold only a heading and a screenshot per step, with no pass/fail flag and no statement of what the step checked. The API and MCP pages show request and response but also carry no flag and no checks. The hand-written guides under `apps/docs/src/content/docs/guides/` are untouched.

## What Changes

The user's requirements, as stated:

1. The hand-written documentation is rejected.
2. When an end-to-end test case handles the admin panel, every step is added to the docs. The test case and suite carry a flag and a description per step, so the documentation is driven by the test.
3. The same applies to the API.
4. The same applies to MCP.

Changes:
- Every step of every console, API and MCP scenario is generated into the docs with a pass/fail flag, a description, and the list of checks it made.
- A scenario that fails publishes nothing.
- The docs site (`apps/docs`) holds only product documentation for clients: UI and API calls, API handling, troubleshooting, general, OpenAPI, SDK usage and the product knowledge base.
- Guidelines, architecture, development, end-to-end and "how it is done" documents are repo documents under `docs/`, not on the site. Moved from the site on 2026-10-31: `architecture.md`, `standards.md`, `running-verify.md`, `enabling-ci.md`.
- The generated pages, screenshots and report are visible in the docs navigation.
- All of it is traced back to the specs in this change.

Decision from the user (2026-10-31): the split above. Product pages stay on the site; development pages live in the repo.

Further requirements from the user (2026-10-31), verbatim in substance:

5. Screenshots must be focused on what is being done. (Verified: today they are whole-page captures; the user reports images are not shown.)
6. Documentation has descriptions and more text generated with it: a dedicated documentation test-case type with its own handling, so a reader knows where to go, what to click, and what is expected.
7. Documentation has categories.
8. API documentation is organized under every critique (every operation / error case).
9. Documentation is strict and follows ISO 24495 (plain language).
10. Feature flags with OpenFeature must exist and be documented. (Verified: no feature-flag code exists in the repository.)
11. API versioning as per AIP: v1, v1alpha, v1beta and so on, with the version documented. (Verified: the path is `/v1` only; no `v1alpha` or `v1beta` exists in code.)
12. The OpenAPI documentation must be in the docs site. (Verified: `apps/docs/src/content/docs/reference` holds only http, mcp and skills.)
13. The SDK documentation must be in the docs site. (Verified: only a `guides/sdk.md` page exists, with no SDK reference.)
14. API end-to-end tests and suites, and SDK suites and tests, must exist. (Verified: API has integration files and two e2e files `main` and `startup`; the SDK has one integration file; no suite exercises the shipped SDK.)
15. The SDK has a separate build and ships as a standalone package. (Verified: `packages/sdk/package.json` is `private: true`, exports TypeScript source, has no build script, and depends on `workspace:*` packages.)
16. Documentation handling exists for the SDK and in general: the SDK build and its documentation are produced and checked like the rest. (Verified: only `guides/sdk.md` and a README exist.)
17. Testing has a dedicated folder, a test framework, stacked packages for testing scenarios, and full coverage (user, 2026-10-31; overrules the per-package test layout).
18. Strict unit-test rule "2x2" with `it.each` and factories: every unit has at least 2 positive and 2 negative tests (user's answer: "Every unit has negative and positive test by 2"). Unit tests use `test.each` tables built from factories. Source: the user stated it in an earlier session ("tests 2x2 it each not used, bs test cases just to say you have lines", session journal 0b2b7d1e, 2026-10-31). It was never carried into DEV_RULES.md or the dev-standards spec, which only say flat tests and `test.each`. That was my omission.
19. Coverage threshold: 100% of lines, branches and functions, blocking (user's answer). Revised by the user on 2026-10-31: Bun's lines and functions coverage is the measure and 100% branches is not measured (item 26); the step is report-only until the unit debt is cleared (item 27).
20. Most documentation is auto-generated from the tests, OpenAPI included (user, 2026-10-31: "most of the documentation I expect to be auto generated from the tests right - including openapi"). Verified: the OpenAPI pages (`openapi/v1.md`, `v1beta.md`, `v1alpha.md`) are generated from `openapi/baseline.json`, not from test results; the `general/` pages and `sdk-usage/sdk.md` are hand-written.
21. The OpenAPI document is auto-generated from the API and MCP (user, 2026-10-31: "openapi is auto generated from the api and mcp"). Verified: `generateOpenApi` builds the document from the capability definitions that also drive the HTTP and MCP adapters, `/openapi.json` is served by the API, and `openapi/baseline.json` is a committed snapshot. The OpenAPI docs pages are read from that snapshot, not from the running API, and MCP appears nowhere in the OpenAPI pages. Interpretation (mine, open to correction): the docs read the document from the running API and show the MCP tool of each operation from the running MCP server, and a check ties the two together.
22. Documentation must not be sterile or vague (user, 2026-10-31): where a step says go to a page, the page has a URL; where it says make a curl call, the call has a domain; all of it documented well. Verified in the generated pages today: console steps say "The console address in the browser" and "The console start page" with no URL; API steps say `POST /v1/publishers/acme/books?bookId=dune` with no domain, no curl and no headers (the book-lifecycle page contains no `curl`, `http://` or `https://`).

23. Correction from the user (2026-10-31): the end-to-end tests may run on localhost, but the factual URL in the documentation can be another. The documented URLs are the factual ones, from configuration; the localhost origin is replaced. My earlier wording ("one base URL replaced by a placeholder") was wrong on this point.
24. Addition from the user (2026-10-31): localhost is also configured, and all of these URLs MUST live in the config package; "there should have been rules for that on precommit". Verified: `packages/config` holds only `load.ts` and `index.ts`; URL and origin literals (for example `LOOPBACK_ORIGIN`) live in `packages/constants`, and no pre-commit rule requires URLs or hosts to come from the config package.

25. Decision from the user (2026-10-31): until the factual public URLs are set, the docs show the localhost URLs from the config with a visible warning, and the build does not fail.
26. Decision from the user (2026-10-31): Bun's lines and functions coverage is the measure; 100% branches is not measured. The coverage requirement says 100% of lines and functions.
27. Decision from the user (2026-10-31): land now with the coverage step report-only (it lists the failing files and the unit-debt count and exits 0) until the debt is cleared (task 7.6), then flip it to blocking with one constant. The 2x2 check stays blocking with its shrink-only debt list.

28. Skills can be authored in a package and served (user, 2026-10-31): "The skill:// protocol does not and must not prevent me to write skills in a package and be able to present it in the endpoint so LLM can use it". Verified: the `skill-protocol` spec says only "a `SkillSource` generated from the capability registry"; no requirement and no code serve skills from a package; the sentence "Skills are generated from the capability registry, never written by hand" in `docs/quickstart-agent.md` was our own wording, not the user's, and is wrong as a rule. The user also asks what happens when they define a tool or another item, and how that relates to full MCP compliance; neither is documented today.
29. Every function is asynchronous, with an ignore mechanism (user, 2026-10-31: "I said in the very beginning that every function must be async; if there is a need it must have an ignore mechanism"). First stated in the first session journal (0b2b7d1e, "all must be lazy loaded and async one anti pattern i see that none is async"). Verified: the enforced rule `sync-api` only bans calls whose name ends in `Sync`, and `eager-collection` bans module-level collections; nothing fails a function that is not asynchronous, and no ignore list for that exists. The earlier requirement text "Everything is asynchronous and lazy" in this change repeated that weaker rule.

## Capabilities

### New Capabilities
- `test-driven-docs`: documentation of console, API and MCP behavior is generated per step, with a flag, description and checks, from the end-to-end suites; a documentation test-case type; categories; focused screenshots; strict plain-language rules; OpenAPI and SDK reference in the site
- `feature-flags`: feature flags through OpenFeature, documented
- `api-versioning`: AIP versioning with `v1`, `v1alpha` and `v1beta` paths, documented

### Modified Capabilities

## Impact

`packages/kb-recorder` (scenario types, runners, page rendering), `packages/types/src/kb.ts`, `packages/messages`, `packages/constants`, `apps/docs` (navigation and removed guides), `tooling/scripts/build-docs.ts`, `DEV_RULES.md`.
