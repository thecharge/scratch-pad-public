# @platform/api

The API application. `src/registry.ts` registers every capability as a loader, so a capability's module is imported only when a request, the OpenAPI generator or the MCP adapter first needs it. The HTTP adapter, the MCP adapter and the OpenAPI document all read this one registry.
