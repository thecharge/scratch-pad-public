import { afterAll, describe, expect, test } from "bun:test";
import { EndpointPath, HttpHeader, MediaType, STATE_URI_SCHEME } from "@platform/constants";
import { readEvents } from "@platform/streams";
import { ADMIN_SCOPES, tokenFor } from "@platform/test-framework";
import { OperationSchema } from "@platform/types";
import { z } from "zod";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const PARENT = "publishers/p1";
const PROTOCOL = "2026-07-28";
const STEP_MS = 300;
const server = await proxyFixture({
  enabled: true,
  domain: "api.test",
  reindexStepMs: STEP_MS,
});
const issuer = server.issuer;
const admin = (await tokenFor(issuer, ADMIN_SCOPES)) as string;
const ToolReplySchema = z.object({
  result: z.object({ structuredContent: z.record(z.string(), z.unknown()) }),
});
const WatchedSchema = z.object({ events: z.array(OperationSchema) });
const META = {
  "io.modelcontextprotocol/protocolVersion": PROTOCOL,
  "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" },
  "io.modelcontextprotocol/clientCapabilities": {},
};

afterAll(async () => {
  await finishProxyIntegration();
});

const BASE_HEADERS = {
  [HttpHeader.Authorization]: `Bearer ${admin}`,
  [HttpHeader.ContentType]: MediaType.Json,
  [HttpHeader.Accept]: `${MediaType.Json}, ${MediaType.EventStream}`,
  [HttpHeader.McpProtocolVersion]: PROTOCOL,
};
const nameHeader = (name?: string) => (name === undefined ? {} : { [HttpHeader.McpName]: name });
const envelope = (method: string, params: object) => ({
  jsonrpc: "2.0",
  id: 1,
  method,
  params: { ...params, _meta: META },
});

function rpc(method: string, params: object, name?: string, signal?: AbortSignal) {
  return fetch(`${server.origin}${EndpointPath.Mcp}`, {
    method: "POST",
    ...(signal === undefined ? {} : { signal }),
    headers: { ...BASE_HEADERS, [HttpHeader.McpMethod]: method, ...nameHeader(name) },
    body: JSON.stringify(envelope(method, params)),
  });
}

async function messagesOf(response: Response): Promise<unknown[]> {
  return response.headers.get(HttpHeader.ContentType)?.includes(MediaType.EventStream)
    ? (await Array.fromAsync(readEvents(response.body as ReadableStream<Uint8Array>))).map(
        (event) => event.data,
      )
    : [await response.json()];
}

async function call(tool: string, args: object) {
  const response = await rpc("tools/call", { name: tool, arguments: args }, tool);
  return ToolReplySchema.parse((await messagesOf(response)).at(-1));
}

async function startReindex() {
  await fetch(`${server.origin}/v1/${PARENT}/books?bookId=b1`, {
    method: "POST",
    headers: {
      [HttpHeader.Authorization]: `Bearer ${admin}`,
      [HttpHeader.ContentType]: MediaType.Json,
    },
    body: JSON.stringify({ title: "T" }),
  });
  const started = await call("books.reindex", { parent: PARENT });
  return OperationSchema.parse(started.result.structuredContent);
}

describe("an operation over MCP: subscription, resource and bounded watch", () => {
  test("subscriptions/listen acknowledges first, then reports updates of that operation", async () => {
    const operation = await startReindex();
    const abort = new AbortController();
    const listening = await rpc(
      "subscriptions/listen",
      { notifications: { resourceSubscriptions: [`${STATE_URI_SCHEME}${operation.name}`] } },
      undefined,
      abort.signal,
    );
    const methods: string[] = [];
    const consume = Array.fromAsync(
      readEvents(listening.body as ReadableStream<Uint8Array>),
      (message) => methods.push(JSON.stringify(message.data)),
    );
    await Bun.sleep(STEP_MS * 3);
    abort.abort();
    await consume.catch(() => undefined);
    expect(methods[0]).toContain("notifications/subscriptions/acknowledged");
    expect(methods.slice(1).join(" ")).toContain("notifications/resources/updated");
  });

  test("resources/read returns the state of the operation as JSON", async () => {
    const operation = await startReindex();
    const response = await rpc("resources/read", { uri: `${STATE_URI_SCHEME}${operation.name}` });
    const text = JSON.stringify((await messagesOf(response)).at(-1));
    expect(text).toContain(operation.name);
  });

  test("the watch tool returns the states within its bounds", async () => {
    const operation = await startReindex();
    const watched = await call("operations.watch", { name: operation.name, timeoutMs: 5000 });
    const events = WatchedSchema.parse(watched.result.structuredContent).events;
    expect([events.length > 0, events.at(-1)?.done]).toEqual([true, true]);
  });

  test("the watch tool stops at maxEvents", async () => {
    const operation = await startReindex();
    const watched = await call("operations.watch", { name: operation.name, maxEvents: 1 });
    expect(WatchedSchema.parse(watched.result.structuredContent).events.length).toBe(1);
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
