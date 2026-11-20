import { CanonicalCode, ErrorReason, MessageId } from "@platform/constants";
import { ApiError } from "./api-error.ts";

export async function toApiError(error: unknown): Promise<ApiError> {
  if (error instanceof ApiError) {
    return error;
  }
  return new ApiError(CanonicalCode.Internal, ErrorReason.InternalError, MessageId.InternalError);
}
