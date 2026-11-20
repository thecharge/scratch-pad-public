import { afterAll, expect, test } from "bun:test";
import { resultFromTaskOutcome } from "@modelcontextprotocol/ext-tasks/client";
import {
  MCP_META_KEYS,
  MCP_PROTOCOL_VERSION,
  MCP_TASKS_EXTENSION,
  McpEra,
} from "@platform/constants";
import { ADMIN_SCOPES, tokenFor } from "@platform/test-framework";
import { JsonObjectSchema } from "@platform/types";
import { all } from "@platform/util";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";
import { connectMcpTasks } from "../../packages/scenarios/src/mcp-task-client.ts";

const stops: (() => Promise<void>)[] = [];
const clientInfo = { name: "tasks-acceptance", version: "1" };
const extensions = { [MCP_TASKS_EXTENSION]: {} };
const clientCapabilities = { extensions };
afterAll(async () => all(stops.map((stop) => async () => stop())));

async function boot() {
  const { issuer, origin } = await proxyFixture({
    enabled: true,
    domain: "tasks.test",
    era: McpEra.Reject,
    reindexStepMs: 300,
  });
  const token = await tokenFor(issuer, ADMIN_SCOPES);
  const { client, session, rawDispatch } = await connectMcpTasks(origin, token ?? "");
  stops.push(async () => client.close());
  stops.push(async () => session.close());
  await client.callTool({
    name: "books.create",
    arguments: { parent: "publishers/acme", bookId: "task-book", title: "Task book" },
  });
  return { client, session, rawDispatch, origin };
}

test("the official Tasks client receives a handle and polls the AIP operation to completion", async () => {
  const { session } = await boot();
  const execution = await session.callTool("books.reindex", { parent: "publishers/acme" });
  expect(execution.kind).toBe("task");
  const { outcome } = await execution.settle();
  const response = { count: 1 };
  expect(resultFromTaskOutcome(outcome)).toMatchObject({
    isError: false,
    structuredContent: { done: true, response },
  });
});

test("the official Tasks client cancels through the AIP operation capability", async () => {
  const { session } = await boot();
  const execution = await session.callTool("books.reindex", { parent: "publishers/acme" });
  expect(execution.kind).toBe("task");
  await execution.cancel();
  expect((await execution.settle()).outcome.status).toBe("cancelled");
});

test("a non-Tasks official client retains the ordinary operation result and receives wait progress", async () => {
  const { client } = await boot();
  const started = await client.callTool({
    name: "books.reindex",
    arguments: { parent: "publishers/acme" },
  });
  const operation = JsonObjectSchema.parse(started.structuredContent);
  const progress: number[] = [];
  const completed = await client.callTool(
    { name: "operations.wait", arguments: { name: operation.name, timeout: "2s" } },
    {
      onprogress: (value) => {
        progress.push(value.progress);
      },
    },
  );
  expect(completed.structuredContent).toMatchObject({ done: true });
  expect(progress.length).toBeGreaterThan(1);
  expect(progress[0]).toBe(0);
  expect(progress.at(-1)).toBe(1);
});

test.each([
  ["tasks/get", false, -32021],
  ["tasks/cancel", false, -32021],
  ["tasks/update", false, -32021],
  ["tasks/get", true, -32603],
  ["tasks/cancel", true, -32603],
  ["tasks/update", true, -32603],
] as const)(
  "%s is refused for an unknown task, extension declared %s",
  async (method, declare, code) => {
    const { rawDispatch } = await boot();
    const meta = {
      [MCP_META_KEYS.protocolVersion]: MCP_PROTOCOL_VERSION,
      [MCP_META_KEYS.clientInfo]: clientInfo,
      [MCP_META_KEYS.clientCapabilities]: declare ? clientCapabilities : {},
    };
    const response = await rawDispatch({
      jsonrpc: "2.0",
      id: 42,
      method,
      params: { taskId: "missing", _meta: meta },
    });
    expect(response).toMatchObject({ kind: "error", error: { code } });
  },
);

test("operations.wait returns a task immediately and polls the same AIP operation", async () => {
  const { client, session } = await boot();
  const started = await client.callTool({
    name: "books.reindex",
    arguments: { parent: "publishers/acme" },
  });
  const operation = JsonObjectSchema.parse(started.structuredContent);
  const execution = await session.callTool("operations.wait", {
    name: String(operation.name),
    timeout: "2s",
  });
  expect(execution.kind).toBe("task");
  expect(resultFromTaskOutcome((await execution.settle()).outcome)).toMatchObject({
    structuredContent: { name: operation.name, done: true },
  });
});

test.each(["tasks/get", "tasks/cancel", "tasks/update"])(
  "anonymous %s receives the protected-resource challenge",
  async (method) => {
    const { origin } = await boot();
    const meta = {
      [MCP_META_KEYS.protocolVersion]: MCP_PROTOCOL_VERSION,
      [MCP_META_KEYS.clientInfo]: clientInfo,
      [MCP_META_KEYS.clientCapabilities]: clientCapabilities,
    };
    const params = { taskId: "missing", _meta: meta };
    const response = await fetch(`${origin}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": MCP_PROTOCOL_VERSION,
        "mcp-method": method,
        "mcp-name": "missing",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata");
  },
);

afterAll(finishProxyIntegration);

test("the edge consumer cannot reach the API directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
