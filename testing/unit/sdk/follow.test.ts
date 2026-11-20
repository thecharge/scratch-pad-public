import { expect } from "bun:test";
import { CanonicalCode, ErrorReason } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { streamOf } from "@platform/test-scenarios";
import type { Operation } from "@platform/types";
import { followOperation } from "../../../packages/sdk/src/follow.ts";

const NAME = "operations/op-1";
const frame = (state: object) => `data: ${JSON.stringify(state)}\n\n`;
const RUNNING = frame({ name: NAME, done: false, metadata: { processed: 1 } });
const FINISHED = frame({ name: NAME, done: true, response: { count: 3 } });
const INFO = "type.googleapis.com/google.rpc.ErrorInfo";
const CANCEL_INFO = { "@type": INFO, reason: "OPERATION_CANCELLED", domain: "d" };
const MISSING_INFO = { "@type": INFO, reason: "OPERATION_NOT_FOUND", domain: "d" };
const CANCEL_ERROR = {
  code: 499,
  message: "The operation was cancelled.",
  status: "CANCELLED",
  details: [CANCEL_INFO],
};
const MISSING_ERROR = {
  code: 404,
  message: "No operation.",
  status: "NOT_FOUND",
  details: [MISSING_INFO],
};
const PLAIN_STATE = { name: NAME, done: true };
const CANCELLED = frame({ name: NAME, done: true, error: CANCEL_ERROR });
const NOT_FOUND = { error: { error: MISSING_ERROR } };
const answering = (result: object) => ({
  get: async () => ({ ...result, response: new Response() }),
});
const streaming = (...frames: string[]) => answering({ data: streamOf(...frames) });
const doneFlags = (collected: Operation[]) => collected.map((state) => state.done);

unit(followOperation, {
  positive: [
    positive(
      "yields each state of the operation until it is done",
      [streaming(RUNNING, RUNNING, FINISHED) as never, NAME],
      seen(doneFlags, [false, false, true]),
    ),
    positive(
      "stops at the state that is done and ignores what follows",
      [streaming(RUNNING, FINISHED, RUNNING) as never, NAME],
      seen(doneFlags, [false, true]),
    ),
  ],
  negative: [
    negative(
      "an operation that ended with an error raises the typed error with its reason",
      [streaming(RUNNING, CANCELLED) as never, NAME],
      {
        name: "ApiClientError",
        status: CanonicalCode.Cancelled,
        reason: ErrorReason.OperationCancelled,
      },
    ),
    negative(
      "a stream that ends before the operation is done raises an unavailable error",
      [streaming(RUNNING) as never, NAME],
      { name: "ApiClientError", status: CanonicalCode.Unavailable },
    ),
    negative(
      "a frame that is not valid raises an unavailable error",
      [streaming("data: nope\n\n") as never, NAME],
      {
        name: "ApiClientError",
        status: CanonicalCode.Unavailable,
        message: expect.stringContaining("Event frame 1"),
      },
    ),
    negative(
      "an answer that is not a stream raises an unavailable error",
      [answering({ data: PLAIN_STATE }) as never, NAME],
      { name: "ApiClientError", status: CanonicalCode.Unavailable },
    ),
    negative(
      "an answer that is an error body raises the typed error before any state",
      [answering(NOT_FOUND) as never, NAME],
      {
        name: "ApiClientError",
        status: CanonicalCode.NotFound,
        reason: ErrorReason.OperationNotFound,
      },
    ),
  ],
});
