import { expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/server";
import { MCP_META_KEYS, MCP_TASKS_EXTENSION, TransportKind } from "@platform/constants";
import { positive, rejected, seen, unit } from "@platform/test-factories";
import { thrownBy } from "@platform/test-framework";
import {
  ANONYMOUS_PRINCIPAL,
  type CapabilityContext,
  type McpTaskRegistry,
  type TestCall,
} from "@platform/types";
import { registerMcpTasks } from "../../../packages/mcp-adapter/src/task-methods.ts";

const CONTEXT: CapabilityContext = {
  principal: ANONYMOUS_PRINCIPAL,
  requestId: "task-methods",
  transport: TransportKind.Mcp,
  authEnabled: false,
};
const extensions = { [MCP_TASKS_EXTENSION]: {} };
const envelope = { [MCP_META_KEYS.clientCapabilities]: { extensions } };
const REQUEST = { mcpReq: { envelope } };
const TASK = { taskId: "one" };
const EMPTY_ENVELOPE = {};
const UNDECLARED = { mcpReq: { envelope: EMPTY_ENVELOPE } } as never;
const calls: unknown[][] = [];
const server = { setRequestHandler: (...args: unknown[]) => calls.push(args) };
const SERVER = { server } as unknown as McpServer;
const registryCalls: string[] = [];
const REGISTRY = {
  get: async (id: string) => {
    registryCalls.push(id);
    return TASK;
  },
  cancel: async (id: string) => {
    registryCalls.push(id);
  },
  update: async (id: string) => {
    registryCalls.push(id);
  },
} as unknown as McpTaskRegistry;
const callback = (index: number, request = REQUEST) =>
  Reflect.apply(calls[index]?.[2] as TestCall, undefined, [TASK, request]);

unit(registerMcpTasks, {
  positive: [
    positive(
      "registers get, cancel and update methods",
      [SERVER, REGISTRY, CONTEXT],
      seen(
        () => calls.slice(0, 3).map((call) => call[0]),
        ["tasks/get", "tasks/cancel", "tasks/update"],
      ),
    ),
    positive(
      "polls through the registered task registry",
      [SERVER, REGISTRY, CONTEXT],
      seen(() => callback(0), TASK),
    ),
  ],
  negative: [
    rejected(
      "polling without a per-request extension is refused",
      [SERVER, REGISTRY, CONTEXT],
      seen(
        () => thrownBy(() => callback(0, UNDECLARED)),
        expect.objectContaining({ code: -32021 }),
      ),
    ),
    rejected(
      "cancellation without a per-request extension is refused",
      [SERVER, REGISTRY, CONTEXT],
      seen(
        () => thrownBy(() => callback(1, UNDECLARED)),
        expect.objectContaining({ code: -32021 }),
      ),
    ),
  ],
});

test.each([1, 2])("task mutation handler %s acknowledges the registry action", async (index) => {
  await registerMcpTasks(SERVER, REGISTRY, CONTEXT);
  expect(await callback(index)).toEqual({});
  expect(registryCalls.at(-1)).toBe("one");
});

test("task update also refuses an undeclared extension", async () => {
  await registerMcpTasks(SERVER, REGISTRY, CONTEXT);
  await expect(callback(2, UNDECLARED)).rejects.toMatchObject({
    code: -32021,
  });
});
