import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import {
  AuthScheme,
  CustomCapabilityId,
  E2E_TEST_TIMEOUT_MS,
  EndpointPath,
  HttpHeader,
  SkillCapabilityId,
  StepFlag,
} from "@platform/constants";
import { recordAll, runScenario, scenarios } from "@platform/kb-recorder";
import { flatMapAsync } from "@platform/store";
import { customCapabilities } from "@platform/test-custom-capability";
import { ADMIN_SCOPES, tokenFor } from "@platform/test-framework";
import { mcpConformance } from "@platform/test-scenarios";
import { type Capability, JsonObjectSchema } from "@platform/types";
import { all } from "@platform/util";
import { createRegistry } from "../../../apps/api/src/registry.ts";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

setDefaultTimeout(E2E_TEST_TIMEOUT_MS);

const GREETING = { name: "greetings/hello" };

const directories: string[] = [];

afterAll(async () => {
  await finishProxyIntegration();
  await all(
    directories.map((directory) => async () => rm(directory, { recursive: true, force: true })),
  );
});

async function boot() {
  const fixture = await proxyFixture({
    enabled: true,
    domain: "custom.e2e",
    customCapabilities: true,
  });
  const { issuer } = fixture;
  const extras = await customCapabilities();
  const server = { origin: fixture.origin };
  const connect = async (token?: string) => {
    const headers =
      token === undefined
        ? {}
        : { [HttpHeader.Authorization]: [AuthScheme.Bearer, token].join(" ") };
    const transport = new StreamableHTTPClientTransport(
      new URL([server.origin, EndpointPath.Mcp].join("")),
      { requestInit: { headers } },
    );
    const client = new Client({ name: "custom-e2e", version: "1" });
    await client.connect(transport);
    return client;
  };
  const admin = (await tokenFor(issuer, ADMIN_SCOPES)) as string;
  return { origin: server.origin, extras, connect, admin };
}

describe("a capability defined in a fixture package", () => {
  test("is served over HTTP, MCP and OpenAPI from one definition", async () => {
    const { origin, connect } = await boot();
    const http = await (await fetch(`${origin}/v1/greetings/hello`)).json();
    const client = await connect();
    const mcp = await client.callTool({ name: CustomCapabilityId.Greeting, arguments: GREETING });
    const document = await (await fetch(`${origin}${EndpointPath.OpenApi}`)).json();
    expect([http, mcp.structuredContent, Object.keys(document.paths)]).toEqual([
      { text: "hello" },
      { text: "hello" },
      expect.arrayContaining(["/v1/greetings/{greeting}"]),
    ]);
  });

  test("a tool-only item is an MCP tool with no HTTP route and no OpenAPI operation", async () => {
    const { origin, connect } = await boot();
    const client = await connect();
    const tools = (await client.listTools()).tools.map((tool) => tool.name);
    const shouted = await client.callTool({ name: CustomCapabilityId.Shout, arguments: GREETING });
    const http = await fetch(`${origin}/v1/greetings/hello:shout`, { method: "POST", body: "{}" });
    const document = JSON.stringify(await (await fetch(`${origin}${EndpointPath.OpenApi}`)).json());
    expect([
      tools.includes(CustomCapabilityId.Shout),
      shouted.structuredContent,
      http.status,
      document.includes(CustomCapabilityId.Shout),
    ]).toEqual([true, { text: "HELLO" }, 404, false]);
  });

  test("a skill in a skill package is listed and read through the skill tools", async () => {
    const { connect } = await boot();
    const client = await connect();
    const listed = await client.callTool({ name: SkillCapabilityId.List, arguments: {} });
    const read = await client.callTool({
      name: SkillCapabilityId.Get,
      arguments: { name: "skills/greeting-guide" },
    });
    expect([
      JSON.stringify(listed.structuredContent).includes("greeting-guide"),
      JSON.stringify(read.structuredContent).includes("greetings.shout"),
    ]).toEqual([true, true]);
  });
});

describe("the MCP conformance checks", () => {
  test("every custom tool passes the same checks as every built-in tool", async () => {
    const { connect, extras, admin } = await boot();
    const [signedIn, anonymous] = [await connect(admin), await connect()];
    const builtIn = await (await createRegistry()).list();
    const names = (capabilities: readonly Capability[]) => capabilities.map(({ id }) => id);
    const failures = (
      await flatMapAsync([...builtIn, ...extras], async (capability) =>
        mcpConformance(capability, signedIn, anonymous),
      )
    )
      .filter((entry) => !entry.passed)
      .map((entry) => entry.label);
    expect([failures, names(extras).length > 0, names(builtIn).length > 0]).toEqual([
      [],
      true,
      true,
    ]);
  });
});

describe("the conformance checks can fail", () => {
  test("a tool that the server does not offer fails the listing and the call checks", async () => {
    const { connect, extras, admin } = await boot();
    const [signedIn, anonymous] = [await connect(admin), await connect()];
    const missing = { ...(extras[0] as Capability), id: "greetings.missing" };
    const checks = await mcpConformance(missing, signedIn, anonymous);
    expect(checks.filter((entry) => !entry.passed).length).toBeGreaterThanOrEqual(2);
  });
});

describe("the generated page for defining a capability, a tool-only item and a skill", () => {
  test("shows every step with its flag over both transports", async () => {
    const directory = await mkdtemp(join(tmpdir(), "custom-docs-"));
    directories.push(directory);
    const custom = scenarios().filter((scenario) => scenario.custom === true);
    const [path] = await recordAll(custom, directory, undefined, undefined, (scenario, transport) =>
      runScenario(scenario, transport, proxyDocsApi),
    );
    const text = await Bun.file(path as string).text();
    expect([
      custom.length,
      text.includes("Call the tool-only item"),
      text.includes("Read the skill from the skill package"),
      text.includes(StepFlag.Failed.toUpperCase()),
    ]).toEqual([1, true, true, false]);
    expect(JsonObjectSchema.safeParse({}).success).toBe(true);
  });
});

async function proxyDocsApi(enabled: boolean, databasePath: string) {
  const fixture = await proxyFixture({
    enabled,
    databasePath,
    customCapabilities: true,
    tickClock: true,
  });
  const flags = {
    enabled: async () => false,
    set: async (values: Record<string, boolean>) => {
      const response = await fetch(`${fixture.origin}/__flags`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(await response.text());
    },
  };
  return {
    issuer: fixture.issuer,
    flags,
    server: { origin: fixture.origin, stop: async () => undefined },
  };
}

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
