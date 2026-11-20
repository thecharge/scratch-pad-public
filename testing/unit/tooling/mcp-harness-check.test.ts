import { expect, test } from "bun:test";
import { join } from "node:path";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { REPO_ROOT } from "@platform/test-framework";
import { runMcpModelCheck } from "../../packages/scenarios/src/mcp-llm-check.ts";

const record = {
  mode: "scripted",
  id: "fixture",
  prompt: "Scripted fixture",
  scopes: [],
  connected: true,
  tools: [],
  calls: [],
  results: [],
  final: "Scripted assertions passed.",
  rawTranscript: "{}",
  stderr: "",
  exitCode: 0,
  problems: [],
};
const valid = JSON.stringify([record, record, record, record]);
const failed = JSON.stringify([
  { ...record, exitCode: 1, problems: ["fixture failure"] },
  record,
  record,
  record,
]);

test.each([
  ["successful injected execution", 0, valid, false, "0", 1],
  [
    "another scripted recording",
    0,
    JSON.stringify([record, record, record, { ...record, id: "other-fixture" }]),
    false,
    "0",
    1,
  ],
  ["recorded assertion failure", 0, failed, false, "1", 1],
  ["client process failure", 1, valid, false, "error:stub process failed", 0],
  ["malformed recording", 0, "not-json", false, "error:SyntaxError", 0],
  ["recording write failure", 0, valid, true, "error:stub write failed", 1],
])(
  "cost-free harness orchestration handles %s",
  async (_name, exitCode, stdout, failWrite, expected, writes) => {
    const stopped: boolean[] = [];
    const captured: string[] = [];
    const harness = {
      origin: TEST_PROXY_ORIGIN,
      token: async (_scopes: readonly string[]) => "fixture-token",
      configFor: async (_scopes: readonly string[]) => "fixture-config",
      run: async (_variables: Record<string, string>) => ({
        exitCode,
        stdout,
        stderr: "stub process failed",
      }),
      stop: async () => {
        stopped.push(true);
      },
    };
    const write = async (_path: string, content: string) => {
      captured.push(content);
      return failWrite ? Promise.reject(new Error("stub write failed")) : undefined;
    };
    const result = await runMcpModelCheck("fixture-evidence.json", async () => harness, write).then(
      String,
      (error) => `error:${error instanceof SyntaxError ? "SyntaxError" : error.message}`,
    );
    expect([result, stopped.length, captured.length]).toEqual([expected, 1, writes]);
  },
);

test.each([
  ["a passing recording", valid, 0],
  ["a failed assertion recording", failed, 1],
])("default evidence stays outside OpenSpec for %s", async (_name, stdout, expected) => {
  const paths: string[] = [];
  const stopped: boolean[] = [];
  const harness = {
    origin: TEST_PROXY_ORIGIN,
    token: async (_scopes: readonly string[]) => "fixture-token",
    configFor: async (_scopes: readonly string[]) => "fixture-config",
    run: async (_variables: Record<string, string>) => ({ exitCode: 0, stdout, stderr: "" }),
    stop: async () => {
      stopped.push(true);
    },
  };
  const write = async (path: string, _content: string) => {
    paths.push(path);
  };
  expect(await runMcpModelCheck(undefined, async () => harness, write)).toBe(expected);
  expect(paths).toEqual([join(REPO_ROOT, ".stack/e2e/mcp-harness.json")]);
  expect(stopped).toEqual([true]);
});
