import { FeatureFlag } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import type { FeatureFlags } from "@platform/types";
import { createFlags } from "../../../packages/flags/src/flags.ts";

const ON = { [FeatureFlag.BooksSuggest]: true };
const OFF = { [FeatureFlag.BooksSuggest]: false };
const ENABLE = { [FeatureFlag.BooksSuggest]: true };
const UNKNOWN = "not-a-flag";

const enabledNow = (flags: FeatureFlags) => flags.enabled(FeatureFlag.BooksSuggest);
const enabledAfter = (change: Record<string, boolean>) => async (flags: FeatureFlags) => {
  await flags.set(change);
  return flags.enabled(FeatureFlag.BooksSuggest);
};

unit(createFlags, {
  positive: [
    positive("a flag set on evaluates on", [ON], seen(enabledNow, true)),
    positive(
      "a flag changed while running evaluates with the new value",
      [OFF],
      seen(enabledAfter(ENABLE), true),
    ),
  ],
  negative: [
    rejected("a flag set off evaluates off", [OFF], seen(enabledNow, false)),
    rejected(
      "a flag the provider does not know uses its default of off",
      [{}],
      seen(enabledNow, false),
    ),
    rejected(
      "a flag with no value anywhere is off",
      [ON],
      seen((flags: FeatureFlags) => flags.enabled(UNKNOWN), false),
    ),
    negative(
      "a provider kind that is not registered fails on first use",
      [ON, "nowhere"],
      { name: "TypeError" },
      ["enabled", FeatureFlag.BooksSuggest],
    ),
  ],
});
