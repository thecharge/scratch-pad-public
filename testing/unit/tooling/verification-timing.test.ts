import { afterAll, expect, test } from "bun:test";
import { join } from "node:path";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { StepTiming } from "@platform/types";
import { measurePhase, writeTimings } from "../../../tooling/scripts/verification-timing.ts";

afterAll(removeAll);

const successful: StepTiming[] = [];
const counted: StepTiming[] = [];
const returned: StepTiming[] = [];
const failed: StepTiming[] = [];
const crashed: StepTiming[] = [];
const passing = async () => 0;
const count = async () => 27;
const value = async () => ["recorded page"];
const failing = async () => 23;
const crash = async (): Promise<number> => {
  throw new RangeError("recorder failed");
};

unit(measurePhase, {
  positive: [
    positive(
      "a successful exit status records a passing phase",
      ["build", passing, successful, true],
      seen(
        async (code: number) => [code, successful[0]?.ok, successful[0]?.step],
        [0, true, "build"],
      ),
    ),
    positive(
      "a returned page count is not an exit status",
      ["pages", count, counted],
      seen(async (result: number) => [result, counted[0]?.ok], [27, true]),
    ),
    positive("a non-status result is preserved", ["record", value, returned], ["recorded page"]),
  ],
  negative: [
    rejected(
      "a failing exit status is preserved and recorded",
      ["build", failing, failed, true],
      seen(async (code: number) => [code, failed[0]?.ok], [23, false]),
    ),
    negative("a thrown error remains a failure", ["record", crash, crashed], {
      name: "RangeError",
      message: "recorder failed",
    }),
  ],
});

test.each(["record scenarios", "browser"])(
  "a rejected %s phase records its elapsed time",
  async (step) => {
    const records: StepTiming[] = [];
    await expect(measurePhase(step, crash, records)).rejects.toThrow("recorder failed");
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ step, ok: false });
    expect(records[0]?.seconds).toBeGreaterThanOrEqual(0);
  },
);

const root = await makeDir();
const other = await makeDir();
const blocked = await makeDir();
await writeFiles(blocked, { ".stack": "file blocking the report directory" });
const directory = await makeDir();
await writeFiles(directory, { ".stack/verify/existing.json": "[]" });
const report: StepTiming[] = [{ step: "suite", ok: true, seconds: 1.25 }];
const failure: StepTiming[] = [{ step: "suite", ok: false, seconds: 0.5 }];
const reportText = async () =>
  JSON.parse(await Bun.file(join(root, ".stack/verify/timing.json")).text());
const otherText = async () =>
  JSON.parse(await Bun.file(join(other, ".stack/verify/timing.json")).text());

unit(writeTimings, {
  positive: [
    positive(
      "creates a timing report below the selected root",
      [report, root, "timing.json"],
      seen(reportText, report),
    ),
    positive(
      "records failures without changing their status",
      [failure, other, "timing.json"],
      seen(otherText, failure),
    ),
  ],
  negative: [
    negative("a blocked output directory fails", [report, blocked, "timing.json"], {
      code: "ENOTDIR",
    }),
    negative("a directory cannot be used as the report file", [report, directory, "."], {
      code: "EISDIR",
    }),
  ],
});
