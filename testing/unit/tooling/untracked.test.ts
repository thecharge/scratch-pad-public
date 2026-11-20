import { expect, test } from "bun:test";
import { GIT_UNTRACKED_COMMAND, VERIFY_COMMANDS, VerifyStep } from "@platform/constants";
import { positive, rejected, unit } from "@platform/test-factories";
import type { RunOptions, RunResult } from "@platform/types";
import { checkUntracked, untrackedProblems } from "../../../tooling/scripts/check-untracked.ts";

const clean = async (): Promise<RunResult> => ({ exitCode: 0, stdout: "", stderr: "" });
const cleanOther = async (
  command: readonly string[],
  options: RunOptions = {},
): Promise<RunResult> => {
  expect(command).toEqual(GIT_UNTRACKED_COMMAND);
  expect(options.cwd).toBe("/fixture");
  return clean();
};
const dirty = async (): Promise<RunResult> => ({
  exitCode: 0,
  stdout: "packages/sdk/openapi-ts-error-1.log\u0000",
  stderr: "",
});
const broken = async (): Promise<RunResult> => ({
  exitCode: 128,
  stdout: "",
  stderr: "not a git repository",
});

unit(untrackedProblems, {
  positive: [
    positive("an empty listing has no problems", [""], []),
    positive("empty fields do not invent paths", ["\u0000"], []),
  ],
  negative: [
    rejected(
      "an SDK crash log is reported",
      ["packages/sdk/openapi-ts-error-1.log\u0000"],
      ["Untracked file remains after verification: packages/sdk/openapi-ts-error-1.log"],
    ),
    rejected(
      "spaces and newlines in names remain intact",
      ["a b\u0000c\nd\u0000"],
      [
        "Untracked file remains after verification: a b",
        "Untracked file remains after verification: c\nd",
      ],
    ),
  ],
});

unit(checkUntracked, {
  positive: [
    positive("a tracked tree passes", [undefined, clean], 0),
    positive("the selected repository is inspected", ["/fixture", cleanOther], 0),
  ],
  negative: [
    rejected("a generated crash log blocks delivery", [undefined, dirty], 1),
    rejected("a git failure cannot pass as an empty tree", [undefined, broken], 1),
  ],
});

test("untracked files are checked after every verification phase", async () => {
  expect(Object.keys(VERIFY_COMMANDS).at(-1)).toBe(VerifyStep.Untracked);
});
