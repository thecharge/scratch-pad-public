import { CanonicalCode, ErrorReason, FeatureFlag } from "@platform/constants";
import { createFlags } from "@platform/flags";
import { negative, positive, unit } from "@platform/test-factories";
import { gateByFlag } from "../../../apps/api/src/gate.ts";

const RESULT = { output: { ok: true }, cacheHit: false };
const inner = async () => RESULT;
const FLAGGED = { id: "books.suggest", flag: FeatureFlag.BooksSuggest };
const PLAIN = { id: "books.get" };
const ARGS = [{ name: "x" }, {}];
const on = await createFlags({ [FeatureFlag.BooksSuggest]: true });
const off = await createFlags({ [FeatureFlag.BooksSuggest]: false });
const unknown = await createFlags();
const DISABLED = {
  code: CanonicalCode.NotFound,
  reason: ErrorReason.CapabilityDisabled,
  params: { id: FLAGGED.id },
};

unit(gateByFlag, {
  positive: [
    positive("a capability without a flag passes through", [inner, off], RESULT, [PLAIN, ...ARGS]),
    positive("a capability whose flag is on passes through", [inner, on], RESULT, [
      FLAGGED,
      ...ARGS,
    ]),
  ],
  negative: [
    negative("a capability whose flag is off is reported as not found", [inner, off], DISABLED, [
      FLAGGED,
      ...ARGS,
    ]),
    negative(
      "a flag the provider does not know uses its default of off",
      [inner, unknown],
      DISABLED,
      [FLAGGED, ...ARGS],
    ),
  ],
});
