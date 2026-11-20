import type { McpRequestContext } from "@modelcontextprotocol/server";
import { McpServer } from "@modelcontextprotocol/server";
import { isCallable, principalFromAuthInfo } from "@platform/auth";
import { cacheHintFor } from "@platform/cache";
import {
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_TASKS_EXTENSION,
  McpMethod,
  TransportKind,
} from "@platform/constants";
import { createSkillsExtension } from "@platform/skill-protocol";
import { filterAsync } from "@platform/store";
import {
  ANONYMOUS_PRINCIPAL,
  type Capability,
  type McpAppOptions,
  type McpTaskRegistry,
  type Principal,
} from "@platform/types";
import { all } from "@platform/util";
import { registerAssetResources } from "./assets.ts";
import { registerStateResource } from "./events.ts";
import { registerMcpTasks } from "./task-methods.ts";
import { annotationsFor, toolHandler } from "./tools.ts";

const STATE_CAPABILITIES = { resources: { subscribe: true } };

export async function principalOf(context: McpRequestContext): Promise<Principal> {
  return context.authInfo === undefined
    ? ANONYMOUS_PRINCIPAL
    : await principalFromAuthInfo({
        ...context.authInfo,
        expiresAt: context.authInfo.expiresAt ?? 0,
      });
}

async function offered(
  capabilities: readonly Capability[],
  options: McpAppOptions,
  principal: Principal,
): Promise<Capability[]> {
  const flags = await all(
    capabilities.map(
      (capability) => async () =>
        (await isCallable(capability.auth, principal, options.auth.enabled)) &&
        (await options.visible(capability, principal)),
    ),
  );
  return filterAsync(
    capabilities,
    async (capability, index) =>
      flags[index] === true && capability.onlyOver !== TransportKind.Http,
  );
}

export async function buildServer(
  options: McpAppOptions,
  context: McpRequestContext,
  tasks?: McpTaskRegistry,
): Promise<McpServer> {
  const hint = await cacheHintFor(undefined);
  const hints = { [McpMethod.ToolsList]: hint, [McpMethod.ServerDiscover]: hint };
  const extensions = { [MCP_TASKS_EXTENSION]: {} };
  const serverCapabilities = {
    ...STATE_CAPABILITIES,
    ...(tasks === undefined ? {} : { extensions }),
  };
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    {
      capabilities: serverCapabilities,
      cacheHints: hints,
    },
  );
  const principal = await principalOf(context);
  const requestId = crypto.randomUUID();
  const capabilities = await offered(await options.source.list(), options, principal);
  for (const capability of capabilities) {
    server.registerTool(
      capability.id,
      {
        title: capability.summary,
        description: capability.description,
        inputSchema: capability.input as never,
        outputSchema: capability.output as never,
        annotations: await annotationsFor(capability),
      },
      (await toolHandler(
        capability,
        options.invoke,
        principal,
        options.auth.enabled,
        requestId,
        tasks,
      )) as never,
    );
    await registerStateResource(
      server,
      capability,
      options.invoke,
      principal,
      options.auth.enabled,
      requestId,
    );
  }
  await registerAssetResources(server, capabilities, options.invoke, {
    principal,
    requestId,
    transport: TransportKind.Mcp,
    authEnabled: options.auth.enabled,
  });
  if (tasks !== undefined)
    await registerMcpTasks(server, tasks, {
      principal,
      requestId,
      transport: TransportKind.Mcp,
      authEnabled: options.auth.enabled,
    });
  const skills = await createSkillsExtension({
    source: options.source,
    visible: options.visible,
    allowed: options.allowed,
    authEnabled: options.auth.enabled,
    skillDirs: options.skillDirs,
  });
  skills.attach(server);
  return server;
}
