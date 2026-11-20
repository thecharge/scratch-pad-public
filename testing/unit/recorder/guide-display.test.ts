import { expect, test } from "bun:test";
import {
  CheckKind,
  DOCS_PAGE_TOKEN,
  DocCategory,
  GUIDE_MEASUREMENT,
  GUIDE_PROGRESS_SAMPLE,
  GUIDE_RAW_DIRECTORY,
  MCP_TASK_GET,
  McpTaskStatus,
  MessageId,
  StepFlag,
  StepSource,
} from "@platform/constants";
import { message } from "@platform/messages";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import type { RecordedPage, StepResult } from "@platform/types";
import { guidePage, guideResults } from "../../packages/recorder/src/guide-display.ts";

const step = (response: string): StepResult => ({
  source: StepSource.Http,
  description: "recorded response",
  flag: StepFlag.Passed,
  place: "response",
  action: "read",
  expectation: "the assertions pass",
  checks: [{ kind: CheckKind.Outcome, label: "HTTP 200", passed: true }],
  evidence: { response },
});
const page = (results: StepResult[]): RecordedPage => ({
  id: "guide-display-proof",
  title: "Read the response",
  intent: "Read the recorded result.",
  category: DocCategory.ApiCalls,
  results,
});
const saved = async () => undefined;
const ordinary = step('{"count":7,"done":true}');
const ordinaryShown = step(JSON.stringify({ count: 7, done: true }, null, 2));
const measured = step('{"name":"stats","process":{"rssBytes":123},"total":4}');
const measuredShown = step(
  JSON.stringify(
    { name: "stats", process: { rssBytes: GUIDE_MEASUREMENT }, total: GUIDE_MEASUREMENT },
    null,
    2,
  ),
);

unit(guideResults, {
  positive: [
    positive("measurements become labelled values", [[measured]], [measuredShown]),
    positive("ordinary counts remain actual values", [[ordinary]], [ordinaryShown]),
  ],
  negative: [
    rejected("malformed response bytes are retained", [[step("{broken")]], [step("{broken")]),
    rejected(
      "failure flags and checks are retained",
      [[{ ...ordinary, flag: StepFlag.Failed }]],
      [{ ...ordinaryShown, flag: StepFlag.Failed }],
    ),
  ],
});

unit(guidePage, {
  positive: [
    positive("the page labels representative output", [page([measured]), saved], {
      ...page([measuredShown]),
      intent: `${page([]).intent} ${message(MessageId.GuideDisplayValues)}`,
    }),
    positive("an empty page retains its inventory", [page([]), saved], {
      ...page([]),
      intent: `${page([]).intent} ${message(MessageId.GuideDisplayValues)}`,
    }),
  ],
  negative: [
    negative(
      "a failed scenario cannot publish",
      [page([{ ...ordinary, flag: StepFlag.Failed }]), saved],
      { message: expect.stringContaining("guide-display-proof") },
    ),
    negative(
      "an evidence write failure prevents output",
      [
        page([ordinary]),
        async () => {
          throw new Error("recording write failed");
        },
      ],
      { message: "recording write failed" },
    ),
  ],
});

test.each([123, 456])(
  "keeps the complete raw capture and leaves source data unchanged: %s",
  async (rssBytes) => {
    const input = page([step(JSON.stringify({ name: "stats", process: { rssBytes } }))]);
    const original = JSON.stringify(input);
    let written = "";
    let destination = "";
    const shown = await guidePage(input, async (path, bytes) => {
      destination = path;
      written = bytes;
    });
    expect(written).toBe(original);
    expect(destination).toContain(GUIDE_RAW_DIRECTORY);
    expect(JSON.stringify(input)).toBe(original);
    expect(shown.results[0]?.evidence.response).toContain(GUIDE_MEASUREMENT);
  },
);

test.each([
  [4, 9],
  [5, 8],
])(
  "shows representative progress while retaining result and error events: %j",
  async (first, second) => {
    const progress = [0, first, second, 10]
      .map(
        (value) =>
          `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/progress", params: { progress: value, total: 10 } })}\n\n`,
      )
      .join("");
    const ending =
      'event: message\ndata: {"result":{"done":true},"id":1}\n\nevent: error\ndata: {"error":"kept"}\n\n';
    const input = step(progress + ending);
    const shown = (await guideResults([input]))[0]?.evidence.response ?? "";
    expect(shown.match(/notifications\/progress/g)).toHaveLength(2);
    expect(shown.split(GUIDE_PROGRESS_SAMPLE)).toHaveLength(3);
    expect(shown).toContain('"total":10');
    expect(shown).toContain('"done":true');
    expect(shown).toContain('"error":"kept"');
    expect(input.evidence.response).toBe(progress + ending);
  },
);

test.each([
  ['{"count":', "7}"],
  ["{", '"count":7}'],
])("combines read boundaries without changing the parsed payload: %j", async (first, second) => {
  const chunks = [first, second];
  const input = step("ok");
  input.evidence.note = `Capture:\n\n\`\`\`json\n${JSON.stringify({ chunks, httpVersion: "3" })}\n\`\`\``;
  const shown = (await guideResults([input]))[0]?.evidence.note ?? "";
  const capture = JSON.parse(shown.split("```json\n")[1]?.split("\n```")[0] ?? "{}");
  expect(capture.httpVersion).toBe("3");
  expect(capture.chunks).toHaveLength(1);
  expect(JSON.parse(capture.chunks[0])).toEqual({ count: 7 });
  expect(input.evidence.note).toContain(JSON.stringify(chunks));
});

test.each(["pageToken", "nextPageToken"])("labels nested opaque values: %s", async (key) => {
  const input = step(
    JSON.stringify({ chunks: [JSON.stringify({ [key]: "opaque-value", count: 3 })] }),
  );
  const original = JSON.stringify(input);
  const shown = (await guideResults([input]))[0]?.evidence.response ?? "{}";
  const payload = JSON.parse(JSON.parse(shown).chunks[0]);
  expect(payload).toEqual({ [key]: DOCS_PAGE_TOKEN, count: 3 });
  expect(JSON.stringify(input)).toBe(original);
});

test.each([{ nextPageToken: "" }, { unrelated: "opaque-value" }])(
  "retains empty tokens and ordinary values: %j",
  async (value) => {
    const shown = (await guideResults([step(JSON.stringify(value))]))[0]?.evidence.response ?? "{}";
    expect(JSON.parse(shown)).toEqual(value);
  },
);

test.each([null, "invalid"])("retains malformed progress counters: %j", async (progress) => {
  const frame = `event: message\ndata: ${JSON.stringify({ method: "notifications/progress", params: { progress } })}\n\n`;
  const shown = (await guideResults([step(frame.repeat(3))]))[0]?.evidence.response ?? "";
  expect(shown.match(/notifications\/progress/g)).toHaveLength(3);
  expect(shown).not.toContain(GUIDE_PROGRESS_SAMPLE);
});

test.each(['{"error":{"method":"notifications/progress"}}', '{"method":"notifications/progress"'])(
  "retains nested or malformed progress-like events: %s",
  async (payload) => {
    const response = `event: message\ndata: ${payload}\n\n`.repeat(3);
    const shown = (await guideResults([step(response)]))[0]?.evidence.response ?? "";
    expect(shown.match(/notifications\/progress/g)).toHaveLength(3);
    expect(shown.match(/event: message/g)).toHaveLength(3);
  },
);

function poll(taskId: string, status = McpTaskStatus.Working): StepResult {
  const task = {
    taskId,
    status,
    createdAt: "2001-01-01T00:00:00.000Z",
    lastUpdatedAt: "2001-01-01T00:00:00.000Z",
    ttlMs: 1000,
    pollIntervalMs: 25,
  };
  const original = step(JSON.stringify({ result: task }));
  const params = { taskId };
  const rpc = { method: MCP_TASK_GET, params };
  return { ...original, evidence: { ...original.evidence, rpc } };
}

const working = poll("task-a");
const terminal = poll("task-a", McpTaskStatus.Completed);
const wrongMethod = { ...working.evidence.rpc, method: "tools/call" };
const otherMethod = { ...working, evidence: { ...working.evidence, rpc: wrongMethod } };
const noParams = { method: MCP_TASK_GET };
const missingParams = { ...working, evidence: { ...working.evidence, rpc: noParams } };
const brokenPoll = { ...working, evidence: { ...working.evidence, response: "{broken" } };
const invalidTask = JSON.stringify({ result: { taskId: "task-a", status: "working" } });
const malformedPoll = { ...working, evidence: { ...working.evidence, response: invalidTask } };
const withError = JSON.parse(working.evidence.response ?? "{}");
withError.error = { code: -1, message: "failed" };
const errorPoll = {
  ...working,
  evidence: { ...working.evidence, response: JSON.stringify(withError) },
};
const failedCheck = { kind: CheckKind.Outcome, label: "failed", passed: false };
const failedPoll = { ...working, checks: [failedCheck] };

test.each([2, 5])("samples working polls while retaining every raw step: %s", async (count) => {
  const input = page([...Array.from({ length: count }, () => working), terminal]);
  const original = JSON.stringify(input);
  let raw = "";
  const shown = await guidePage(input, async (_path, bytes) => {
    raw = bytes;
  });
  expect(raw).toBe(original);
  expect(JSON.parse(raw).results).toHaveLength(count + 1);
  expect(JSON.stringify(input)).toBe(original);
  expect(shown.results).toEqual(await guideResults([working, terminal]));
  expect(shown.intent).toContain("polls are shown once per task");
});

test.each([
  ["different task handles", [working, poll("task-b")]],
  ["terminal task results", [terminal, terminal]],
  ["other RPC methods", [otherMethod, otherMethod]],
  ["missing request parameters", [missingParams, missingParams]],
  ["malformed response bytes", [brokenPoll, brokenPoll]],
  ["malformed task records", [malformedPoll, malformedPoll]],
  ["RPC errors", [errorPoll, errorPoll]],
  ["failed assertions", [failedPoll, failedPoll]],
] as const)("retains unsampled %s", async (_name, results) => {
  expect(await guideResults(results)).toHaveLength(2);
});
