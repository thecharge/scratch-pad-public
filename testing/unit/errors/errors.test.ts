import { describe, expect, test } from "bun:test";
import { CanonicalCode, ERROR_REASON_PATTERN, ErrorReason, MessageId } from "@platform/constants";
import { ApiError, toApiError } from "@platform/errors";
import { ApiErrorBodySchema } from "@platform/types";

const LIMITED = new ApiError(
  CanonicalCode.ResourceExhausted,
  ErrorReason.RateLimited,
  MessageId.RateLimited,
  { seconds: 3 },
  { retryAfterSeconds: "3" },
);

describe("ApiError.toBody (AIP-193)", async () => {
  const body = await LIMITED.toBody("api.example.com");

  test("produces a body that satisfies the published schema", () => {
    expect(ApiErrorBodySchema.parse(body)).toEqual(body);
  });

  test("carries the HTTP status as code and the canonical name as status", () => {
    expect(body.error).toMatchObject({ code: 429, status: CanonicalCode.ResourceExhausted });
  });

  test("always includes ErrorInfo with a conforming reason, the domain and the metadata", () => {
    const [info] = body.error.details;
    expect(info?.reason).toMatch(ERROR_REASON_PATTERN);
    expect(info).toMatchObject({ domain: "api.example.com", metadata: { retryAfterSeconds: "3" } });
  });

  test("omits metadata when there is none", async () => {
    const plain = new ApiError(
      CanonicalCode.NotFound,
      ErrorReason.ResourceNotFound,
      MessageId.ResourceNotFound,
      { name: "x" },
    );
    expect((await plain.toBody("d")).error.details[0]).not.toHaveProperty("metadata");
  });
});

describe("ApiError status mapping", () => {
  test.each([
    [CanonicalCode.PermissionDenied, ErrorReason.PolicyDenied, 403],
    [CanonicalCode.NotFound, ErrorReason.ResourceNotFound, 404],
    [CanonicalCode.Aborted, ErrorReason.EtagMismatch, 409],
  ])("%s is HTTP %d", (code, reason, status) => {
    expect(new ApiError(code, reason, MessageId.InternalError).httpStatus).toBe(status);
  });

  test("survives a round trip through its data form", async () => {
    expect(await ApiError.fromFailure(await LIMITED.toFailure())).toMatchObject({
      code: LIMITED.code,
      reason: LIMITED.reason,
      message: LIMITED.message,
    });
  });
});

describe("toApiError", () => {
  test("passes an ApiError through unchanged", async () => {
    expect(await toApiError(LIMITED)).toBe(LIMITED);
  });

  test("hides the message of an unknown failure behind a generic INTERNAL error", async () => {
    const converted = await toApiError(new Error("database password is hunter2"));
    expect(converted.code).toBe(CanonicalCode.Internal);
    expect(converted.message).not.toContain("hunter2");
  });
});
