import { afterAll, describe, expect, test } from "bun:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { routeFor, splitInput } from "@platform/aip";
import { LOOPBACK_ORIGIN, TEST_CONSOLE_ORIGIN, TEST_FOREIGN_ORIGIN } from "@platform/config/urls";
import {
  AuthProviderKind,
  BookCapabilityId,
  BookState,
  ConfigCapabilityId,
  CustomCapabilityId,
  EndpointPath,
  ErrorReason,
  HttpHeader,
  RouteScope,
  SkillCapabilityId,
  StatsCapabilityId,
} from "@platform/constants";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { type ApiErrorBody, type JsonObject, JsonObjectSchema } from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";
import { createRegistry } from "../../../apps/api/src/registry.ts";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const TextContentSchema = z.array(z.object({ text: z.string() }));
const ORIGIN = LOOPBACK_ORIGIN;
const PARENT = "publishers/p1";
const BOOK = `${PARENT}/books/b1`;

afterAll(async () => {
  await removeAll();
  await finishProxyIntegration();
});

async function start(authEnabled: boolean, skillDirs: string[] = []) {
  const fixture = await proxyFixture({
    enabled: authEnabled,
    domain: "api.test",
    reindexStepMs: 0,
    skillDirs,
  });
  return { base: fixture.origin, issuer: fixture.issuer };
}

const registry = await createRegistry();

function authHeaders(token: string | undefined): Record<string, string> {
  return token === undefined ? {} : { [HttpHeader.Authorization]: `Bearer ${token}` };
}

async function viaHttp(base: string, token: string | undefined, id: string, input: JsonObject) {
  const capability = await registry.get(id);
  const route = await routeFor(capability);
  const split = await splitInput(capability, route);
  const resource = String(input.name ?? input.parent ?? "");
  const collection = route.scope === RouteScope.Collection ? `/${route.segments.at(-1)}` : "";
  const root = route.target === undefined ? "" : `/${resource}`;
  const verb = route.verb === undefined ? "" : `:${route.verb}`;
  const query = new URLSearchParams();
  split.query.map((key) =>
    [input[key]]
      .flat()
      .map((value) => (value === undefined ? 0 : query.append(key, String(value)))),
  );
  const body = Object.fromEntries(
    split.body.filter((key) => key in input).map((key) => [key, input[key]]),
  );
  const hasBody = split.body.length > 0 && route.method !== "GET";
  const url = `${base}/v1${root}${collection}${verb}?${query}`;
  return fetch(url, {
    method: route.method,
    headers: { ...authHeaders(token), [HttpHeader.ContentType]: "application/json" },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });
}

async function connectClient(base: string, token: string | undefined) {
  const init = { headers: authHeaders(token) };
  const transport = new StreamableHTTPClientTransport(new URL(`${base}${EndpointPath.Mcp}`), {
    requestInit: init,
  });
  const client = new Client({ name: "test", version: "1" });
  await client.connect(transport);
  return client;
}

async function viaMcp(base: string, token: string | undefined, id: string, input: JsonObject) {
  const client = await connectClient(base, token);
  const result = await client.callTool({ name: id, arguments: input });
  await client.close();
  return result;
}

async function mcpTools(base: string, token?: string) {
  const client = await connectClient(base, token);
  const { tools } = await client.listTools();
  await client.close();
  return tools.map((tool) => tool.name);
}

async function both(base: string, token: string | undefined, id: string, input: JsonObject) {
  const http = JsonObjectSchema.parse(await (await viaHttp(base, token, id, input)).json());
  const mcp = JsonObjectSchema.parse((await viaMcp(base, token, id, input)).structuredContent);
  return { http, mcp };
}

async function seed(base: string, token: string) {
  await viaHttp(base, token, BookCapabilityId.Create, {
    parent: PARENT,
    bookId: "b1",
    title: "Les Misérables",
    author: "Victor Hugo",
    authorEmail: "victor@example.com",
  });
}

describe("HTTP and MCP return the same result", () => {
  test.each<[string, string, JsonObject, string[]]>([
    ["a public singleton, anonymous", ConfigCapabilityId.Get, { name: "config" }, []],
    ["an optional get, anonymous (email masked)", BookCapabilityId.Get, { name: BOOK }, []],
    [
      "an optional get with the read scope (email shown)",
      BookCapabilityId.Get,
      { name: BOOK },
      ["read"],
    ],
    ["a basic view", BookCapabilityId.Get, { name: BOOK, view: "BASIC" }, ["read"]],
    ["a list", BookCapabilityId.List, { parent: PARENT }, ["read"]],
    ["a filtered list", BookCapabilityId.List, { parent: PARENT, filter: "title:Mis*" }, ["read"]],
    ["a batch get", BookCapabilityId.BatchGet, { parent: PARENT, names: [BOOK] }, ["read"]],
  ])("%s", async (_name, id, input, scopes) => {
    const { base, issuer } = await start(true);
    const admin = await issuer.issue({ scopes: ["read", "write", "admin"] });
    await seed(base, admin);
    const token = scopes.length === 0 ? undefined : await issuer.issue({ scopes });
    const { http, mcp } = await both(base, token, id, input);
    expect(mcp).toEqual(http);
  });

  test("masking hides the email from a caller without the read scope on both transports", async () => {
    const { base, issuer } = await start(true);
    await seed(base, await issuer.issue({ scopes: ["write"] }));
    const { http, mcp } = await both(base, undefined, BookCapabilityId.Get, { name: BOOK });
    expect([http, mcp].map((body) => "authorEmail" in body)).toEqual([false, false]);
  });
});

describe("mutations behave the same on both transports", () => {
  test.each(["http", "mcp"])(
    "create, update, archive, delete and restore over %s",
    async (transport) => {
      const { base, issuer } = await start(true);
      const token = await issuer.issue({ scopes: ["read", "write", "admin"] });
      const call = (id: string, input: JsonObject) =>
        transport === "http"
          ? viaHttp(base, token, id, input).then((response) => response.json())
          : viaMcp(base, token, id, input).then((result) => result.structuredContent);
      const created = await call(BookCapabilityId.Create, {
        parent: PARENT,
        bookId: "b9",
        title: "T",
      });
      const name = `${PARENT}/books/b9`;
      const updated = await call(BookCapabilityId.Update, {
        name,
        title: "New",
        updateMask: "title",
      });
      const archived = await call(BookCapabilityId.Archive, { name });
      const deleted = await call(BookCapabilityId.Delete, { name });
      const restored = await call(BookCapabilityId.Undelete, { name });
      expect([created, updated, archived, deleted, restored]).toMatchObject([
        { name, state: BookState.Active },
        { title: "New" },
        { state: BookState.Archived },
        { deleteTime: expect.any(String) },
        { title: "New", state: BookState.Archived },
      ]);
    },
  );

  test.each(["http", "mcp"])(
    "archiving twice is a failed precondition over %s",
    async (transport) => {
      const { base, issuer } = await start(true);
      const token = await issuer.issue({ scopes: ["read", "write"] });
      await seed(base, token);
      await viaHttp(base, token, BookCapabilityId.Archive, { name: BOOK });
      const failed =
        transport === "http"
          ? await viaHttp(base, token, BookCapabilityId.Archive, { name: BOOK })
          : await viaMcp(base, token, BookCapabilityId.Archive, { name: BOOK });
      const reason =
        failed instanceof Response
          ? ((await failed.json()) as ApiErrorBody).error.details[0]?.reason
          : JSON.parse(TextContentSchema.parse(failed.content)[0]?.text ?? "{}").reason;
      expect(reason).toBe(ErrorReason.InvalidTransition);
    },
  );

  test("a long-running operation can be polled to completion", async () => {
    const { base, issuer } = await start(true);
    const admin = await issuer.issue({ scopes: ["read", "write", "admin"] });
    await seed(base, admin);
    const started = JsonObjectSchema.parse(
      await (await viaHttp(base, admin, BookCapabilityId.Reindex, { parent: PARENT })).json(),
    );
    await Bun.sleep(20);
    const polled = await fetch(`${base}/v1/${started.name}`, {
      headers: { [HttpHeader.Authorization]: `Bearer ${admin}` },
    });
    expect(await polled.json()).toMatchObject({ done: true, response: { count: 1 } });
  });
});

describe("observability capabilities", () => {
  test("stats and recent events are admin only and match on both transports", async () => {
    const { base, issuer } = await start(true);
    const admin = await issuer.issue({ scopes: ["read", "write", "admin"] });
    const reader = await issuer.issue({ scopes: ["read"] });
    await viaHttp(base, undefined, ConfigCapabilityId.Get, { name: "config" });
    await Bun.sleep(10);
    const denied = await viaHttp(base, reader, StatsCapabilityId.Get, { name: "stats" });
    const http = JsonObjectSchema.parse(
      await (await viaHttp(base, admin, StatsCapabilityId.Get, { name: "stats" })).json(),
    );
    const logs = JsonObjectSchema.parse(
      await (await viaHttp(base, admin, StatsCapabilityId.LogsList, { limit: 5 })).json(),
    );
    expect([denied.status, Number(http.total) >= 2, Array.isArray(logs.events)]).toEqual([
      403,
      true,
      true,
    ]);
  });
});

describe("authentication on and off", () => {
  test("with auth off a required capability is 401 AUTH_NOT_ENABLED and absent from MCP", async () => {
    const { base } = await start(false);
    const response = await viaHttp(base, undefined, BookCapabilityId.List, { parent: PARENT });
    const body = (await response.json()) as ApiErrorBody;
    expect([response.status, body.error.details[0]?.reason, await mcpTools(base)]).toEqual([
      401,
      ErrorReason.AuthNotEnabled,
      [
        BookCapabilityId.Get,
        ConfigCapabilityId.Get,
        SkillCapabilityId.Get,
        SkillCapabilityId.List,
      ].sort(),
    ]);
  });

  test("authless capabilities work with auth off", async () => {
    const { base } = await start(false);
    const response = await viaHttp(base, undefined, ConfigCapabilityId.Get, { name: "config" });
    expect(await response.json()).toMatchObject({ name: "config" });
  });

  test("with auth on, the tool list depends on the caller's scopes", async () => {
    const { base, issuer } = await start(true);
    const reader = await issuer.issue({ scopes: ["read"] });
    const admin = await issuer.issue({ scopes: ["read", "write", "admin"] });
    const [anonymous = [], asReader = [], asAdmin = []] = await all([
      async () => mcpTools(base),
      async () => mcpTools(base, reader),
      async () => mcpTools(base, admin),
    ]);
    expect([anonymous.length < asReader.length, asReader.length < asAdmin.length]).toEqual([
      true,
      true,
    ]);
  });

  test("the OpenAPI document and resource metadata are served", async () => {
    const { base } = await start(true);
    const [spec, metadata] = (await all([
      async () => fetch(`${base}${EndpointPath.OpenApi}`),
      async () => fetch(`${base}/.well-known/oauth-protected-resource`),
    ])) as [Response, Response];
    expect([(await spec.json()).openapi, (await metadata.json()).resource]).toEqual([
      "3.1.0",
      ORIGIN,
    ]);
  });
});

describe("metrics", () => {
  test("an admin reads the text exposition and a caller without the admin scope does not", async () => {
    const { base, issuer } = await start(true);
    const admin = await issuer.issue({ scopes: ["admin"] });
    const reader = await issuer.issue({ scopes: ["read"] });
    await fetch(`${base}/v1/config`, { headers: { accept: "application/json" } });
    const asking = (token: string) =>
      fetch(`${base}${EndpointPath.Metrics}`, { headers: { authorization: `Bearer ${token}` } });
    const [allowed, refused] = (await all([
      async () => asking(admin),
      async () => asking(reader),
    ])) as [Response, Response];
    expect([allowed.status, refused.status]).toEqual([200, 403]);
    const text = await allowed.text();
    expect(text).toContain("platform_process_resident_memory_bytes");
    expect(text).toMatch(
      /platform_http_operation_count_total\{capability="config.get",form="application\/json",http_version="1.1"\} 1/,
    );
  });
});

describe("browser access", () => {
  test("a preflight from an allowed origin is granted and from another origin is not", async () => {
    const fixture = await proxyFixture({
      enabled: true,
      domain: "api.test",
      allowedOrigins: [TEST_CONSOLE_ORIGIN],
    });
    const preflight = (origin: string) =>
      fetch(`${fixture.origin}/v1/stats`, {
        method: "OPTIONS",
        headers: {
          origin,
          "access-control-request-method": "GET",
          "access-control-request-headers": "authorization",
        },
      });
    const [allowed, foreign] = (await all([
      async () => preflight(TEST_CONSOLE_ORIGIN),
      async () => preflight(TEST_FOREIGN_ORIGIN),
    ])) as [Response, Response];
    expect([
      allowed.headers.get("access-control-allow-origin"),
      foreign.headers.get("access-control-allow-origin"),
    ]).toEqual([TEST_CONSOLE_ORIGIN, null]);
  });
});

const SKILL_ALPHA = "---\nname: alpha\ndescription: The public skill.\n---\n\n# alpha\n";
const SKILL_BETA =
  "---\nname: beta\ndescription: The guarded skill.\nmetadata:\n  auth: required\n  scopes: read\n---\n\n# beta\n";
const skillRoot = await makeDir();
await writeFiles(skillRoot, { "alpha/SKILL.md": SKILL_ALPHA, "beta/SKILL.md": SKILL_BETA });

const namesOf = (body: JsonObject) =>
  z
    .object({ skills: z.array(z.object({ name: z.string() })) })
    .parse(body)
    .skills.map((skill) => skill.name);

describe("skills as capabilities", () => {
  test("HTTP and MCP list the same skills for an anonymous caller", async () => {
    const { base } = await start(true, [skillRoot]);
    const { http, mcp } = await both(base, undefined, SkillCapabilityId.List, {});
    expect([mcp, namesOf(http).includes("alpha"), namesOf(http).includes("beta")]).toEqual([
      http,
      true,
      false,
    ]);
  });

  test("a reader is also offered the guarded skill on both transports", async () => {
    const { base, issuer } = await start(true, [skillRoot]);
    const token = await issuer.issue({ scopes: ["read"] });
    const { http, mcp } = await both(base, token, SkillCapabilityId.List, {});
    expect([mcp, namesOf(http).includes("beta")]).toEqual([http, true]);
  });

  test("HTTP and MCP return the same skill files to a reader", async () => {
    const { base, issuer } = await start(true, [skillRoot]);
    const token = await issuer.issue({ scopes: ["read"] });
    const { http, mcp } = await both(base, token, SkillCapabilityId.Get, { name: "skills/beta" });
    expect([mcp, http.files]).toEqual([http, [{ path: "SKILL.md", content: SKILL_BETA }]]);
  });

  test("an anonymous caller does not receive the guarded skill on either transport", async () => {
    const { base } = await start(true, [skillRoot]);
    const input = { name: "skills/beta" };
    const response = await viaHttp(base, undefined, SkillCapabilityId.Get, input);
    const body = (await response.json()) as ApiErrorBody;
    const result = await viaMcp(base, undefined, SkillCapabilityId.Get, input);
    expect([response.status, body.error.details[0]?.reason, result.isError]).toEqual([
      404,
      ErrorReason.ResourceNotFound,
      true,
    ]);
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});

test.each(["first", "second"])(
  "the composed API retains custom routes, authentication, metrics and operations for %s",
  async (name) => {
    const fixture = await proxyFixture({
      enabled: true,
      docsProvider: AuthProviderKind.BetterAuth,
      customCapabilities: true,
      tickClock: true,
      captureLogs: true,
      reindexStepMs: 0,
    });
    const token = await fixture.issuer.issue({ scopes: ["read", "write", "admin"] });
    const headers = { accept: "application/json", authorization: `Bearer ${token}` };
    const greeting = await fetch(`${fixture.origin}/v1/greetings/${name}`, { headers });
    expect(await greeting.json()).toEqual({ text: name });
    const document = await fetch(`${fixture.origin}/openapi.json`, { headers });
    expect(await document.text()).toContain(CustomCapabilityId.Greeting);
    const keys = await fetch(`${fixture.origin}/api/auth/jwks`, { headers });
    expect(JsonObjectSchema.parse(await keys.json()).keys).toBeInstanceOf(Array);
    const client = await connectClient(fixture.origin, token);
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain(
      CustomCapabilityId.Greeting,
    );
    const skill = await client.callTool({ name: SkillCapabilityId.List, arguments: {} });
    expect(skill.isError).not.toBe(true);
    const operation = await fetch(`${fixture.origin}/v1/publishers/p1/books:reindex`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: "{}",
    });
    expect(operation.status).toBe(200);
    expect(JsonObjectSchema.parse(await operation.json()).name).toMatch(/^operations\//);
    const stats = await fetch(`${fixture.origin}/v1/stats`, { headers });
    expect(JsonObjectSchema.parse(await stats.json()).process).toBeDefined();
    const metrics = await fetch(`${fixture.origin}/v1/metrics`, { headers });
    expect(await metrics.text()).toContain("platform_http");
    const rpcMeta = {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": { name: "composition", version: "1" },
      "io.modelcontextprotocol/clientCapabilities": {},
    };
    const rpcParams = { name: ConfigCapabilityId.Update, arguments: {}, _meta: rpcMeta };
    const rpc = { jsonrpc: "2.0", id: 1, method: "tools/call", params: rpcParams };
    const rpcHeaders = {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2026-07-28",
      "mcp-method": "tools/call",
    };
    const anonymous = await fetch(`${fixture.origin}/mcp`, {
      method: "POST",
      headers: rpcHeaders,
      body: JSON.stringify(rpc),
    });
    expect(anonymous.status).toBe(401);
    const invalid = await fetch(`${fixture.origin}/mcp`, {
      method: "POST",
      headers: { ...rpcHeaders, authorization: "Bearer invalid" },
      body: JSON.stringify(rpc),
    });
    expect(invalid.status).toBe(401);
    await client.close();
  },
);
