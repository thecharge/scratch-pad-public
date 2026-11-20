import { afterAll } from "bun:test";
import { join } from "node:path";
import {
  ASSET_DOC_PATH,
  ASSET_RECORD_PATH,
  DocCategory,
  StepFlag,
  StepSource,
} from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { generateAssetDocs } from "../../../tooling/scripts/generate-asset-docs.ts";

afterAll(removeAll);
const step = {
  source: StepSource.Http,
  description: "Upload a private asset",
  flag: StepFlag.Passed,
  place: "POST /v1/assets",
  action: "Stream a file",
  expectation: "The checksum matches",
  checks: [],
  evidence: { request: "POST /v1/assets", response: "A verified private asset" },
};
const page = {
  id: "private-assets",
  title: "Upload and download private assets",
  intent: "Stream a file and read its verified bytes.",
  category: DocCategory.ApiCalls,
  results: [step],
};
const ready = await makeDir();
await writeFiles(ready, { [ASSET_RECORD_PATH]: JSON.stringify(page) });
const failed = await makeDir();
const failedStep = { ...step, flag: StepFlag.Failed };
await writeFiles(failed, {
  [ASSET_RECORD_PATH]: JSON.stringify({ ...page, results: [failedStep] }),
});
const missing = await makeDir();
const empty = await makeDir();
await writeFiles(empty, { [ASSET_RECORD_PATH]: JSON.stringify({ ...page, results: [] }) });
const broken = await makeDir();
await writeFiles(broken, { [ASSET_RECORD_PATH]: "{}" });
const content = join(ready, "content");
unit(generateAssetDocs, {
  positive: [
    positive("publishes a passed live recording", [content, ready], true),
    positive(
      "keeps the observed checks and response in the client page",
      [content, ready],
      seen(
        async () =>
          (await Bun.file(join(content, ASSET_DOC_PATH)).text()).includes(
            "A verified private asset",
          ),
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
