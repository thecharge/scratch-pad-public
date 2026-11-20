import { afterAll, describe, expect, test } from "bun:test";
import {
  Client,
  type ProtocolError,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { PROXY_HOST } from "@platform/config/environments";
import { FOREIGN_AUDIENCE, LOOPBACK_ORIGIN } from "@platform/config/urls";
import { EndpointPath, HttpHeader, McpEra, McpFixtureKind } from "@platform/constants";
import { createTestIssuer } from "@platform/test-framework";
import { z } from "zod";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const ORIGIN = LOOPBACK_ORIGIN;
const INVALID_PARAMS = -32602;
const ENVELOPE = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" },
  "io.modelcontextprotocol/clientCapabilities": {},
};
afterAll(finishProxyIntegration);
async function serve(enabled: boolean, era = McpEra.Stateless) {
  const fixture = await proxyFixture({ enabled, era, mcpFixture: McpFixtureKind.Adapter });
  return { app: `${fixture.origin}${EndpointPath.Mcp}`, issuer: fixture.issuer };
}
async function connect(url: string, token?: string) {
  const headers = token === undefined ? {} : { [HttpHeader.Authorization]: `Bearer ${token}` };
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers },
  });
  const client = new Client({ name: "test", version: "1" });
  await client.connect(transport);
  return client;
}

async function toolNames(url: string, token?: string) {
  const client = await connect(url, token);
  const { tools } = await client.listTools();
  await client.close();
  return tools.map((tool) => tool.name).sort();
}

describe("tool listing follows the caller", () => {
  test("anonymous with auth on sees only authless and optional tools", async () => {
    const { app } = await serve(true);
    expect(await toolNames(app)).toEqual([
      "books.broken",
      "books.open",
      "books.optional",
      "books.remove",
    ]);
  });

  test("auth off hides every required tool", async () => {
    const { app } = await serve(false);
    expect(await toolNames(app)).not.toContain("books.private");
  });

  test("a token adds required tools; policy still hides the one it denies", async () => {
    const { app, issuer } = await serve(true);
    const token = await issuer.issue({ scopes: ["read"] });
    const names = await toolNames(app, token);
    expect([names.includes("books.private"), names.includes("books.admin")]).toEqual([true, false]);
  });

  test("a token with the admin scope sees the admin tool", async () => {
    const { app, issuer } = await serve(true);
    const token = await issuer.issue({ scopes: ["admin"] });
    expect(await toolNames(app, token)).toContain("books.admin");
  });
});

describe("tool calls", () => {
  test("a call returns structured content built by the pipeline", async () => {
    const { app } = await serve(true);
    const client = await connect(app);
    const result = await client.callTool({
      name: "books.open",
      arguments: { name: "publishers/p/books/b" },
    });
    expect(result.structuredContent).toEqual({ echoed: "publishers/p/books/b" });
  });

  test("a failing capability is an error result that leaks nothing", async () => {
    const { app } = await serve(true);
    const client = await connect(app);
    const result = await client.callTool({
      name: "books.broken",
      arguments: { name: "publishers/p/books/b" },
    });
    expect([result.isError, JSON.stringify(result.content)]).toEqual([
      true,
      expect.not.stringContaining("secret detail"),
    ]);
  });

  test("an invalid argument is an error result and never reaches the handler", async () => {
    const { app } = await serve(true);
    const client = await connect(app);
    const result = await client.callTool({ name: "books.open", arguments: { wrong: 1 } });
    expect(result.isError).toBe(true);
  });

  test("an unknown tool is an invalid-params protocol error", async () => {
    const { app } = await serve(true);
    const client = await connect(app);
    const outcome = await client
      .callTool({ name: "books.nothing", arguments: {} })
      .then((result) => (result.isError ? INVALID_PARAMS : 0))
      .catch((error: ProtocolError) => error.code);
    expect(outcome).toBe(INVALID_PARAMS);
  });

  test("a tool the caller may not see cannot be called", async () => {
    const { app } = await serve(true);
    const client = await connect(app);
    const outcome = await client
      .callTool({ name: "books.private", arguments: { name: "publishers/p/books/b" } })
      .then((result) => (result.isError ? "error" : "ok"))
      .catch(() => "error");
    expect(outcome).toBe("error");
  });
});

describe("annotations", () => {
  test("a delete is destructive and idempotent, a get is read-only", async () => {
    const { app } = await serve(true);
    const client = await connect(app);
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool.annotations]));
    expect([byName["books.remove"], byName["books.open"]]).toMatchObject([
      { destructiveHint: true, idempotentHint: true },
      { readOnlyHint: true },
    ]);
  });
});

describe("transport behavior", () => {
  const post = (url: string, headers: Record<string, string>, body: unknown) =>
    fetch(url, {
      method: "POST",
      headers: {
        [HttpHeader.ContentType]: "application/json",
        accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify(body),
    });

  test("an invalid bearer token is 401 with a resource metadata challenge", async () => {
    const { app } = await serve(true);
    const response = await post(app, { [HttpHeader.Authorization]: "Bearer garbage" }, {});
    expect([response.status, response.headers.get(HttpHeader.WwwAuthenticate)]).toEqual([
      401,
      expect.stringContaining("resource_metadata"),
    ]);
  });

  test.each([
    ["a protected tool with auth on", "books.private", true, true],
    ["an open tool with auth on", "books.open", true, false],
    ["an unknown tool with auth on", "books.nothing", true, false],
    ["a protected tool with auth off", "books.private", false, false],
  ])(
    "an anonymous call of %s is challenged only when it needs a token",
    async (_name, tool, authEnabled, challenged) => {
      const { app } = await serve(authEnabled);
      const params = { name: tool, arguments: {}, _meta: ENVELOPE };
      const body = { jsonrpc: "2.0", id: 1, method: "tools/call", params };
      const response = await post(app, {}, body);
      expect([
        response.status === 401,
        response.headers.get(HttpHeader.WwwAuthenticate)?.includes("resource_metadata") === true,
      ]).toEqual([challenged, challenged]);
    },
  );

  test("a header that disagrees with the body is a 400 with a mismatch error", async () => {
    const { app } = await serve(true);
    const body = { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: ENVELOPE } };
    const response = await post(
      app,
      { "mcp-protocol-version": "2026-07-28", "mcp-method": "tools/call" },
      body,
    );
    expect([response.status, (await response.json()).error.code]).toEqual([400, -32020]);
  });

  test("a token issued for another resource is rejected", async () => {
    const { app } = await serve(true);
    const foreign = await createTestIssuer(`${ORIGIN}/api/auth`, FOREIGN_AUDIENCE);
    const token = await foreign.issue({ scopes: ["read"] });
    const response = await post(app, { [HttpHeader.Authorization]: `Bearer ${token}` }, {});
    expect(response.status).toBe(401);
  });

  test("a request from a foreign host is refused", async () => {
    const fixture = await proxyFixture({
      enabled: true,
      mcpFixture: McpFixtureKind.Adapter,
      rejectHost: true,
    });
    const response = await post(`${fixture.origin}${EndpointPath.Mcp}`, { host: PROXY_HOST }, {});
    expect(response.status).toBe(403);
  });

  test("a legacy-era client is served statelessly and GET is 405", async () => {
    const { app } = await serve(true);
    const response = await fetch(app, { method: "GET" });
    expect(response.status).toBe(405);
  });

  test("a reject-mode endpoint refuses a legacy request", async () => {
    const { app } = await serve(true, McpEra.Reject);
    const response = await post(app, {}, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});

describe("lazy startup", () => {
  test("no capability loads until the first request", async () => {
    const fixture = await proxyFixture({ enabled: false, mcpFixture: McpFixtureKind.AdapterLazy });
    const before = z.number().parse(await (await fetch(`${fixture.origin}/__loaded`)).json());
    await connect(`${fixture.origin}${EndpointPath.Mcp}`).then((client) => client.listTools());
    const count = z.number().parse(await (await fetch(`${fixture.origin}/__loaded`)).json());
    expect([before, count > 0]).toEqual([0, true]);
  });
});
test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
