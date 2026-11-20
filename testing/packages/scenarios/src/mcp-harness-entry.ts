import { strict as assert } from "node:assert";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { MCP_HARNESS_MODE, MCP_PROTOCOL_VERSION } from "@platform/constants";
import {
  BookListSchema,
  type JsonObject,
  JsonObjectSchema,
  type TranscriptCall,
} from "@platform/types";
import { all } from "@platform/util";
import { llmScenarios } from "./llm-scenarios.ts";

const configs: Record<string, string> = JSON.parse(Bun.env.TEST_MODEL_CONFIGS ?? "{}");
const evidence = [];
for (const scenario of llmScenarios()) {
  const config = await Bun.file(configs[scenario.id] ?? "").json();
  const endpoint = config.mcpServers.platform;
  const exchanges: JsonObject[] = [];
  const pending: Promise<void>[] = [];
  const calls: TranscriptCall[] = [];
  const results: string[] = [];
  const observedFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const sent = request.clone();
    const response = await fetch(request);
    const received = response.clone();
    pending.push(
      (async () => {
        exchanges.push({
          method: sent.method,
          request: await sent.text(),
          status: received.status,
          response: await received.text(),
        });
      })(),
    );
    return response;
  };
  const mode = { pin: MCP_PROTOCOL_VERSION };
  const client = new Client(
    { name: "scripted-harness", version: "1" },
    { versionNegotiation: { mode } },
  );
  const invoke = async (name: string, input: JsonObject = {}) => {
    calls.push({ tool: name, input });
    const result = await client.callTool({ name, arguments: input });
    assert.notEqual(result.isError, true);
    results.push(JSON.stringify(result));
    return result;
  };
  let tools: string[] = [];
  let connected = false;
  const problems: string[] = [];
  const requestInit = { headers: endpoint.headers ?? {} };
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(endpoint.url), {
        requestInit,
        fetch: observedFetch,
      }),
    );
    connected = true;
    tools = (await client.listTools()).tools.map((tool) => tool.name);
    const parent = "publishers/acme";
    const plans: Record<string, () => Promise<void>> = {
      lifecycle: async () => {
        await invoke("books.create", { parent, bookId: "emma", title: "Emma by Jane Austen" });
        await invoke("books.archive", { name: `${parent}/books/emma` });
        const page = await invoke("books.list", { parent });
        const books = BookListSchema.parse(page.structuredContent);
        assert(books.books.some((book) => book.state === "ARCHIVED"));
        const response = await fetch(`${Bun.env.TEST_MODEL_ORIGIN}/v1/${parent}/books`, {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${Bun.env.TEST_MODEL_TOKEN}`,
          },
        });
        assert.equal(response.status, 200);
        assert(
          BookListSchema.parse(await response.json()).books.some(
            (book) => book.state === "ARCHIVED",
          ),
        );
      },
      "reader-cannot-write": async () => {
        assert(!tools.includes("books.create"));
        const denied = await client
          .callTool({
            name: "books.create",
            arguments: { parent, bookId: "blocked", title: "Blocked" },
          })
          .then(
            (result) => result.isError === true,
            () => true,
          );
        assert(denied);
      },
      "anonymous-sees-public-only": async () => {
        assert(!tools.includes("books.create"));
        assert(!tools.includes("books.list"));
        assert(!tools.includes("stats.get"));
        const config = await invoke("config.get", { name: "config" });
        assert.equal(JsonObjectSchema.parse(config.structuredContent).bannerText, "Welcome");
      },
      "skill-tool": async () => {
        await invoke("skills.list");
        const skill = await invoke("skills.get", { name: "skills/working-with-books" });
        const text = JSON.stringify(skill);
        assert(text.includes("books.create"));
        assert(text.includes("write"));
        assert(!tools.includes("stats.get"));
      },
    };
    const plan = plans[scenario.id];
    assert(plan !== undefined);
    await plan();
  } catch (error) {
    problems.push(String(error));
  } finally {
    await client.close();
    await all(pending.map((capture) => async () => capture));
  }
  evidence.push({
    mode: MCP_HARNESS_MODE,
    id: scenario.id,
    prompt: "Deterministic scripted MCP acceptance; no model inference.",
    scopes: scenario.scopes,
    connected,
    tools,
    calls,
    results,
    final: problems.length === 0 ? "Scripted assertions passed." : "Scripted assertions failed.",
    rawTranscript: JSON.stringify({ mode: MCP_HARNESS_MODE, exchanges }),
    stderr: "",
    exitCode: problems.length === 0 ? 0 : 1,
    problems,
  });
}
process.stdout.write(JSON.stringify(evidence));
