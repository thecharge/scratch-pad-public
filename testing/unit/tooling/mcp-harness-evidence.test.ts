import { expect, test } from "bun:test";
import { McpHarnessEvidenceListSchema } from "@platform/types";

const success = {
  mode: "scripted",
  id: "lifecycle",
  prompt: "Use the MCP tools",
  scopes: ["read", "write"],
  connected: true,
  tools: ["mcp__platform__books_create"],
  calls: [],
  results: [],
  final: "Archived the book.",
  rawTranscript: "{}",
  stderr: "",
  exitCode: 0,
  problems: [],
};
const failure = { ...success, connected: false, exitCode: 1, problems: ["MCP did not connect"] };
test.each([
  ["four complete recordings", [success, success, success, success], true],
  ["four recordings with an observed failure", [success, failure, success, success], true],
  ["no scripted recordings", [], false],
  ["live model recording", [{ ...success, mode: "live" }, success, success, success], false],
  [
    "a missing raw transcript",
    [{ ...success, rawTranscript: undefined }, success, success, success],
    false,
  ],
])("harness evidence validates %s", (_name, input, expected) => {
  expect(McpHarnessEvidenceListSchema.safeParse(input).success).toBe(expected);
});
