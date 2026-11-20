import { afterAll } from "bun:test";
import { join } from "node:path";
import { PROTOCOL_REPORT_ENV } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll } from "@platform/test-scenarios";
import type { ProtocolStepSpec } from "@platform/types";
import { documentStep } from "../../packages/scenarios/src/protocol-report.ts";

const file = join(await makeDir(), "protocols.jsonl");
Bun.env[PROTOCOL_REPORT_ENV] = file;

afterAll(async () => {
  delete Bun.env[PROTOCOL_REPORT_ENV];
  await removeAll();
});

const spec = (id: string): ProtocolStepSpec => ({
  id,
  title: "title",
  checked: "checked",
  version: "2",
});
const lines = async () =>
  (await Bun.file(file).text())
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
const last = async () => (await lines()).at(-1);
const works = async () => undefined;
const breaks = async () => {
  throw new Error("the check failed");
};

unit(documentStep, {
  positive: [
    positive(
      "a step that works is written as passed",
      [spec("works"), works],
      seen(async () => (await last()).passed, true),
    ),
    positive(
      "the step keeps its description and version",
      [spec("kept"), works],
      seen(async () => [(await last()).id, (await last()).version], ["kept", "2"]),
    ),
  ],
  negative: [
    negative("a step that fails raises its error", [spec("fails"), breaks], {
      message: "the check failed",
    }),
    negative("needs the work to run", [spec("none"), undefined], { name: "TypeError" }),
  ],
});
