# @platform/test-scenarios

Scenario building blocks. Third layer of the testing stack: it may depend on `@platform/test-factories` and `@platform/test-framework`, and also uses the product and client packages required by its scenarios.

- `makeDir`, `writeFiles`, `copyConfigs`, `copyPlugins`, `writeBiomeConfig`, `removeAll` build throw-away repositories for the gate tests.
- `startHarness` starts the test stack with a throw-away issuer and an isolated scripted MCP client on the edge network. Every scripted request and the independent state check go through Caddy.
- `llmScenarios` and `parseTranscript` describe and read the language-model scenarios; `mcp-llm-check.ts` checks the harness with scripted calls and injected stubs (`bun run mcp:llm-check`); it never calls a model.
