import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { routeFor, splitInput } from "@platform/aip";
import {
  AuthScheme,
  CheckKind,
  CUSTOM_VERB_SEPARATOR,
  EndpointPath,
  Glyph,
  HTTP_BAD_REQUEST,
  HttpHeader,
  HttpMethod,
  JSONRPC_VERSION,
  KB_CLIENT_NAME,
  KB_CLIENT_VERSION,
  LISTEN_TIMEOUT_MS,
  LISTEN_UPDATES_WANTED,
  MCP_ACK_METHOD,
  MCP_META_KEYS,
  MCP_PROTOCOL_VERSION,
  MCP_UPDATED_METHOD,
  McpMethod,
  MediaType,
  MessageId,
  PROXY_BACKEND_ENV,
  PROXY_FIXTURE_UNMARKED_PATH,
  PROXY_SECRET_SHOWN,
  QUERY_SEPARATOR,
  RouteScope,
  Separator,
  STATE_URI_SCHEME,
  StepFace,
  Text,
  TRUNCATED_ITEMS,
  TransportKind,
} from "@platform/constants";
import { message } from "@platform/messages";
import { readEvents } from "@platform/streams";
import {
  type Bulk,
  type CallOutcome,
  type Capability,
  type CheckResult,
  type Exchange,
  type HttpRequestSpec,
  type JsonObject,
  JsonObjectSchema,
  type McpOutcome,
  type McpSighting,
  type ScenarioStep,
  type StreamEvent,
} from "@platform/types";
import { z } from "zod";
import { sendRaw } from "./raw.ts";

const NO_BODY_METHODS: readonly HttpMethod[] = [HttpMethod.Get, HttpMethod.Delete];
const PRETTY_INDENT = 2;

function pretty(value: unknown): string {
  return JSON.stringify(value, null, PRETTY_INDENT);
}

function authHeaders(token: string | undefined): Record<string, string> {
  const bearer = [AuthScheme.Bearer, token].join(Glyph.Space);
  return token === undefined ? {} : { [HttpHeader.Authorization]: bearer };
}

async function locate(capability: Capability, input: JsonObject): Promise<string> {
  const route = await routeFor(capability);
  const resource = String(input.name ?? input.parent ?? Text.Empty);
  const collection = route.scope === RouteScope.Collection ? [route.segments.at(-1)] : [];
  const root = route.target === undefined ? [] : [resource];
  const path = [Text.Empty, capability.version, ...root, ...collection].join(Separator.Resource);
  return route.verb === undefined ? path : [path, route.verb].join(CUSTOM_VERB_SEPARATOR);
}

async function queryOf(capability: Capability, input: JsonObject): Promise<URLSearchParams> {
  const split = await splitInput(capability, await routeFor(capability));
  const pairs = split.query.flatMap((key) =>
    [input[key]]
      .flat()
      .filter((value) => value !== undefined)
      .map((value) => [key, String(value)]),
  );
  return new URLSearchParams(pairs);
}

async function bodyOf(capability: Capability, input: JsonObject): Promise<JsonObject> {
  const split = await splitInput(capability, await routeFor(capability));
  const keys = split.body.filter((key) => key in input);
  return Object.fromEntries(keys.map((key) => [key, input[key]]));
}

function bulkItems(bulk: Bulk): JsonObject[] {
  return Array.from({ length: bulk.count }, () => bulk.item);
}

function bulkSpec(body: JsonObject, bulk: Bulk | undefined) {
  if (bulk === undefined) {
    return { body, shown: body };
  }
  const shownItems = Array.from({ length: TRUNCATED_ITEMS }, () => bulk.item);
  const note = message(MessageId.StepTruncated, { count: bulk.count, shown: TRUNCATED_ITEMS });
  return {
    body: { ...body, [bulk.field]: bulkItems(bulk) },
    shown: { ...body, [bulk.field]: shownItems },
    note,
  };
}

export async function specFor(
  capability: Capability,
  input: JsonObject,
  step: ScenarioStep,
): Promise<HttpRequestSpec> {
  if (step.raw !== undefined) {
    return { ...step.raw, shown: step.raw.body };
  }
  if (step.face === StepFace.Events) {
    const base = await locate(capability, input);
    return {
      method: HttpMethod.Get,
      path: base,
      headers: { [HttpHeader.Accept]: MediaType.EventStream },
    };
  }
  const route = await routeFor(capability);
  const query = await queryOf(capability, input);
  const base = await locate(capability, input);
  const path = query.size > 0 ? [base, query].join(QUERY_SEPARATOR) : base;
  const placeholder = step.bulk === undefined ? {} : { [step.bulk.field]: [] };
  const body = { ...(await bodyOf(capability, input)), ...(step.extraBody ?? {}), ...placeholder };
  const carries = !NO_BODY_METHODS.includes(route.method) && Object.keys(body).length > 0;
  return { method: route.method, path, ...(carries ? bulkSpec(body, step.bulk) : {}) };
}

async function doneCheck(last: JsonObject): Promise<CheckResult> {
  return {
    kind: CheckKind.Stream,
    label: message(MessageId.CheckStreamDone),
    passed: last.done === true,
  };
}

function challengeOf(response: Response) {
  const challenge = response.headers.get(HttpHeader.WwwAuthenticate);
  return challenge === null ? {} : { challenge };
}

function shownHeaders(spec: HttpRequestSpec, proxySecret?: string): Record<string, string> {
  const base: Record<string, string> = {
    [HttpHeader.Accept]: MediaType.Json,
    ...(spec.body === undefined ? {} : { [HttpHeader.ContentType]: MediaType.Json }),
    ...(proxySecret === undefined ? {} : { [HttpHeader.ProxyMarker]: PROXY_SECRET_SHOWN }),
    ...spec.headers,
  };
  return Object.fromEntries(
    Object.entries(base).filter(([name]) => !(spec.omit ?? []).includes(name)),
  );
}

function bodyBytes(body: JsonObject): Blob {
  return new Blob([JSON.stringify(body)]);
}

export async function callHttp(
  origin: string,
  token: string | undefined,
  capability: Capability,
  spec: HttpRequestSpec,
  proxySecret?: string,
): Promise<CallOutcome> {
  const shown = shownHeaders(spec, proxySecret);
  const sent = Object.fromEntries(
    Object.entries(shown).map(([name, value]) => [
      name,
      name === HttpHeader.ProxyMarker && proxySecret !== undefined ? proxySecret : value,
    ]),
  );
  const headers = { ...authHeaders(token), ...sent };
  const withoutMarker =
    Bun.env[PROXY_BACKEND_ENV] !== undefined && (spec.omit ?? []).includes(HttpHeader.ProxyMarker);
  const target = withoutMarker ? [origin, PROXY_FIXTURE_UNMARKED_PATH].join(Text.Empty) : origin;
  const response = (spec.omit ?? []).includes(HttpHeader.Accept)
    ? await sendRaw(
        target,
        spec.method,
        spec.path,
        headers,
        spec.body === undefined ? undefined : JSON.stringify(spec.body),
      )
    : await fetch([target, spec.path].join(Text.Empty), {
        method: spec.method,
        headers,
        ...(spec.body === undefined ? {} : { body: bodyBytes(spec.body) }),
      });
  const wire = await response.text();
  const streamed = response.headers.get(HttpHeader.ContentType)?.includes(MediaType.EventStream);
  const events =
    streamed === true ? await Array.fromAsync(readEvents(new Response(wire).body as never)) : [];
  const parsed = JsonObjectSchema.parse(
    streamed === true ? (events.at(-1)?.data ?? {}) : JSON.parse(wire),
  );
  const exchange: Exchange = {
    transport: TransportKind.Http,
    description: capability.summary,
    request: [spec.method, spec.path].join(Glyph.Space),
    ...(spec.shown === undefined ? {} : { requestBody: pretty(spec.shown) }),
    ...(spec.note === undefined ? {} : { note: spec.note }),
    method: spec.method,
    path: spec.path,
    headers: shown,
    authorized: token !== undefined,
    failed: !response.ok,
    status: response.status,
    ...challengeOf(response),
    response: streamed === true ? wire.trim() : pretty(parsed),
    ...(streamed === true ? { checks: [await doneCheck(parsed)] } : {}),
  };
  return { exchange, body: parsed };
}

async function methodOf(init: RequestInit | undefined): Promise<string | undefined> {
  const text = z.string().safeParse(init?.body);
  const parsed = JsonObjectSchema.safeParse(text.success ? JSON.parse(text.data) : undefined);
  return parsed.success ? String(parsed.data.method) : undefined;
}

async function watchedFetch(seen: McpSighting): Promise<typeof fetch> {
  return (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const response = await fetch(input, init);
    const refused = init?.method === HttpMethod.Post && !response.ok && seen.status === undefined;
    const called = (await methodOf(init)) === McpMethod.ToolsCall;
    if (refused || (called && seen.status === undefined)) {
      seen.status = response.status;
      seen.body = await response.clone().text();
      seen.challenge = response.headers.get(HttpHeader.WwwAuthenticate) ?? undefined;
    }
    return response;
  }) as typeof fetch;
}

const StateContentSchema = z.object({ text: z.string() });

async function readState(client: Client, uri: string): Promise<McpOutcome> {
  const read = await client.readResource({ uri });
  const content = StateContentSchema.safeParse(read.contents[0]);
  return { failed: false, payload: JSON.parse(content.success ? content.data.text : Text.Empty) };
}

async function mcpOutcome(
  client: Client,
  capability: Capability,
  input: JsonObject,
  seen: McpSighting,
  face?: StepFace,
): Promise<McpOutcome> {
  try {
    if (face === StepFace.Resource) {
      return await readState(client, STATE_URI_SCHEME + String(input.name));
    }
    const result = await client.callTool({ name: capability.id, arguments: input });
    return { failed: result.isError === true, payload: result.structuredContent ?? result.content };
  } catch (error) {
    const refused = seen.status !== undefined && seen.status >= HTTP_BAD_REQUEST;
    const body = refused
      ? JsonObjectSchema.safeParse(JSON.parse(seen.body ?? Text.Empty))
      : undefined;
    return {
      failed: true,
      payload: body?.success ? body.data : { message: (error as Error).message },
    };
  }
}

const META = {
  [MCP_META_KEYS.protocolVersion]: MCP_PROTOCOL_VERSION,
  [MCP_META_KEYS.clientInfo]: { name: KB_CLIENT_NAME, version: KB_CLIENT_VERSION },
  [MCP_META_KEYS.clientCapabilities]: {},
};

function updatesIn(messages: readonly JsonObject[]): number {
  return messages.filter((item) => item.method === MCP_UPDATED_METHOD).length;
}

async function takeUpdates(events: AsyncIterable<StreamEvent>): Promise<JsonObject[]> {
  const found: JsonObject[] = [];
  for await (const event of events) {
    found.push(JsonObjectSchema.parse(event.data));
    if (updatesIn(found) >= LISTEN_UPDATES_WANTED) {
      return found;
    }
  }
  return found;
}

async function callMcpListen(
  origin: string,
  token: string | undefined,
  capability: Capability,
  input: JsonObject,
): Promise<CallOutcome> {
  const uri = STATE_URI_SCHEME + String(input.name);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), LISTEN_TIMEOUT_MS);
  const params = { _meta: META, notifications: { resourceSubscriptions: [uri] } };
  const response = await fetch([origin, EndpointPath.Mcp].join(Text.Empty), {
    method: HttpMethod.Post,
    signal: abort.signal,
    headers: {
      ...authHeaders(token),
      [HttpHeader.ContentType]: MediaType.Json,
      [HttpHeader.Accept]: [MediaType.Json, MediaType.EventStream].join(Separator.ListSpaced),
      [HttpHeader.McpProtocolVersion]: MCP_PROTOCOL_VERSION,
      [HttpHeader.McpMethod]: McpMethod.SubscriptionsListen,
    },
    body: JSON.stringify({
      jsonrpc: JSONRPC_VERSION,
      id: 1,
      method: McpMethod.SubscriptionsListen,
      params,
    }),
  });
  const found = await takeUpdates(readEvents(response.body as never)).catch(() => []);
  clearTimeout(timer);
  abort.abort();
  const checks: CheckResult[] = [
    {
      kind: CheckKind.Stream,
      label: message(MessageId.CheckStreamAck),
      passed: found[0]?.method === MCP_ACK_METHOD,
    },
    {
      kind: CheckKind.Stream,
      label: message(MessageId.CheckStreamUpdate),
      passed: updatesIn(found) > 0,
    },
  ];
  const exchange: Exchange = {
    transport: TransportKind.Mcp,
    description: capability.summary,
    request: [McpMethod.SubscriptionsListen, uri].join(Glyph.Space),
    requestBody: pretty(params.notifications),
    authorized: token !== undefined,
    failed: !response.ok,
    response: pretty(found),
    checks,
  };
  return { exchange, body: {} };
}

export async function callMcp(
  origin: string,
  token: string | undefined,
  capability: Capability,
  input: JsonObject,
  face?: StepFace,
): Promise<CallOutcome> {
  if (face === StepFace.Listen) {
    return callMcpListen(origin, token, capability, input);
  }
  const url = new URL([origin, EndpointPath.Mcp].join(Text.Empty));
  const seen: McpSighting = {};
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: { headers: authHeaders(token) },
    fetch: await watchedFetch(seen),
  });
  const client = new Client({ name: capability.id, version: KB_CLIENT_VERSION });
  const connected = await client.connect(transport).then(
    () => undefined,
    (error: Error) => error,
  );
  const outcome =
    connected === undefined
      ? await mcpOutcome(client, capability, input, seen, face)
      : await mcpOutcome(client, capability, input, seen, face).catch(() => ({
          failed: true,
          payload: { message: connected.message },
        }));
  await client.close().catch(() => undefined);
  const parsed = JsonObjectSchema.safeParse(outcome.payload);
  const refused = seen.status !== undefined && seen.status >= HTTP_BAD_REQUEST;
  const exchange: Exchange = {
    transport: TransportKind.Mcp,
    description: capability.summary,
    request:
      face === StepFace.Resource
        ? [McpMethod.ResourcesRead, STATE_URI_SCHEME + String(input.name)].join(Glyph.Space)
        : [McpMethod.ToolsCall, capability.id].join(Glyph.Space),
    requestBody: pretty(
      face === StepFace.Resource ? { uri: STATE_URI_SCHEME + String(input.name) } : input,
    ),
    ...(face === StepFace.Resource ? {} : { tool: capability.id, args: input }),
    authorized: token !== undefined,
    failed: outcome.failed,
    ...(refused ? { status: seen.status } : {}),
    ...(refused && seen.challenge !== undefined ? { challenge: seen.challenge } : {}),
    response: pretty(outcome.payload),
  };
  return { exchange, body: parsed.success ? parsed.data : {} };
}
