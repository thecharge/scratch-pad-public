import { strict as assert } from "node:assert";
import { resultFromTaskOutcome } from "@modelcontextprotocol/ext-tasks/client";
import {
  CheckKind,
  MCP_META_KEYS,
  MCP_PROTOCOL_VERSION,
  MCP_TASKS_EXTENSION,
  TransportKind,
} from "@platform/constants";
import { JsonObjectSchema } from "@platform/types";
import { connectMcpTasks } from "./mcp-task-client.ts";

const origin = Bun.env.TEST_MCP_ORIGIN ?? "";
const token = Bun.env.TEST_MCP_TOKEN ?? "";
const { client, session, rawDispatch, exchanges, flush } = await connectMcpTasks(origin, token);
const proof: Record<string, unknown> = {};
try {
  const tools = await client.listTools();
  assert(tools.tools.some((tool) => tool.name === "books.reindex"));
  const bookId = "mcp-task-proof";
  const created = await client.callTool({
    name: "books.create",
    arguments: { parent: "publishers/acme", bookId, title: "MCP task proof" },
  });
  assert.notEqual(created.isError, true);
  const requests = Array.from({ length: 128 }, (_, index) => ({
    bookId: `${bookId}-${index}`,
    title: "MCP task workload",
  }));
  const batch = await client.callTool({
    name: "books.batchCreate",
    arguments: { parent: "publishers/acme", requests },
  });
  assert.notEqual(batch.isError, true);
  const execution = await session.callTool("books.reindex", { parent: "publishers/acme" });
  assert.equal(execution.kind, "task");
  const completed = resultFromTaskOutcome((await execution.settle()).outcome);
  assert.equal(completed.isError, false);
  assert.equal(JsonObjectSchema.parse(completed.structuredContent).done, true);
  proof.completed = completed;
  const cancelling = await session.callTool("books.reindex", { parent: "publishers/acme" });
  await cancelling.cancel();
  assert.equal((await cancelling.settle()).outcome.status, "cancelled");
  proof.cancelled = true;
  const start = await client.callTool({
    name: "books.reindex",
    arguments: { parent: "publishers/acme" },
  });
  const operation = JsonObjectSchema.parse(start.structuredContent);
  const progress: number[] = [];
  const waited = await client.callTool(
    { name: "operations.wait", arguments: { name: operation.name, timeout: "2s" } },
    {
      onprogress: (value) => {
        progress.push(value.progress);
      },
    },
  );
  assert.equal(JsonObjectSchema.parse(waited.structuredContent).done, true);
  assert(progress.length > 1);
  assert(progress.every((value, index) => value >= (progress[index - 1] ?? 0)));
  assert(progress.some((value) => value > 0 && value < 129));
  assert.equal(progress.at(-1), 129);
  proof.progress = progress;
  const extensions = { [MCP_TASKS_EXTENSION]: {} };
  const capabilities = { extensions };
  const meta = {
    [MCP_META_KEYS.protocolVersion]: MCP_PROTOCOL_VERSION,
    [MCP_META_KEYS.clientInfo]: { name: "proxy-proof", version: "1" },
    [MCP_META_KEYS.clientCapabilities]: capabilities,
  };
  const discovery = await rawDispatch({ method: "server/discover", params: { _meta: meta } });
  assert.equal(discovery.kind, "result");
  proof.discovery = discovery;
  const refused = await fetch(`${origin}/mcp`);
  assert.equal(refused.status, 405);
  const missing = await rawDispatch({
    method: "tasks/get",
    params: { taskId: "missing", _meta: meta },
  });
  assert.equal(missing.kind, "error");
  proof.unknownTask = missing;
  const skills = await client.callTool({ name: "skills.list", arguments: {} });
  assert.notEqual(skills.isError, true);
  const skill = await client.callTool({ name: "skills.get", arguments: { name: "skills/books" } });
  assert.notEqual(skill.isError, true);
  proof.skills = { list: skills, get: skill };
  const rpcHeaders = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": MCP_PROTOCOL_VERSION,
    "mcp-method": "tools/call",
    "mcp-name": "books.reindex",
  };
  const protectedParams = {
    name: "books.reindex",
    arguments: { parent: "publishers/acme" },
    _meta: meta,
  };
  const protectedBody = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: protectedParams,
  });
  const anonymous = await fetch(`${origin}/mcp`, {
    method: "POST",
    headers: rpcHeaders,
    body: protectedBody,
  });
  assert.equal(anonymous.status, 401);
  assert(anonymous.headers.get("www-authenticate")?.includes("resource_metadata"));
  exchanges.push({
    transport: TransportKind.Mcp,
    description: "Refuse a protected call without a token",
    request: "POST /mcp",
    requestBody: protectedBody,
    headers: rpcHeaders,
    authorized: false,
    failed: false,
    status: anonymous.status,
    response: await anonymous.text(),
    challenge: anonymous.headers.get("www-authenticate") ?? "",
  });
  proof.authentication = {
    status: anonymous.status,
    challenge: anonymous.headers.get("www-authenticate"),
  };
  const watchedStart = await client.callTool({
    name: "books.reindex",
    arguments: { parent: "publishers/acme" },
  });
  const watched = JsonObjectSchema.parse(watchedStart.structuredContent);
  const resourceSubscriptions = [`state://${String(watched.name)}`];
  const notifications = { resourceSubscriptions };
  const subscriptionParams = { notifications, _meta: meta };
  const subscribing = await fetch(`${origin}/mcp`, {
    method: "POST",
    headers: {
      ...rpcHeaders,
      authorization: `Bearer ${token}`,
      "mcp-method": "subscriptions/listen",
      "mcp-name": "",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "subscriptions/listen",
      params: subscriptionParams,
    }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(subscribing.status, 200);
  assert.equal(subscribing.headers.get("mcp-session-id"), null);
  const reader = subscribing.body?.getReader();
  assert(reader);
  const acknowledgement = new TextDecoder().decode((await reader.read()).value);
  assert(acknowledgement.includes("notifications/subscriptions/acknowledged"));
  const update = new TextDecoder().decode((await reader.read()).value);
  assert(update.includes("notifications/resources/updated"));
  await reader.cancel();
  proof.subscription = { acknowledgement, update };
  exchanges.push({
    transport: TransportKind.Mcp,
    description: "Acknowledge a subscription before sending its resource update",
    request: "POST /mcp",
    requestBody: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "subscriptions/listen",
      params: subscriptionParams,
    }),
    headers: { ...rpcHeaders, "mcp-method": "subscriptions/listen", "mcp-name": "" },
    authorized: true,
    failed: false,
    status: subscribing.status,
    response: acknowledgement + update,
    checks: [
      {
        kind: CheckKind.Stream,
        label: "The acknowledgement arrives before the resource update.",
        passed: true,
      },
      { kind: CheckKind.Outcome, label: "The response has no MCP session header.", passed: true },
    ],
  });

  const inspector = new URL(
    "../../apps/api/node_modules/@modelcontextprotocol/inspector/clients/cli/build/index.js",
    import.meta.url,
  ).pathname;
  const child = Bun.spawn(
    [
      "bun",
      inspector,
      `${origin}/mcp`,
      "--header",
      `Authorization: Bearer ${token}`,
      "--protocol-era",
      "modern",
      "--method",
      "tools/call",
      "--tool-name",
      "books.reindex",
      "--tool-arg",
      "parent=publishers/acme",
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const output = await new Response(child.stdout).text();
  const errors = await new Response(child.stderr).text();
  assert.equal(await child.exited, 0, errors);
  const inspected = JsonObjectSchema.parse(JSON.parse(output));
  assert.equal(JsonObjectSchema.parse(inspected.structuredContent).done, true);
  proof.inspector = inspected;
  await flush();
  const progressExchange = exchanges.find((exchange) =>
    exchange.response.includes("notifications/progress"),
  );
  assert(progressExchange);
  progressExchange.checks?.push({
    kind: CheckKind.Stream,
    label: "Progress is monotonic, includes intermediate work and ends at 129.",
    passed: true,
  });
  proof.exchanges = exchanges;
} finally {
  await session.close();
  await client.close();
}
process.stdout.write(JSON.stringify(proof));
