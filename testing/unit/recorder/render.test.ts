import { describe, expect, test } from "bun:test";
import { LOCAL_URLS } from "@platform/config/urls";
import { CheckKind, DocCategory, StepFlag, StepSource } from "@platform/constants";
import type { StepResult } from "@platform/types";
import { concreteRequest } from "../../packages/recorder/src/concrete.ts";
import { toMdx } from "../../packages/recorder/src/mdx.ts";
import { renderStep } from "../../packages/recorder/src/render.ts";

const consoleStep: StepResult = {
  source: StepSource.Console,
  description: "Sign in",
  flag: StepFlag.Passed,
  place: "The console start page",
  action: "Click the Sign in button",
  expectation: "The console title appears",
  checks: [
    { kind: CheckKind.Visible, label: 'Text expected visible: "Console"', passed: true },
    { kind: CheckKind.Hidden, label: 'Text expected hidden: "Sign in"', passed: true },
    {
      kind: CheckKind.ForbiddenRequest,
      label: "Request forbidden and not made: /v1/stats",
      passed: true,
    },
    { kind: CheckKind.TokenStorage, label: "Token is not in browser storage", passed: false },
  ],
  evidence: { screenshot: "/kb/console-sign-in-2.png" },
};

const httpStep: StepResult = {
  source: StepSource.Http,
  description: "Read a missing book",
  flag: StepFlag.Failed,
  place: "GET /v1/publishers/acme/books/none",
  action: "Call books.get",
  expectation: "The call fails.",
  checks: [{ kind: CheckKind.Outcome, label: "Outcome is an error", passed: false }],
  evidence: {
    request: "GET /v1/publishers/acme/books/none",
    response: '{"code":"not_found"}',
    outcome: "error, HTTP 404",
    expected: "an error",
    actual: "success",
  },
};

const mcpStep: StepResult = {
  source: StepSource.Mcp,
  description: "Read a book",
  flag: StepFlag.Passed,
  place: "tools/call books.get",
  action: "Call books.get",
  expectation: "The call succeeds.",
  checks: [{ kind: CheckKind.Outcome, label: "Outcome is success", passed: true }],
  evidence: {
    request: "tools/call books.get",
    requestBody: '{"name":"publishers/acme/books/dune"}',
    response: '{"name":"dune"}',
    outcome: "ok",
    expected: "success",
    actual: "success",
  },
};

const binaryEvidence = {
  method: "POST",
  path: "/v1/assets",
  requestBodyFile: "asset's.bin",
  headers: { "content-type": "application/octet-stream", "x-content-sha256": "0".repeat(64) },
};
const binaryStep = { ...httpStep, evidence: binaryEvidence };
test("binary upload instructions preserve the file argument and media type", () => {
  const rendered = concreteRequest(binaryStep, LOCAL_URLS) ?? "";
  expect(rendered).toContain("--data-binary '@asset'\\''s.bin'");
  expect(rendered).toContain("application/octet-stream");
  expect(rendered).not.toContain("application/json");
  expect(rendered).toContain("x-content-sha256");
});

describe("a console step is rendered from its result", () => {
  test.each([
    ["the source and description", "## CONSOLE: Sign in"],
    ["the flag", "Flag: **PASSED**"],
    ["a visible-text check", '- PASSED: Text expected visible: "Console"'],
    ["a hidden-text check", '- PASSED: Text expected hidden: "Sign in"'],
    ["a forbidden-request check", "- PASSED: Request forbidden and not made: /v1/stats"],
    ["a failed token-storage check", "- FAILED: Token is not in browser storage"],
    ["the screenshot", "![Sign in](/kb/console-sign-in-2.png)"],
    ["the place", "Where: The console start page"],
    ["the action", "Action: Click the Sign in button"],
    ["the expected result", "Expected result: The console title appears"],
  ])("shows %s", (_name, fragment) => {
    expect(renderStep(consoleStep)).toContain(fragment);
  });
});

describe("an HTTP step is rendered from its result", () => {
  test.each([
    ["the source and description", "## HTTP: Read a missing book"],
    ["the failed flag", "Flag: **FAILED**"],
    ["the expected outcome", "Expected outcome: an error"],
    ["the actual outcome", "Actual outcome: success"],
    ["the request", "GET /v1/publishers/acme/books/none"],
    ["the response with its outcome", "Response (error, HTTP 404):"],
  ])("shows %s", (_name, fragment) => {
    expect(renderStep(httpStep)).toContain(fragment);
  });
});

const streamStep: StepResult = {
  ...httpStep,
  description: "Follow the operation",
  flag: StepFlag.Passed,
  checks: [
    { kind: CheckKind.Stream, label: "The stream ended with the operation done", passed: true },
  ],
  evidence: {
    request: "GET /v1/operations/op-1",
    response: 'event: operation\nid: 1\ndata: {"done":true}',
    outcome: "ok, HTTP 200",
    expected: "success",
    actual: "success",
  },
};

describe("an HTTP step that read an event stream is rendered as a stream", () => {
  test.each([
    ["the label", "Response (ok, HTTP 200), an event stream:"],
    ["the frames in a text block", "```text\nevent: operation\nid: 1"],
    ["the stream check", "- PASSED: The stream ended with the operation done"],
  ])("shows %s", (_name, fragment) => {
    expect(renderStep(streamStep)).toContain(fragment);
  });

  test("a stream step is not labelled as JSON", () => {
    expect(renderStep(streamStep)).not.toContain("```json\nevent:");
  });
});

describe("an MCP step is rendered from its result", () => {
  test.each([
    ["the source and description", "## MCP: Read a book"],
    ["the flag", "Flag: **PASSED**"],
    ["the tool call", "Tool call:"],
    ["the tool arguments", "publishers/acme/books/dune"],
    ["the result", "Result (ok):"],
    ["the expected outcome", "Expected outcome: success"],
  ])("shows %s", (_name, fragment) => {
    expect(renderStep(mcpStep)).toContain(fragment);
  });
});

describe("a page is only its results", () => {
  test("every result of the page appears in order", () => {
    const text = toMdx({
      id: "x",
      title: "T",
      intent: "I",
      category: DocCategory.Ui,
      results: [consoleStep, httpStep, mcpStep],
    });
    const positions = ["CONSOLE: Sign in", "HTTP: Read a missing", "MCP: Read a book"].map((part) =>
      text.indexOf(part),
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions.every((position) => position > 0)).toBe(true);
  });

  test("a bearer credential in the evidence is scrubbed", () => {
    const text = renderStep({
      ...httpStep,
      evidence: { ...httpStep.evidence, response: "Authorization: Bearer abc.def.ghi" },
    });
    expect(text).not.toContain("abc.def.ghi");
  });
});

const protocolRequest = {
  jsonrpc: "2.0",
  id: 7,
  method: "tasks/get",
  params: { taskId: "task-one" },
};
const protocolStep = {
  ...mcpStep,
  evidence: { rpc: protocolRequest, note: "Recorded protocol headers", response: "{}" },
};
test.each([
  ["raw method", "tasks/get"],
  ["raw task id", "task-one"],
  ["protocol headers", "Recorded protocol headers"],
])("MCP rendering keeps the recorded %s", (_name, expected) => {
  expect(concreteRequest(protocolStep, LOCAL_URLS)).toContain(expected);
});
test("MCP event responses use a text block", () => {
  const step = { ...protocolStep, checks: streamStep.checks };
  expect(renderStep(step, LOCAL_URLS)).toContain("an event stream:");
  expect(concreteRequest(mcpStep, LOCAL_URLS)).toContain("tools/call");
});

test.each([
  ["application/x-ndjson", '{"title":"A"}\n{"title":"B"}\n'],
  ["application/octet-stream", "@literal asset bytes\n"],
  ["text/plain", "a plain request"],
  ["application/x-ndjson", "invalid second line\n{\n"],
])("non-JSON %s input keeps its exact body in the curl example", (mediaType, body) => {
  const evidence = {
    method: "POST",
    path: "/v1/assets",
    headers: { "content-type": mediaType },
    requestBody: body,
  };
  const step = { ...httpStep, evidence };
  const rendered = concreteRequest(step, LOCAL_URLS);
  expect(rendered).toContain(`--data-raw '${body}'`);
});

test.each([
  ["text/event-stream", "an event stream:"],
  ["application/octet-stream", "binary stream bytes:"],
])("SDK %s responses retain their actual form", (accept, label) => {
  const evidence = { ...httpStep.evidence, headers: { accept }, response: "observed stream bytes" };
  const step = { ...httpStep, source: StepSource.Sdk, evidence };
  expect(renderStep(step)).toContain(label);
  expect(renderStep(step)).toContain("```text\nobserved stream bytes");
});

test.each([
  [4096, "```json"],
  [4097, "```text"],
  [16384, "```text"],
  [2, "```json"],
])("response length %s preserves the complete body using %s", (length, fence) => {
  const response = "x ".repeat(length).slice(0, length);
  const rendered = renderStep({ ...httpStep, evidence: { ...httpStep.evidence, response } });
  expect(rendered).toContain(`${fence}\n${response}\n`);
});

test.each([
  [4096, undefined],
  [4097, undefined],
  [4096, LOCAL_URLS],
  [4097, LOCAL_URLS],
])("recorded chunk notes preserve all %s characters with concrete URLs %s", (length, urls) => {
  const payload = "x ".repeat(length).slice(0, length);
  const note = `Recorded chunks:\n\n\`\`\`json\n${payload}\n\`\`\`\n`;
  const rendered = renderStep({ ...httpStep, evidence: { ...httpStep.evidence, note } }, urls);
  expect(rendered).toContain(payload);
  expect(rendered).toContain("```text");
});
