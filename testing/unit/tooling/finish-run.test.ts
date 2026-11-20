import { describe, expect, test } from "bun:test";
import { BUILD_DOCS_SCRIPT, Runner } from "@platform/constants";
import { positive, rejected, unit } from "@platform/test-factories";
import { docsCommand, finishRun } from "../../../tooling/scripts/run-tier.ts";

const PASSED = [0, 0];
const FAILED = [0, 1];
const PRODUCED = async () => 0;
const PRODUCE_FAILS = async () => 3;
const MUST_NOT_RUN = async (): Promise<number> => {
  throw new Error("documentation was produced after a failure");
};
const BUILD = [Runner.Bun, Runner.Run, BUILD_DOCS_SCRIPT];

unit(finishRun, {
  positive: [
    positive("every test passed and the documentation was written", [PASSED, true, PRODUCED], 0),
    positive("a tier without documentation needs no producer", [PASSED, false, MUST_NOT_RUN], 0),
  ],
  negative: [
    rejected("one failing test writes no documentation", [FAILED, true, MUST_NOT_RUN], 1),
    rejected("a failing producer fails the run", [PASSED, true, PRODUCE_FAILS], 1),
  ],
});

unit(docsCommand, {
  positive: [
    positive("runs the documentation build", [], BUILD),
    positive("is the same on every call", [], BUILD),
  ],
  negative: [
    rejected("an argument is ignored", ["extra"], BUILD),
    rejected("two arguments are ignored", ["extra", "more"], BUILD),
  ],
});

describe("the documentation producer is called only after a passing run", () => {
  test.each([
    ["all passed", [0, 0], true, 1],
    ["one failed", [0, 2], true, 0],
    ["not the end-to-end tier", [0, 0], false, 0],
  ])("%s", async (_name, codes, writesDocs, calls) => {
    const seen: number[] = [];
    await finishRun(codes, writesDocs, async () => {
      seen.push(1);
      return 0;
    });
    expect(seen).toHaveLength(calls);
  });
});
