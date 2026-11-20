import { expect } from "bun:test";
import { CanonicalCode } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { createDeps } from "../../../apps/api/src/deps.ts";
import { IDLE_OBSERVABILITY } from "../../../apps/api/src/idle.ts";

const SCOPE = "scope";
const QUERY = ["publishers/p"];
const fail = async () => {
  throw new RangeError("boom");
};

unit(createDeps, {
  positive: [
    positive(
      "the clock gives the current instant",
      [IDLE_OBSERVABILITY],
      seen((now: Date) => Math.abs(Date.now() - now.getTime()) < 5000, true),
      ["now"],
    ),
    positive(
      "the idempotency runner executes once and returns the result",
      [IDLE_OBSERVABILITY],
      "done",
      ["requests.run", SCOPE, undefined, async () => "done"],
    ),
    positive(
      "the codec seals an offset into a token",
      [IDLE_OBSERVABILITY],
      expect.stringMatching(/\S/),
      ["codec.encode", 3, QUERY],
    ),
  ],
  negative: [
    negative(
      "the codec rejects a token it did not issue",
      [IDLE_OBSERVABILITY],
      { code: CanonicalCode.InvalidArgument },
      ["codec.decode", "not-a-token", QUERY],
    ),
    negative(
      "a failing execution is surfaced by the runner",
      [IDLE_OBSERVABILITY],
      { name: "RangeError" },
      ["requests.run", SCOPE, undefined, fail],
    ),
  ],
});
