import { CanonicalCode } from "@platform/constants";
import { ApiErrorBodySchema, type SdkResult } from "@platform/types";
import { ApiClientError } from "./error.ts";

async function failure(result: SdkResult<unknown>): Promise<ApiClientError> {
  const httpStatus = result.response?.status;
  const parsed = ApiErrorBodySchema.safeParse(result.error);
  if (!parsed.success) {
    return new ApiClientError(CanonicalCode.Unknown, String(httpStatus), undefined, httpStatus);
  }
  const { error } = parsed.data;
  return new ApiClientError(error.status, error.message, error.details[0]?.reason, httpStatus);
}

export async function unwrap<T>(pending: PromiseLike<SdkResult<T>>): Promise<T> {
  const result = await pending;
  if (result.error !== undefined) {
    throw await failure(result);
  }
  return result.data as T;
}
