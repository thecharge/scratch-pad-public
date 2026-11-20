import { describe, expect, test } from "bun:test";
import { CanonicalCode, ErrorReason } from "@platform/constants";
import { ApiClientError } from "../../../packages/sdk/src/error.ts";

describe("ApiClientError", () => {
  test.each([
    ["status and text", CanonicalCode.NotFound, "missing", undefined, undefined],
    ["a reason", CanonicalCode.PermissionDenied, "denied", ErrorReason.PolicyDenied, undefined],
    ["an HTTP status", CanonicalCode.Aborted, "stale", ErrorReason.EtagMismatch, 409],
  ])("carries %s", (_name, status, text, reason, httpStatus) => {
    const error = new ApiClientError(status, text, reason, httpStatus);
    expect([error.status, error.message, error.reason, error.httpStatus]).toEqual([
      status,
      text,
      reason,
      httpStatus,
    ]);
  });

  test.each([
    ["is an Error", (error: ApiClientError) => error instanceof Error, true],
    ["is named after its class", (error: ApiClientError) => error.name, "ApiClientError"],
    ["has no reason unless given", (error: ApiClientError) => error.reason, undefined],
    ["has no HTTP status unless given", (error: ApiClientError) => error.httpStatus, undefined],
  ])("%s", (_name, read, expected) => {
    expect(read(new ApiClientError(CanonicalCode.Unknown, "x"))).toBe(expected);
  });
});
