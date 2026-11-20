import { afterAll, describe, expect, test } from "bun:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import {
  TEST_MCP_ALLOWED_HOST,
  TEST_MCP_ALLOWED_ORIGIN,
  TEST_MCP_FOREIGN_ORIGIN,
  TEST_METADATA_MCP_RESOURCE,
  TEST_METADATA_RESOURCE,
} from "@platform/config/urls";
import {
  EndpointPath,
  HttpHeader,
  HttpMethod,
  McpFixtureKind,
  MediaType,
  SKILLS_EXTENSION_ID,
} from "@platform/constants";
import { thrownBy } from "@platform/test-framework";
import { all } from "@platform/util";
import { z } from "zod";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const VERSION = "2026-07-28";
const INVALID_PARAMS = -32602;
const ALLOWED_HOST = TEST_MCP_ALLOWED_HOST;
const ALLOWED_ORIGIN = TEST_MCP_ALLOWED_ORIGIN;
const BOOK_NAME = "publishers/p/books/b";
const ENVELOPE = {
  "io.modelcontextprotocol/protocolVersion": VERSION,
  "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" },
  "io.modelcontextprotocol/clientCapabilities": {},
};
const SKILLS_EXTENSION = { [SKILLS_EXTENSION_ID]: {} };
const EXPECTED_CAPABILITIES = { resources: {}, extensions: SKILLS_EXTENSION };
const ResourceSchema = z.object({ uri: z.string(), digest: z.string(), size: z.number() });
const SkillSchema = z.object({
  uri: z.string(),
  frontmatter: z.looseObject({}),
  resources: z.array(ResourceSchema),
});
const SkillsSchema = z.object({ skills: z.tuple([SkillSchema], SkillSchema) });
const ListedUrisSchema = z.object({ resources: z.array(z.object({ uri: z.string() })) });
afterAll(finishProxyIntegration);
async function boot(enabled = true, omitExpiry = false) {
  const fixture = await proxyFixture({
    enabled,
    omitExpiry,
    mcpFixture: McpFixtureKind.Conformance,
    allowedOrigins: [ALLOWED_HOST],
  });
  return { url: `${fixture.origin}${EndpointPath.Mcp}`, issuer: fixture.issuer };
}
function bearer(token: string): Record<string, string> {
  return { [HttpHeader.Authorization]: `Bearer ${token}` };
}

function withEnvelope(params: Record<string, unknown>) {
  return { ...params, _meta: ENVELOPE };
}

async function modern(
  url: string,
  method: string,
  params: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  const response = await fetch(url, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.ContentType]: MediaType.Json,
      accept: `${MediaType.Json}, text/event-stream`,
      [HttpHeader.McpProtocolVersion]: VERSION,
      [HttpHeader.McpMethod]: method,
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: withEnvelope(params) }),
  });
  return { status: response.status, headers: response.headers, body: await response.json() };
}

async function readResource(url: string, uri: string, headers: Record<string, string> = {}) {
  return modern(url, "resources/read", { uri }, { [HttpHeader.McpName]: uri, ...headers });
}

async function connect(url: string, token?: string) {
  const headers = token === undefined ? {} : bearer(token);
  const client = new Client({ name: "legacy", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }),
  );
  return client;
}

describe("modern request and discovery", () => {
  test("tools/list answers 200, opens no session and completes", async () => {
    const { url } = await boot();
    const reply = await modern(url, "tools/list");
    expect([
      reply.status,
      reply.headers.get("mcp-session-id"),
      reply.body.result.resultType,
    ]).toEqual([200, null, "complete"]);
  });

  test("server/discover lists versions, the skills extension, resources and cache hints", async () => {
    const { url } = await boot();
    const { result } = (await modern(url, "server/discover")).body;
    expect(result).toMatchObject({
      supportedVersions: [VERSION],
      capabilities: EXPECTED_CAPABILITIES,
      ttlMs: expect.any(Number),
      cacheScope: expect.stringMatching(/^(public|private)$/),
    });
  });

  test("an authenticated tools/list is cached privately", async () => {
    const { url, issuer } = await boot();
    const token = await issuer.issue({ scopes: ["read"] });
    const { result } = (await modern(url, "tools/list", {}, bearer(token))).body;
    expect([result.cacheScope, result.ttlMs]).toEqual(["private", expect.any(Number)]);
  });
});

describe("legacy era", () => {
  test("a 2025 stateless client lists and calls tools", async () => {
    const { url } = await boot();
    const client = await connect(url);
    const { tools } = await client.listTools();
    const called = await client.callTool({ name: "books.open", arguments: { name: BOOK_NAME } });
    expect([
      tools.map((tool) => tool.name).includes("books.open"),
      called.structuredContent,
    ]).toEqual([true, { echoed: BOOK_NAME }]);
  });

  test.each([[HttpMethod.Get], [HttpMethod.Delete]])(
    "%s on the endpoint is 405",
    async (method) => {
      const { url } = await boot();
      expect((await fetch(url, { method })).status).toBe(405);
    },
  );
});

describe("tool results and origin", () => {
  test("structuredContent validates against the tool outputSchema", async () => {
    const { url } = await boot();
    const client = await connect(url);
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === "books.open");
    const called = await client.callTool({ name: "books.open", arguments: { name: BOOK_NAME } });
    const schema = z.fromJSONSchema(tool?.outputSchema as never);
    expect(schema.safeParse(called.structuredContent).success).toBe(true);
  });

  test.each([
    ["a disallowed origin", TEST_MCP_FOREIGN_ORIGIN, 403],
    ["an allowed origin", ALLOWED_ORIGIN, 200],
  ])("%s answers %d", async (_name, origin, status) => {
    const { url } = await boot();
    const reply = await modern(url, "tools/list", {}, { [HttpHeader.Origin]: origin });
    expect(reply.status).toBe(status);
  });
});

describe("resources", () => {
  test("an unknown resource is invalid params", async () => {
    const { url } = await boot();
    const reply = await readResource(url, "nothing://missing");
    expect(reply.body.error.code).toBe(INVALID_PARAMS);
  });

  test("an unknown resource is invalid params through the official client", async () => {
    const { url } = await boot();
    const client = await connect(url);
    const error = await thrownBy(() => client.readResource({ uri: "nothing://missing" }));
    expect(error).toMatchObject({ code: INVALID_PARAMS });
  });
});

describe("protected resource metadata is served at the RFC 9728 path", () => {
  test.each([
    [TEST_METADATA_RESOURCE, "/.well-known/oauth-protected-resource"],
    [TEST_METADATA_MCP_RESOURCE, "/.well-known/oauth-protected-resource/mcp"],
  ])("resource %s is at %s", async (resource, path) => {
    const fixture = await proxyFixture({
      enabled: true,
      mcpFixture: McpFixtureKind.Metadata,
      resource,
    });
    const origin = fixture.origin;
    const response = await fetch(`${origin}${path}`);
    expect([response.status, (await response.json()).resource]).toEqual([200, resource]);
  });
});

describe("token without expiry", () => {
  test("a verifier that omits expiresAt yields 401", async () => {
    const { url } = await boot(true, true);
    const reply = await modern(url, "tools/list", {}, bearer("anything"));
    expect(reply.status).toBe(401);
  });
});

describe("skills over the protocol", () => {
  const listed = async (url: string, headers: Record<string, string> = {}) =>
    (await modern(url, "skills/list", {}, headers)).body.result;

  test("skills/list carries ttlMs and a private cacheScope", async () => {
    const { url } = await boot();
    expect(await listed(url)).toMatchObject({ ttlMs: expect.any(Number), cacheScope: "private" });
  });

  test("the skills extension and the platform own the skill scheme", async () => {
    const { url } = await boot();
    const { skills } = SkillsSchema.parse(await listed(url));
    const skillUris = skills.flatMap((skill) => skill.resources.map((resource) => resource.uri));
    const { resources } = ListedUrisSchema.parse((await modern(url, "resources/list")).body.result);
    const foreign = resources
      .map((resource) => resource.uri)
      .filter((uri) => uri.startsWith("skill://") && !skillUris.includes(uri));
    expect(foreign).toEqual([]);
  });

  test("the URI ends in name/SKILL.md and the frontmatter carries name and description", async () => {
    const { url } = await boot();
    const [skill] = SkillsSchema.parse(await listed(url)).skills;
    expect([skill.uri, skill.frontmatter]).toEqual([
      "skill://books/SKILL.md",
      { name: "books", description: expect.any(String) },
    ]);
  });

  test("digest and size equal the sha256 and byte length of the read content", async () => {
    const { url } = await boot();
    const [skill] = SkillsSchema.parse(await listed(url)).skills;
    const checks = await all(
      skill.resources.map((resource) => async () => {
        const read = (await readResource(url, resource.uri)).body.result.contents[0];
        const bytes = new TextEncoder().encode(read.text);
        const hash = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
        return {
          listed: [resource.digest, resource.size],
          actual: [`sha256:${hash}`, bytes.length],
        };
      }),
    );
    expect(checks.map((check) => check.listed)).toEqual(checks.map((check) => check.actual));
  });

  test.each([
    ["an unknown skill", "skill://nothing/SKILL.md"],
    ["a skill hidden from the caller", "skill://shelves/SKILL.md"],
  ])("skills/get for %s is invalid params", async (_name, uri) => {
    const { url } = await boot();
    const reply = await modern(url, "skills/get", { uri });
    expect(reply.body.error.code).toBe(INVALID_PARAMS);
  });
});

describe("rate limits over MCP", () => {
  test("a call past the limit is an error result with the reason and the delay", async () => {
    const { url } = await boot();
    const client = await connect(url);
    const call = () => client.callTool({ name: "books.limited", arguments: { name: BOOK_NAME } });
    const first = await call();
    const second = await call();
    const failure = z.object({ content: z.array(z.object({ text: z.string() })) }).parse(second)
      .content[0]?.text;
    expect([first.isError, second.isError, JSON.parse(failure ?? "{}")]).toEqual([
      false,
      true,
      expect.objectContaining({
        reason: "RATE_LIMITED",
        metadata: { retryAfterSeconds: expect.stringMatching(/^\d+$/) },
      }),
    ]);
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
