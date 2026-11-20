import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import {
  AuthScheme,
  CapabilityId,
  EndpointPath,
  Glyph,
  HttpHeader,
  StatsCapabilityId,
  StdioMode,
} from "@platform/constants";
import { ADMIN_SCOPES, READER_SCOPES, REPO_ROOT, tokenFor } from "@platform/test-framework";
import { type JsonObject, JsonObjectSchema, OpenApiDocumentSchema } from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const INSPECTOR = join(REPO_ROOT, "apps/api/node_modules/.bin/mcp-inspector");
const ToolsSchema = z.object({
  tools: z.array(z.looseObject({ name: z.string(), inputSchema: JsonObjectSchema })),
});
const SkillsSchema = z.object({ skills: z.array(z.looseObject({ uri: z.string() })) });
const CallSchema = z.looseObject({ structuredContent: JsonObjectSchema, isError: z.boolean() });

async function boot() {
  return proxyFixture({ enabled: true, domain: "clients.test", reindexStepMs: 0 });
}

function bearer(token: string | undefined): string {
  return [AuthScheme.Bearer, token].join(Glyph.Space);
}

async function inspect(
  origin: string,
  token: string | undefined,
  ...args: string[]
): Promise<unknown> {
  const url = [origin, EndpointPath.Mcp].join("");
  const header =
    token === undefined ? [] : ["--header", `${HttpHeader.Authorization}: ${bearer(token)}`];
  const child = Bun.spawn([INSPECTOR, "--cli", url, ...header, ...args], {
    stdin: StdioMode.Ignore,
    stdout: StdioMode.Pipe,
    stderr: StdioMode.Pipe,
  });
  const [output, diagnostics] = await all([
    async () => new Response(child.stdout).text(),
    async () => new Response(child.stderr).text(),
  ]);
  if ((await child.exited) !== 0) throw new Error(diagnostics);
  return JSON.parse(output ?? "");
}

async function officialClient(origin: string, token: string | undefined) {
  const headers = token === undefined ? {} : { [HttpHeader.Authorization]: bearer(token) };
  const transport = new StreamableHTTPClientTransport(
    new URL([origin, EndpointPath.Mcp].join("")),
    {
      requestInit: { headers },
    },
  );
  const client = new Client({ name: "official", version: "1" });
  await client.connect(transport);
  return client;
}

describe("the MCP Inspector CLI against the running server", () => {
  test.each([
    ["an administrator", ADMIN_SCOPES, 29],
    ["a reader", READER_SCOPES, 14],
    ["an anonymous caller", [] as string[], 4],
  ])("tools/list for %s shows only what they may use", async (_name, scopes, count) => {
    const { origin, issuer } = await boot();
    const listed = ToolsSchema.parse(
      await inspect(origin, await tokenFor(issuer, scopes), "--method", "tools/list"),
    );
    expect(listed.tools.length).toBe(count);
  });

  test("tools/call returns the same structured result as the HTTP API", async () => {
    const { origin, issuer } = await boot();
    const token = await tokenFor(issuer, ADMIN_SCOPES);
    const called = CallSchema.parse(
      await inspect(
        origin,
        token,
        "--method",
        "tools/call",
        "--tool-name",
        "config.get",
        "--tool-arg",
        "name=config",
      ),
    );
    const http = await (await fetch(`${origin}/v1/config`)).json();
    expect([called.isError, called.structuredContent]).toEqual([false, http]);
  });

  test("a write through the Inspector is visible through the HTTP API", async () => {
    const { origin, issuer } = await boot();
    const token = await tokenFor(issuer, ADMIN_SCOPES);
    await inspect(
      origin,
      token,
      "--method",
      "tools/call",
      "--tool-name",
      "books.create",
      "--tool-arg",
      "parent=publishers/acme",
      "--tool-arg",
      "bookId=dune",
      "--tool-arg",
      "title=Dune",
    );
    const response = await fetch(`${origin}/v1/publishers/acme/books/dune`, {
      headers: { [HttpHeader.Authorization]: bearer(token) },
    });
    expect(await response.json()).toMatchObject({ title: "Dune" });
  });

  test("skills/list publishes a skill per resource collection", async () => {
    const { origin, issuer } = await boot();
    const listed = SkillsSchema.parse(
      await inspect(origin, await tokenFor(issuer, ADMIN_SCOPES), "--method", "skills/list"),
    );
    expect(listed.skills.map((skill) => skill.uri).sort()).toEqual(
      expect.arrayContaining(["skill://books/SKILL.md", "skill://config/SKILL.md"]),
    );
  });

  test("an anonymous caller is not offered skills for capabilities that need a token", async () => {
    const { origin } = await boot();
    const listed = SkillsSchema.parse(await inspect(origin, undefined, "--method", "skills/list"));
    expect(listed.skills.map((skill) => skill.uri)).not.toContain("skill://stats/SKILL.md");
  });
});

describe("the official MCP client", () => {
  test("an initialized session lists tools and calls one", async () => {
    const { origin, issuer } = await boot();
    const client = await officialClient(origin, await tokenFor(issuer, ADMIN_SCOPES));
    const { tools } = await client.listTools();
    const result = await client.callTool({ name: "config.get", arguments: { name: "config" } });
    await client.close();
    expect([tools.length, result.structuredContent]).toEqual([
      29,
      expect.objectContaining({ name: "config" }),
    ]);
  });
});

describe("schema parity between MCP and OpenAPI", () => {
  test("every tool's inputs are the OpenAPI operation's path-derived name or parent plus its query and body fields", async () => {
    const { origin, issuer } = await boot();
    const client = await officialClient(origin, await tokenFor(issuer, ADMIN_SCOPES));
    const { tools } = await client.listTools();
    await client.close();
    const document = OpenApiDocumentSchema.parse(
      await (await fetch(`${origin}${EndpointPath.OpenApi}`)).json(),
    );
    const operations = Object.values(document.paths).flatMap((methods) => Object.values(methods));
    const documented = tools.filter((tool) =>
      operations.some((candidate) => candidate.operationId === tool.name),
    );
    const mismatches = documented.flatMap((tool) => {
      const operation = operations.find((candidate) => candidate.operationId === tool.name);
      const queryNames = (operation?.parameters ?? [])
        .filter((p) => p.in === "query")
        .map((p) => p.name);
      const body = JsonObjectSchema.safeParse(operation?.requestBody);
      const bodyNames = body.success ? Object.keys(propertiesOf(body.data)) : [];
      const toolNames = Object.keys(propertiesOf(tool.inputSchema)).filter(
        (name) => name !== "name" && name !== "parent",
      );
      return JSON.stringify([...queryNames, ...bodyNames].sort()) ===
        JSON.stringify(toolNames.sort())
        ? []
        : [tool.name];
    });
    expect(mismatches).toEqual([]);
  });

  test("the only tools without an OpenAPI operation are the MCP-only watch tools", async () => {
    const { origin, issuer } = await boot();
    const client = await officialClient(origin, await tokenFor(issuer, ADMIN_SCOPES));
    const { tools } = await client.listTools();
    await client.close();
    const document = OpenApiDocumentSchema.parse(
      await (await fetch(`${origin}${EndpointPath.OpenApi}`)).json(),
    );
    const ids = Object.values(document.paths)
      .flatMap((methods) => Object.values(methods))
      .map((operation) => operation.operationId);
    const missing = tools.map((tool) => tool.name).filter((name) => !ids.includes(name));
    expect(missing.sort()).toEqual([StatsCapabilityId.EventsWatch, CapabilityId.OperationsWatch]);
  });
});

function propertiesOf(schema: JsonObject): JsonObject {
  const content = JsonObjectSchema.safeParse(schema.content);
  const media = content.success
    ? JsonObjectSchema.safeParse(content.data["application/json"])
    : undefined;
  const inner = media?.success ? JsonObjectSchema.safeParse(media.data.schema) : undefined;
  const source = inner?.success ? inner.data : schema;
  const properties = JsonObjectSchema.safeParse(source.properties);
  return properties.success ? properties.data : {};
}

afterAll(finishProxyIntegration);

test("the edge consumer cannot reach the API directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
