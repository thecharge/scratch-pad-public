import { describe, expect, test } from "bun:test";
import { CanonicalCode, ErrorDetailType, ErrorReason } from "@platform/constants";
import { thrownBy } from "@platform/test-framework";
import { ApiClientError } from "../../../packages/sdk/src/error.ts";
import { unwrap } from "../../../packages/sdk/src/unwrap.ts";

const detail = (reason: ErrorReason) => ({
  "@type": ErrorDetailType.ErrorInfo,
  reason,
  domain: "test",
});
const body = (status: CanonicalCode, message: string, reason: ErrorReason) => ({
  error: { code: 0, status, message, details: [detail(reason)] },
});
const responseOf = (httpStatus: number) => new Response(null, { status: httpStatus });

describe("unwrap returns data", () => {
  test.each([
    ["an object", { title: "Dune" }],
    ["a falsy number", 0],
    ["an empty string", ""],
  ])("for %s", async (_name, data) => {
    expect(await unwrap(Promise.resolve({ data, response: responseOf(200) }))).toBe(data);
  });

  test("for an object, the same value", async () => {
    const data = { title: "Dune" };
    expect(await unwrap(Promise.resolve({ data }))).toBe(data);
  });
});

describe("unwrap throws an ApiClientError", () => {
  test.each([
    ["not found", 404, CanonicalCode.NotFound, "no book", ErrorReason.ResourceNotFound],
    ["denied", 403, CanonicalCode.PermissionDenied, "no scope", ErrorReason.PolicyDenied],
    ["stale", 409, CanonicalCode.Aborted, "etag", ErrorReason.EtagMismatch],
  ])("for a %s error body", async (_name, httpStatus, status, text, reason) => {
    const failure = await thrownBy(() =>
      unwrap(
        Promise.resolve({ error: body(status, text, reason), response: responseOf(httpStatus) }),
      ),
    );
    expect([failure instanceof ApiClientError, failure]).toEqual([
      true,
      expect.objectContaining({ status, reason, httpStatus, message: text }),
    ]);
  });

  test.each([
    ["a text body", "boom", 500],
    ["a null body", null, 502],
    ["a body of the wrong shape", { error: "flat" }, 503],
  ])("with status UNKNOWN for %s", async (_name, error, httpStatus) => {
    const failure = await thrownBy(() =>
      unwrap(Promise.resolve({ error, response: responseOf(httpStatus) })),
    );
    expect(failure).toMatchObject({ status: CanonicalCode.Unknown, httpStatus });
  });
});
