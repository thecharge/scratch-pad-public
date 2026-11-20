import { MessageId } from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync } from "@platform/store";
import type { Capability, InterfaceFindings, LiveInterfaces } from "@platform/types";
import { finish } from "./tools.ts";

export async function interfaceFindings(
  operations: readonly string[],
  tools: readonly string[],
  only: readonly string[],
): Promise<InterfaceFindings> {
  const both = async (id: string) => !only.includes(id);
  return {
    operationsWithoutTool: await filterAsync(
      operations,
      async (id) => (await both(id)) && !tools.includes(id),
    ),
    toolsWithoutOperation: await filterAsync(
      tools,
      async (id) => (await both(id)) && !operations.includes(id),
    ),
    leaks: only.filter((id) => operations.includes(id) && tools.includes(id)),
  };
}

export async function problemsOf(findings: InterfaceFindings): Promise<string[]> {
  return [
    ...findings.operationsWithoutTool.map((id) => message(MessageId.OperationWithoutTool, { id })),
    ...findings.toolsWithoutOperation.map((id) => message(MessageId.ToolWithoutOperation, { id })),
    ...findings.leaks.map((id) => message(MessageId.OnlyInterfaceLeak, { id })),
  ];
}

async function liveInterfaces(): Promise<LiveInterfaces> {
  const { fetchLiveInterfaces } = await import("@platform/kb-recorder");
  return fetchLiveInterfaces();
}

async function registered(): Promise<readonly Capability[]> {
  const { createRegistry } = await import("@platform/api/registry");
  return (await createRegistry()).list();
}

export async function checkInterfaces(
  load: () => Promise<LiveInterfaces> = liveInterfaces,
  list: () => Promise<readonly Capability[]> = registered,
): Promise<number> {
  const live = await load();
  const capabilities = await list();
  const only = capabilities
    .filter((capability) => capability.onlyOver !== undefined)
    .map(({ id }) => id);
  const operations = Object.values(live.document.paths)
    .flatMap((methods) => Object.values(methods))
    .map((operation) => operation.operationId);
  const problems = await problemsOf(
    await interfaceFindings(
      operations,
      live.tools.map((tool) => tool.name),
      only,
    ),
  );
  return finish(
    problems,
    message(MessageId.InterfacesOk, { count: operations.length - only.length, only: only.length }),
  );
}

if (import.meta.main) process.exit(await checkInterfaces());
