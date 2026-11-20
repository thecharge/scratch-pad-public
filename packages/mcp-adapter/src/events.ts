import { type McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { buildResourceName, toWire } from "@platform/aip";
import { STATE_MIME_TYPE, STATE_URI_SCHEME, TransportKind } from "@platform/constants";
import type { Capability, CapabilityContext, Invoke, Principal } from "@platform/types";

export async function registerStateResource(
  server: McpServer,
  capability: Capability,
  invoke: Invoke,
  principal: Principal,
  authEnabled: boolean,
  requestId: string,
): Promise<void> {
  if (capability.events === undefined) {
    return;
  }
  const context: CapabilityContext = {
    principal,
    requestId,
    transport: TransportKind.Mcp,
    authEnabled,
  };
  server.registerResource(
    capability.id,
    new ResourceTemplate(STATE_URI_SCHEME + capability.resource, { list: undefined }),
    { title: capability.summary, description: capability.description, mimeType: STATE_MIME_TYPE },
    async (uri, variables) => {
      const name = await buildResourceName(
        capability.resource,
        variables as Record<string, string>,
      );
      const result = await invoke(capability, { name }, context);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: STATE_MIME_TYPE,
            text: JSON.stringify(await toWire(result.output)),
          },
        ],
      };
    },
  );
}
