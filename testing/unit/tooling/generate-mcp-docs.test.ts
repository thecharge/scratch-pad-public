import { afterAll } from "bun:test";
import { join } from "node:path";
import {
  DocCategory,
  MCP_DOC_PATH,
  MCP_RECORD_PATH,
  StepFlag,
  StepSource,
} from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { generateMcpDocs } from "../../../tooling/scripts/generate-mcp-docs.ts";

afterAll(removeAll);
const step = {
  source: StepSource.Http,
  description: "Follow a task",
  flag: StepFlag.Passed,
  place: "POST /v1/assets",
  action: "Stream a file",
  expectation: "The checksum matches",
  checks: [],
  evidence: { request: "POST /v1/assets", response: "A verified task result" },
};
const page = {
  id: "mcp-tasks-and-progress",
  title: "Follow MCP tasks and progress",
  intent: "Follow a task and read its result.",
  category: DocCategory.ApiCalls,
  results: [step],
};
const ready = await makeDir();
await writeFiles(ready, { [MCP_RECORD_PATH]: JSON.stringify(page) });
const failed = await makeDir();
const failedStep = { ...step, flag: StepFlag.Failed };
await writeFiles(failed, {
  [MCP_RECORD_PATH]: JSON.stringify({ ...page, results: [failedStep] }),
});
const missing = await makeDir();
const empty = await makeDir();
await writeFiles(empty, { [MCP_RECORD_PATH]: JSON.stringify({ ...page, results: [] }) });
const broken = await makeDir();
await writeFiles(broken, { [MCP_RECORD_PATH]: "{}" });
const content = join(ready, "content");
unit(generateMcpDocs, {
  positive: [
    positive("publishes a passed live recording", [content, ready], true),
    positive(
      "keeps the observed checks and response in the client page",
      [content, ready],
      seen(
        async () =>
          (await Bun.file(join(content, MCP_DOC_PATH)).text()).includes("A verified task result"),
        true,
      ),
    ),
  ],
  negative: [
    negative("refuses a failed recording", [content, failed], { name: "Error" }),
    negative("refuses a malformed recording", [content, broken], { name: "ZodError" }),
    positive("does not publish without live evidence", [content, missing], false),
    positive("does not publish an empty recording", [content, empty], false),
  ],
});
