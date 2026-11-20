import { StepFlag, TransportKind } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import type { Exchange, RecordedPage } from "@platform/types";
import { mcpRecordedPage } from "../../packages/scenarios/src/mcp-recording.ts";

const exchange: Exchange = {
  transport: TransportKind.Mcp,
  description: "Read a task",
  request: "POST /mcp",
  requestBody: '{"jsonrpc":"2.0","id":1,"method":"tasks/get","params":{"taskId":"one"}}',
  headers: { "mcp-protocol-version": "2026-07-28" },
  authorized: true,
  failed: false,
  status: 200,
  response: '{"result":{"status":"completed"}}',
};
const refused = { ...exchange, failed: true };
const malformed = { ...exchange, requestBody: "{" };
unit(mcpRecordedPage, {
  positive: [
    positive(
      "keeps the recorded method and metadata",
      [[exchange]],
      seen(async (page: RecordedPage) => page.results[0]?.evidence.rpc?.method, "tasks/get"),
    ),
    positive(
      "keeps the observed stream frames",
      [[{ ...exchange, response: "event: message\ndata: {}\n\n" }]],
      seen(
        async (page: RecordedPage) => page.results[0]?.evidence.response,
        "event: message\ndata: {}\n\n",
      ),
    ),
  ],
  negative: [
    positive(
      "a failed request stays failed",
      [[refused]],
      seen(async (page: RecordedPage) => page.results[0]?.flag, StepFlag.Failed),
    ),
    negative("refuses a malformed request envelope", [[malformed]], { name: "SyntaxError" }),
    positive(
      "empty observations remain empty",
      [[]],
      seen(async (page: RecordedPage) => page.results.length, 0),
    ),
  ],
});
