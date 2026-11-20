import { afterAll } from "bun:test";
import { join } from "node:path";
import { PROTOCOLS_PAGE } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  generateProtocolDocs,
  protocolPage,
} from "../../../tooling/scripts/generate-protocol-docs.ts";

afterAll(removeAll);

const STEP = {
  id: "page-http-2",
  title: "A request",
  checked: "It works",
  version: "2",
  detail: "",
};
const PASSED = JSON.stringify({ ...STEP, passed: true });
const FAILED = JSON.stringify({ ...STEP, id: "other", passed: false });

async function folderWith(files: Record<string, string>): Promise<string[]> {
  const root = await makeDir();
  await writeFiles(root, files);
  return [join(root, "content"), root];
}

const withSteps = await folderWith({ ".stack/e2e/protocols.jsonl": `${PASSED}\n${FAILED}\n` });
const withoutFile = await folderWith({ "other.txt": "x" });
const emptyFile = await folderWith({ ".stack/e2e/protocols.jsonl": "" });
const brokenLine = await folderWith({ ".stack/e2e/protocols.jsonl": "{}\n" });
const page = async () => Bun.file(join(withSteps[0] as string, PROTOCOLS_PAGE)).text();

unit(protocolPage, {
  positive: [
    positive(
      "writes a line per step with its result and version",
      [[{ ...STEP, passed: true }]],
      seen(
        (text: unknown) =>
          String(text).includes("| page-http-2 | passed | 2 | A request | It works |"),
        true,
      ),
    ),
    positive(
      "names a failed step as failed",
      [[{ ...STEP, passed: false }]],
      seen((text: unknown) => String(text).includes("| failed |"), true),
    ),
  ],
  negative: [
    negative("needs the steps", [undefined], { name: "TypeError" }),
    negative("needs steps with a result", [[undefined]], { name: "TypeError" }),
  ],
});

unit(generateProtocolDocs, {
  positive: [
    positive("writes the page from the steps of the run", withSteps, true),
    positive(
      "the page holds both steps",
      withSteps,
      seen(
        async () => [(await page()).includes("page-http-2"), (await page()).includes("other")],
        [true, true],
      ),
    ),
  ],
  negative: [
    positive("publishes nothing when the run left no file", withoutFile, false),
    positive("publishes nothing when the file has no step", emptyFile, false),
    negative("refuses a step with the wrong shape", brokenLine, { name: "ZodError" }),
  ],
});
