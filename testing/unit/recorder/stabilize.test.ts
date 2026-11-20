import { describe, expect, test } from "bun:test";
import { CheckKind, KB_CLOCK_EPOCH, StepFlag, StepSource } from "@platform/constants";
import { positive, rejected, unit } from "@platform/test-factories";
import { createTickClock } from "@platform/test-framework";
import type { StepResult } from "@platform/types";
import { stabilizeResults, stabilizeText } from "../../packages/recorder/src/stabilize.ts";

const FIRST = "3f84257d-ae8d-46c7-aa8a-291836cb425c";
const SECOND = "a2586e3b-e636-4bc6-ba50-438ce0996bfe";
const STABLE_ONE = "00000000-0000-4000-8000-000000000001";
const STABLE_TWO = "00000000-0000-4000-8000-000000000002";
const OBSERVED = "2026-10-31T21:34:20.793Z";
const FIXED = "2001-01-01T00:00:00.007Z";

const step = (response: string): StepResult => ({
  source: StepSource.Http,
  description: "a",
  flag: StepFlag.Passed,
  place: "b",
  action: "c",
  expectation: "d",
  checks: [{ kind: CheckKind.Outcome, label: "e", passed: true }],
  evidence: { response },
});

unit(stabilizeText, {
  positive: [
    positive(
      "ids are numbered in order of appearance",
      [`${FIRST} ${SECOND} ${FIRST}`],
      `${STABLE_ONE} ${STABLE_TWO} ${STABLE_ONE}`,
    ),
    positive("an observed time becomes the fixed one", [OBSERVED], KB_CLOCK_EPOCH),
    positive(
      "a proxy HTTP date becomes the fixed one",
      ["Sat, 07 Nov 2026 15:00:00 GMT"],
      "Mon, 01 Jan 2001 00:00:00 GMT",
    ),
    positive(
      "two HTTP dates normalize equally",
      ["Sun, 08 Nov 2026 01:02:03 GMT"],
      "Mon, 01 Jan 2001 00:00:00 GMT",
    ),
  ],
  negative: [
    rejected("a time from the fixed clock is kept", [FIXED], FIXED),
    rejected("text without ids or times is unchanged", ["plain"], "plain"),
    rejected("a month name without an HTTP date is kept", ["Nov 2026"], "Nov 2026"),
    rejected("an incomplete HTTP date is kept", ["Sat, 07 Nov 2026"], "Sat, 07 Nov 2026"),
  ],
});

unit(stabilizeResults, {
  positive: [
    positive(
      "the same ids in two steps get the same number",
      [[step(FIRST), step(FIRST)]],
      [step(STABLE_ONE), step(STABLE_ONE)],
    ),
    positive("no steps give no steps", [[]], []),
  ],
  negative: [
    rejected("another run's id gives the same result", [[step(SECOND)]], [step(STABLE_ONE)]),
    rejected("a fixed-clock time is kept", [[step(FIXED)]], [step(FIXED)]),
  ],
});

describe("createTickClock", () => {
  test.each([
    ["the first call is the epoch", 1, KB_CLOCK_EPOCH],
    ["each call is one step later", 8, FIXED],
  ])("%s", async (_name, calls, expected) => {
    const clock = await createTickClock();
    const dates = await Array.fromAsync({ length: calls }, async () => clock());
    expect(dates.at(-1)?.toISOString()).toBe(expected);
  });

  test.each([
    ["a later epoch", "2002-02-02T00:00:00.000Z", 5, "2002-02-02T00:00:00.005Z"],
    ["a longer step", KB_CLOCK_EPOCH, 1000, "2001-01-01T00:00:01.000Z"],
  ])("%s", async (_name, epoch, stepMs, expected) => {
    const clock = await createTickClock(epoch, stepMs);
    await clock();
    expect((await clock()).toISOString()).toBe(expected);
  });

  test("two clocks are independent", async () => {
    const first = await createTickClock();
    const second = await createTickClock();
    await first();
    expect((await second()).toISOString()).toBe(KB_CLOCK_EPOCH);
  });
});
