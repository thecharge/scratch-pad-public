import { expect } from "bun:test";
import { CanonicalCode, ErrorReason, MessageId } from "@platform/constants";
import { ApiError, toApiError } from "@platform/errors";
import { message } from "@platform/messages";
import { negative, positive, rejected, unit } from "@platform/test-factories";

const KNOWN = new ApiError(
  CanonicalCode.NotFound,
  ErrorReason.ResourceNotFound,
  MessageId.ResourceNotFound,
  { name: "x" },
);

unit(toApiError, {
  positive: [
    positive("an ApiError is returned as it is", [KNOWN], KNOWN),
    positive(
      "a subclass of ApiError is returned as it is",
      [
        new (class Sub extends ApiError {})(
          CanonicalCode.Aborted,
          ErrorReason.EtagMismatch,
          MessageId.EtagMismatch,
        ),
      ],
      expect.objectContaining({ code: CanonicalCode.Aborted }),
    ),
  ],
  negative: [
    rejected(
      "a plain Error becomes INTERNAL",
      [new Error("boom")],
      expect.objectContaining({ code: CanonicalCode.Internal, reason: ErrorReason.InternalError }),
    ),
    rejected(
      "a string becomes INTERNAL",
      ["boom"],
      expect.objectContaining({ code: CanonicalCode.Internal }),
    ),
    rejected(
      "undefined becomes INTERNAL",
      [undefined],
      expect.objectContaining({ reason: ErrorReason.InternalError }),
    ),
  ],
});

unit(message, {
  positive: [
    positive(
      "a message without parameters",
      [MessageId.InternalError],
      "An internal error occurred.",
    ),
    positive(
      "a parameter is filled in",
      [MessageId.ResourceNotFound, { name: "books/b1" }],
      "The resource books/b1 was not found.",
    ),
    positive(
      "a number is written as text",
      [MessageId.ResourceNotFound, { name: 7 }],
      "The resource 7 was not found.",
    ),
  ],
  negative: [
    rejected(
      "a missing parameter keeps its placeholder",
      [MessageId.ResourceNotFound, {}],
      "The resource {name} was not found.",
    ),
    rejected(
      "an extra parameter is ignored",
      [MessageId.InternalError, { name: "x" }],
      "An internal error occurred.",
    ),
    negative("an unknown message id throws", ["no-such-id"], { name: "TypeError" }),
  ],
});
