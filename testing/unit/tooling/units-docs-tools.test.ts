import { afterAll } from "bun:test";
import { join } from "node:path";
import {
  MessageId,
  OPENAPI_STABILITY_KEY,
  StepFlag,
  StepSource,
  Surface,
} from "@platform/constants";
import { message } from "@platform/messages";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { DocsUrls, LiveTool, OpenApiEntry, StepResult } from "@platform/types";
import { gettingStartedPage, markMissingUrls } from "../../../tooling/scripts/docs-urls.ts";
import { operationBody, stabilityOf } from "../../../tooling/scripts/operation-docs.ts";

afterAll(removeAll);

const URLS: DocsUrls = {
  urls: {
    [Surface.Console]: "https://console.example.test",
    [Surface.Api]: "https://api.example.test",
    [Surface.Mcp]: "https://api.example.test/mcp",
    [Surface.Docs]: "https://docs.example.test",
  },
  missing: [],
};
const MISSING: DocsUrls = { ...URLS, missing: [Surface.Mcp] };
const GENERATED_PAGE = "---\ntitle: T\ngenerated: true\n---\n\nbody\n";
const HAND_PAGE = "---\ntitle: T\n---\n\nbody\n";
const readText = (path: string) => async () => Bun.file(path).text();

const noticeRoot = await makeDir();
await writeFiles(noticeRoot, {
  "guides/a.md": GENERATED_PAGE,
  "guides/b.md": GENERATED_PAGE,
  "guides/hand.md": HAND_PAGE,
});
const cleanRoot = await makeDir();
await writeFiles(cleanRoot, { "guides/a.md": GENERATED_PAGE });
const handRoot = await makeDir();
await writeFiles(handRoot, { "guides/hand.md": HAND_PAGE, "index.md": GENERATED_PAGE });
const emptyRoot = await makeDir();

unit(markMissingUrls, {
  positive: [
    positive("every generated page is marked", [noticeRoot, MISSING], 2),
    positive(
      "the notice names the missing surface",
      [noticeRoot, MISSING],
      seen(async () => (await readText(join(noticeRoot, "guides/a.md"))()).includes("mcp"), true),
    ),
    positive("pages are counted even when no url is missing", [cleanRoot, URLS], 1),
  ],
  negative: [
    rejected("a hand written page is left alone", [handRoot, MISSING], 0),
    rejected(
      "a hand written page keeps its text",
      [handRoot, MISSING],
      seen(async () => (await readText(join(handRoot, "guides/hand.md"))()) === HAND_PAGE, true),
    ),
    rejected("a folder without pages marks none", [emptyRoot, MISSING], 0),
  ],
});

const startRoot = await makeDir();
const completeRoot = await makeDir();

unit(gettingStartedPage, {
  positive: [
    positive(
      "the page is written under the general folder",
      [startRoot, MISSING],
      join(startRoot, "general", "getting-started.md"),
    ),
    positive(
      "every surface address is listed",
      [completeRoot, URLS],
      seen(
        async (path: string) => (await Bun.file(path).text()).includes("https://docs.example.test"),
        true,
      ),
    ),
  ],
  negative: [
    rejected(
      "a missing surface is marked as local",
      [startRoot, MISSING],
      seen(
        async (path: string) =>
          (await Bun.file(path).text()).includes(message(MessageId.StartLocal)),
        true,
      ),
    ),
    rejected(
      "a configured surface is not marked as local",
      [completeRoot, URLS],
      seen(
        async (path: string) =>
          (await Bun.file(path).text()).includes(message(MessageId.StartLocal)),
        false,
      ),
    ),
  ],
});

const NO_RESPONSES = {};
const BETA_OPERATION = {
  operationId: "books.get",
  responses: NO_RESPONSES,
  [OPENAPI_STABILITY_KEY]: "beta",
};
const ALPHA_OPERATION = { ...BETA_OPERATION, [OPENAPI_STABILITY_KEY]: "alpha" };
const PLAIN_OPERATION = { operationId: "books.get", responses: NO_RESPONSES };
const entryOf = (operation: object) =>
  ({ method: "get", path: "/v1/books", operation }) as unknown as OpenApiEntry;
const GET_ENTRY = entryOf(BETA_OPERATION);
const ALPHA_ENTRY = entryOf(ALPHA_OPERATION);
const PLAIN_ENTRY = entryOf(PLAIN_OPERATION);
const TOOL: LiveTool = { name: "books.get", description: "Gets a book", inputSchema: {} };
const EVIDENCE = { request: "GET /v1/books", outcome: "success", response: "{}" };
const RESULT = {
  source: StepSource.Http,
  capability: "books.get",
  description: "Read a book",
  flag: StepFlag.Passed,
  place: "api",
  action: "get",
  expectation: "ok",
  checks: [],
  evidence: EVIDENCE,
} as unknown as StepResult;
const textIncludes = (needle: string) => (text: string) => text.includes(needle);

unit(stabilityOf, {
  positive: [
    positive("the declared stability is returned", [GET_ENTRY], "beta"),
    positive("another stability is returned as declared", [ALPHA_ENTRY], "alpha"),
  ],
  negative: [
    rejected("an operation without stability gives empty text", [PLAIN_ENTRY], ""),
    negative("a missing entry throws", [undefined], { name: "TypeError" }),
  ],
});

unit(operationBody, {
  positive: [
    positive(
      "a run is shown as an example",
      [GET_ENTRY, TOOL, [RESULT]],
      seen(textIncludes("Read a book"), true),
    ),
    positive(
      "the matching MCP exchange is retained beside its HTTP example",
      [GET_ENTRY, TOOL, [RESULT, { ...RESULT, source: StepSource.Mcp }]],
      seen(textIncludes("Over MCP"), true),
    ),
    positive(
      "the tool is described",
      [GET_ENTRY, TOOL, [RESULT]],
      seen(textIncludes("Gets a book"), true),
    ),
  ],
  negative: [
    rejected(
      "an operation without runs says so",
      [GET_ENTRY, TOOL, []],
      seen(textIncludes(message(MessageId.OperationNoExamples)), true),
    ),
    rejected(
      "an operation without a tool says so",
      [GET_ENTRY, undefined, [RESULT]],
      seen(textIncludes(message(MessageId.OperationNoTool)), true),
    ),
  ],
});
