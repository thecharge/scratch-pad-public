import { afterAll, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { DocCategory, StepFlag, StepSource, TransportKind } from "@platform/constants";
import { makeDir, removeAll } from "@platform/test-scenarios";
import type { Scenario, StepResult } from "@platform/types";
import { recordAll, recordScenario } from "../../packages/recorder/src/record.ts";

afterAll(removeAll);
const scenario: Scenario = {
  id: "injected",
  title: "Injected",
  intent: "Verify the recorded client",
  category: DocCategory.ApiCalls,
  authEnabled: true,
  steps: [],
};
const passed: StepResult = {
  source: StepSource.Http,
  description: "Read config",
  flag: StepFlag.Passed,
  place: "config",
  action: "Read",
  expectation: "Success",
  checks: [],
  evidence: {},
};

test.each([TransportKind.Http, TransportKind.Mcp])(
  "forwards the scenario and %s to the supplied client",
  async (transport) => {
    const seen: unknown[] = [];
    const page = await recordScenario(scenario, [transport], async (value, selected) => {
      seen.push(value, selected);
      return [passed];
    });
    expect([seen, page.results]).toEqual([[scenario, transport], [passed]]);
  },
);

const failures = [
  ["failed step", async () => [{ ...passed, flag: StepFlag.Failed }]],
  [
    "client error",
    async () => {
      throw new Error("client refused");
    },
  ],
] as const;

test.each(failures)("publishes no files after an injected %s", async (_kind, run) => {
  const directory = await makeDir();
  await expect(
    recordAll([scenario], directory, [TransportKind.Http], undefined, run),
  ).rejects.toThrow();
  expect(await readdir(directory)).toEqual([]);
});
