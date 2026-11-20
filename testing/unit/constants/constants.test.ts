import { describe, expect, test } from "bun:test";
import {
  CANONICAL_CODE_HTTP_STATUS,
  CanonicalCode,
  ERROR_REASON_MAX_LENGTH,
  ERROR_REASON_PATTERN,
  ErrorReason,
} from "@platform/constants";

describe("error vocabulary follows AIP-193", () => {
  test.each(Object.values(ErrorReason))(
    "reason %s matches the pattern and length limit",
    (reason) => {
      expect(reason).toMatch(ERROR_REASON_PATTERN);
      expect(reason.length).toBeLessThanOrEqual(ERROR_REASON_MAX_LENGTH);
    },
  );

  test.each([
    [CanonicalCode.InvalidArgument, 400],
    [CanonicalCode.FailedPrecondition, 400],
    [CanonicalCode.Unauthenticated, 401],
    [CanonicalCode.PermissionDenied, 403],
    [CanonicalCode.NotFound, 404],
    [CanonicalCode.AlreadyExists, 409],
    [CanonicalCode.Aborted, 409],
    [CanonicalCode.ResourceExhausted, 429],
    [CanonicalCode.Internal, 500],
    [CanonicalCode.Unavailable, 503],
  ])("%s maps to HTTP %d", (code, status) => {
    expect(CANONICAL_CODE_HTTP_STATUS[code]).toBe(status);
  });
});
