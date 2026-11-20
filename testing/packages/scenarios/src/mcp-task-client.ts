import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import {
  createTaskSessionFromClient,
  type RawClientDispatch,
} from "@modelcontextprotocol/ext-tasks/client";
import { toJsonValue } from "@modelcontextprotocol/ext-tasks/core";
import {
  CheckKind,
  MCP_PROTOCOL_VERSION,
  MCP_TASKS_EXTENSION,
  TransportKind,
} from "@platform/constants";
import { type Exchange, JsonObjectSchema } from "@platform/types";
import { all } from "@platform/util";

const clientInfo = { name: "tasks-acceptance", version: "1" };
const extensions = { [MCP_TASKS_EXTENSION]: {} };
const clientCapabilities = { extensions };
export async function connectMcpTasks(origin: string, token: string) {
  const authorization = `Bearer ${token}`;
  const exchanges: Exchange[] = [];
  const captures: Promise<void>[] = [];
  const capture = async (request: Request, response: Response) => {
    const requestBody = await request.text();
    const rpc = JsonObjectSchema.parse(JSON.parse(requestBody));
    const params = JsonObjectSchema.parse(rpc.params ?? {});
    const headers = Object.fromEntries(
      [...request.headers].filter(([name]) => name !== "authorization"),
    );
    exchanges.push({
      transport: TransportKind.Mcp,
      description: [rpc.method, params.name].filter(Boolean).join(" "),
      request: `${request.method} /mcp`,
      requestBody,
      headers,
      authorized: request.headers.has("authorization"),
      failed: !response.ok,
      status: response.status,
      response: await response.text(),
      checks: [
        { kind: CheckKind.Outcome, label: `HTTP ${response.status}`, passed: response.ok },
        {
          kind: CheckKind.Outcome,
          label: "The response has no MCP session header.",
          passed: !response.headers.has("mcp-session-id"),
        },
      ],
    });
  };
  const observedFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const sent = request.clone();
    const response = await fetch(request);
    captures.push(capture(sent, response.clone()));
    return response;
  };

  const mode = { pin: MCP_PROTOCOL_VERSION };
  const client = new Client(clientInfo, { versionNegotiation: { mode } });
  const headers = { authorization };
  const requestInit = { headers };
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), {
      requestInit,
      fetch: observedFetch,
    }),
  );
  const rawDispatch: RawClientDispatch = async (request, options) => {
    const call = JsonObjectSchema.parse(request);
    const params = JsonObjectSchema.parse(call.params);
    const headers = {
      authorization,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": MCP_PROTOCOL_VERSION,
      "mcp-method": String(call.method),
      "mcp-name": String(params.taskId ?? params.name ?? ""),
    };
    const response = await observedFetch(`${origin}/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), ...call }),
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
    const message = JsonObjectSchema.parse(await response.json());
    const error = JsonObjectSchema.parse(message.error ?? {});
    return message.error === undefined
      ? { kind: "result", result: toJsonValue(message.result) }
      : { kind: "error", error: { code: Number(error.code), message: String(error.message) } };
  };
  const session = createTaskSessionFromClient(client, {
    endpointId: origin,
    rawDispatch,
    v2RequestFraming: { protocolVersion: MCP_PROTOCOL_VERSION, clientInfo, clientCapabilities },
  });
  const flush = async () => all(captures.map((capture) => async () => capture));
  return { client, session, rawDispatch, exchanges, flush };
}
