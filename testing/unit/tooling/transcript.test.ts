import { describe, expect, test } from "bun:test";
import { parseTranscript } from "@platform/test-scenarios";

const SERVER = { name: "platform", status: "connected" };
const INIT = { type: "system", mcp_servers: [SERVER], tools: ["Bash", "mcp__platform__books_get"] };
const USE = {
  type: "tool_use",
  name: "mcp__platform__books_get",
  input: { name: "publishers/a/books/b" },
};
const BASH = { type: "tool_use", name: "Bash", input: {} };
const OUTPUT = { type: "tool_result", content: '{"title":"Dune"}' };
const CALL = { type: "assistant", message: { content: [USE] } };
const OTHER = { type: "assistant", message: { content: [BASH] } };
const RESULT = { type: "user", message: { content: [OUTPUT] } };
const FINAL = { type: "result", result: "The title is Dune." };
const FAILED = { ...INIT, mcp_servers: [{ ...SERVER, status: "failed" }] };
const lines = (...events: object[]) => events.map((event) => JSON.stringify(event)).join("\n");

describe("LLM transcript parser", () => {
  test("reads the connection, offered tools, calls, results and answer", () => {
    const parsed = parseTranscript(lines(INIT, CALL, RESULT, FINAL));
    expect([
      parsed.connected,
      parsed.tools,
      parsed.calls.map((call) => call.tool),
      parsed.final,
    ]).toEqual([
      true,
      ["mcp__platform__books_get"],
      ["mcp__platform__books_get"],
      "The title is Dune.",
    ]);
  });

  test("keeps the input of a call and the content of a result", () => {
    const parsed = parseTranscript(lines(INIT, CALL, RESULT));
    expect([parsed.calls[0]?.input, parsed.results]).toEqual([
      USE.input,
      [JSON.stringify(OUTPUT.content)],
    ]);
  });

  test("ignores other tools and lines that are not JSON", () => {
    expect(parseTranscript(`garbage\n${lines(INIT, OTHER)}`).calls).toEqual([]);
  });

  test("a server that failed to connect is reported", () => {
    expect(parseTranscript(lines(FAILED)).connected).toBe(false);
  });
});
