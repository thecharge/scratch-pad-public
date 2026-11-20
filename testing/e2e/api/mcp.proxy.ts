import { afterAll, describe, expect, test } from "bun:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { AuthScheme, EndpointPath, ErrorReason, HttpHeader } from "@platform/constants";
import {
  ADMIN_SCOPES,
  READER_SCOPES,
  thrownBy,
  tokenFor,
  WRITER_SCOPES,
} from "@platform/test-framework";
import { JsonObjectSchema } from "@platform/types";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const PARENT = "publishers/acme";

async function boot() {
  const { issuer, origin } = await proxyFixture({
    enabled: true,
    domain: "mcp.e2e",
    reindexStepMs: 0,
  });
  const as = async (scopes: readonly string[]) => {
    const token = await tokenFor(issuer, scopes);
    const headers = { [HttpHeader.Authorization]: [AuthScheme.Bearer, token].join(" ") };
    const transport = new StreamableHTTPClientTransport(
      new URL([origin, EndpointPath.Mcp].join("")),
      { requestInit: { headers } },
    );
    const client = new Client({ name: "mcp-e2e", version: "1" });
    await client.connect(transport);
    return client;
  };
  return { as };
}

describe("API over MCP: tools", () => {
  test.each([
    ["an administrator", ADMIN_SCOPES, true],
    ["a reader", READER_SCOPES, false],
  ])("%s sees the tools their scopes allow", async (_name, scopes, seesAdminTool) => {
    const { as } = await boot();
    const client = await as(scopes);
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect([names.includes("books.get"), names.includes("stats.get")]).toEqual([
      true,
      seesAdminTool,
    ]);
  });
});

describe("API over MCP: book lifecycle", () => {
  test("a book is created, read, changed and archived with tool calls", async () => {
    const { as } = await boot();
    const client = await as(WRITER_SCOPES);
    const name = `${PARENT}/books/dune`;
    const created = await client.callTool({
      name: "books.create",
      arguments: { parent: PARENT, bookId: "dune", title: "Dune" },
    });
    const read = await client.callTool({ name: "books.get", arguments: { name } });
    const changed = await client.callTool({
      name: "books.update",
      arguments: { name, updateMask: "title", title: "Dune Messiah" },
    });
    const archived = await client.callTool({ name: "books.archive", arguments: { name } });
    expect([created, read, changed, archived].map((result) => result.isError)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    const contents = [changed, archived].map((result) =>
      JsonObjectSchema.parse(result.structuredContent),
    );
    expect([contents[0]?.title, contents[1]?.state]).toEqual(["Dune Messiah", "ARCHIVED"]);
  });
});

describe("API over MCP: errors carry the AIP-193 reason", () => {
  test.each([
    ["a missing book", "books.get", { name: `${PARENT}/books/none` }, ErrorReason.ResourceNotFound],
    [
      "a second archive",
      "books.archive",
      { name: `${PARENT}/books/dune` },
      ErrorReason.InvalidTransition,
    ],
  ])("%s", async (_name, tool, args, reason) => {
    const { as } = await boot();
    const client = await as(WRITER_SCOPES);
    await client.callTool({
      name: "books.create",
      arguments: { parent: PARENT, bookId: "dune", title: "Dune" },
    });
    await client.callTool({ name: "books.archive", arguments: { name: `${PARENT}/books/dune` } });
    const result = await client.callTool({ name: tool, arguments: args });
    expect([result.isError, JSON.stringify(result.structuredContent ?? result.content)]).toEqual([
      true,
      expect.stringContaining(reason),
    ]);
  });

  test("a reader cannot call a tool that is hidden from them", async () => {
    const { as } = await boot();
    const client = await as(READER_SCOPES);
    const failure = await thrownBy(() =>
      client.callTool({
        name: "books.create",
        arguments: { parent: PARENT, bookId: "x", title: "X" },
      }),
    );
    expect(String(failure)).toContain("Tool books.create not found");
  });
});

afterAll(finishProxyIntegration);

test("the edge consumer cannot reach the API directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
