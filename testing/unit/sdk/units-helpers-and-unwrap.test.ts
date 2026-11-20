import { CanonicalCode, ErrorReason } from "@platform/constants";
import { negative, positive, unit } from "@platform/test-factories";
import type { Operation, SdkPage } from "@platform/types";
import { paginate, waitForOperation } from "../../../packages/sdk/src/helpers.ts";
import { unwrap } from "../../../packages/sdk/src/unwrap.ts";

const pages = (...all: SdkPage<number>[]) => {
  const seen: (string | undefined)[] = [];
  return async (token: string | undefined) => {
    seen.push(token);
    return all[seen.length - 1] ?? { items: [], nextPageToken: "" };
  };
};
const reads = (...states: Operation[]) => {
  let index = 0;
  return async () => states[Math.min(index++, states.length - 1)];
};
const DETAIL = {
  "@type": "type.googleapis.com/google.rpc.ErrorInfo",
  reason: ErrorReason.ResourceNotFound,
  domain: "d",
};
const failedBody = {
  error: {
    code: 404,
    message: "gone",
    status: CanonicalCode.NotFound,
    details: [DETAIL],
  },
};
const RESPONSE = (status: number) => ({ status });
const settled = (data: unknown, error: unknown, status: number) =>
  Promise.resolve({ data, error, response: RESPONSE(status) });
const FAST = { intervalMs: 1, timeoutMs: 30 };

unit(paginate, {
  positive: [
    positive(
      "follows the tokens until the last page",
      [pages({ items: [1, 2], nextPageToken: "t" }, { items: [3], nextPageToken: "" })],
      [1, 2, 3],
    ),
    positive("a single page", [pages({ items: [1], nextPageToken: "" })], [1]),
  ],
  negative: [
    positive("an empty first page yields nothing", [pages({ items: [], nextPageToken: "" })], []),
    negative("a failing page rejects", [async () => Promise.reject(new Error("page failed"))], {
      message: "page failed",
    }),
  ],
});

unit(waitForOperation, {
  positive: [
    positive("an operation already done returns at once", [reads({ name: "op", done: true })], {
      name: "op",
      done: true,
    }),
    positive(
      "polls until the operation is done",
      [reads({ name: "op", done: false }, { name: "op", done: true }), FAST],
      { name: "op", done: true },
    ),
  ],
  negative: [
    negative("never done times out", [reads({ name: "op", done: false }), FAST], {
      status: CanonicalCode.DeadlineExceeded,
      message: "op",
    }),
    negative(
      "a failing read rejects",
      [async () => Promise.reject(new Error("read failed")), FAST],
      { message: "read failed" },
    ),
  ],
});

unit(unwrap, {
  positive: [
    positive("returns the data of a success", [settled({ id: 1 }, undefined, 200)], { id: 1 }),
    positive("returns empty data as it is", [settled(undefined, undefined, 204)], undefined),
  ],
  negative: [
    negative(
      "an API error becomes ApiClientError with its status and reason",
      [settled(undefined, failedBody, 404)],
      {
        status: CanonicalCode.NotFound,
        reason: ErrorReason.ResourceNotFound,
        httpStatus: 404,
        message: "gone",
      },
    ),
    negative("an unreadable error becomes UNKNOWN", [settled(undefined, "oops", 502)], {
      status: CanonicalCode.Unknown,
      httpStatus: 502,
      message: "502",
    }),
  ],
});
