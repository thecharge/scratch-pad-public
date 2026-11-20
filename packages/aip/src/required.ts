import { fieldBehaviors } from "@platform/capability";
import { CanonicalCode, ErrorReason, FieldBehavior, MessageId } from "@platform/constants";
import { ApiError } from "@platform/errors";
import type { JsonObject } from "@platform/types";
import type { ZodObject } from "zod";

export async function assertRequired(schema: ZodObject, input: JsonObject): Promise<void> {
  const absent = [...(await fieldBehaviors(schema)).entries()]
    .filter(([, behavior]) => behavior === FieldBehavior.Required)
    .map(([field]) => field)
    .find((field) => input[field] === undefined || input[field] === null);
  if (absent !== undefined) {
    throw new ApiError(
      CanonicalCode.InvalidArgument,
      ErrorReason.RequiredFieldMissing,
      MessageId.RequiredFieldMissing,
      { field: absent },
    );
  }
}
