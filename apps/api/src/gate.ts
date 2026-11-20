import { CanonicalCode, ErrorReason, MessageId } from "@platform/constants";
import { ApiError } from "@platform/errors";
import type { FeatureFlags, Invoke } from "@platform/types";

export async function gateByFlag(invoke: Invoke, flags: FeatureFlags): Promise<Invoke> {
  return async (capability, input, context) => {
    if (capability.flag !== undefined && !(await flags.enabled(capability.flag))) {
      throw new ApiError(
        CanonicalCode.NotFound,
        ErrorReason.CapabilityDisabled,
        MessageId.CapabilityDisabled,
        { id: capability.id },
      );
    }
    return invoke(capability, input, context);
  };
}
