# @platform/test-custom-capability

A fixture package that shows what a user adds to the platform and proves each addition is served and conformant.

- `greetingCapability` is a capability: one definition served as an HTTP route, an MCP tool and an OpenAPI operation.
- `shoutCapability` is a tool-only item: it declares `onlyOver: mcp`, so it is an MCP tool and has no HTTP route and no OpenAPI operation.
- `GREETING_SKILL_DIRS` points at a skill package with one skill, `greeting-guide`, served through the Skills extension and the skills tools.
- `customCapabilities()` lists the two capabilities so `createApi` can serve them through its `extraCapabilities` option.
