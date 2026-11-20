import { describe, expect, test } from "bun:test";
import { MessageId } from "@platform/constants";
import { message } from "@platform/messages";

describe("message", () => {
  test.each([
    [MessageId.RateLimited, { seconds: 7 }, "Too many requests. Retry in 7 seconds."],
    [MessageId.ResourceNotFound, { name: "books/b1" }, "The resource books/b1 was not found."],
    [MessageId.PolicyDenied, {}, "You are not allowed to call {capability}."],
    [MessageId.InternalError, { ignored: "x" }, "An internal error occurred."],
  ])("%s renders its text and keeps unknown placeholders visible", (id, params, expected) => {
    expect(message(id, params)).toBe(expected);
  });
});
