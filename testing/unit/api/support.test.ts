import { expect } from "bun:test";
import { computeEtag } from "@platform/aip";
import {
  ApiVersion,
  BookState,
  CanonicalCode,
  ErrorReason,
  MaskStrategy,
  MessageId,
  MethodKind,
  Scope,
} from "@platform/constants";
import { message } from "@platform/messages";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import type { Book } from "@platform/types";
import {
  describe,
  emailMask,
  notFound,
  stamp,
} from "../../../apps/api/src/capabilities/support.ts";

const BOOK: Book = {
  name: "publishers/p/books/b",
  title: "T",
  state: BookState.Active,
  etag: "stale",
};
const NOW = new Date("2026-03-04T05:06:07.000Z");
const stamped = async (book: Book, now: Date) => {
  const { etag: _etag, ...rest } = book;
  const updated = { ...rest, updateTime: now.toISOString() };
  return { ...updated, etag: await computeEtag(updated) };
};
const summary = (id: MessageId) => message(id);

const NAME = { name: BOOK.name };
const EMPTY_NAME = { name: "" };
const PUBLISHER_PARAMS = { name: "publishers/p" };
const NOT_FOUND = { code: CanonicalCode.NotFound, reason: ErrorReason.ResourceNotFound };
const removing = (path: string) => ({
  rules: [{ path, strategy: MaskStrategy.Remove, unlessScope: Scope.Read }],
});
const GET_DESCRIPTION = {
  id: "books.get",
  version: ApiVersion.V1,
  method: MethodKind.Get,
  resource: "books/{book}",
  summary: summary(MessageId.SummaryGet),
  description: message(MessageId.CapabilityDescription, {
    summary: summary(MessageId.SummaryGet),
    resource: "books/{book}",
  }),
};

const ANY_REMOVAL = expect.objectContaining({
  rules: [expect.objectContaining({ strategy: MaskStrategy.Remove })],
});

unit(notFound, {
  positive: [
    positive(
      "a book name gives a not-found failure",
      [BOOK.name],
      expect.objectContaining({ ...NOT_FOUND, params: NAME }),
    ),
    positive(
      "a publisher name is carried in the params",
      ["publishers/p"],
      expect.objectContaining({ params: PUBLISHER_PARAMS }),
    ),
  ],
  negative: [
    rejected(
      "an empty name still gives a failure with an empty name param",
      [""],
      expect.objectContaining({ code: CanonicalCode.NotFound, params: EMPTY_NAME }),
    ),
    rejected(
      "the message names the missing resource",
      [BOOK.name],
      expect.objectContaining({ message: message(MessageId.ResourceNotFound, NAME) }),
    ),
  ],
});

unit(describe, {
  positive: [
    positive(
      "the default version is v1 and the description embeds the summary",
      ["books.get", MethodKind.Get, "books/{book}", MessageId.SummaryGet],
      GET_DESCRIPTION,
    ),
    positive(
      "an explicit version is kept",
      ["books.count", MethodKind.Custom, "books", MessageId.SummaryCount, ApiVersion.V1Beta],
      expect.objectContaining({ version: ApiVersion.V1Beta, id: "books.count" }),
    ),
  ],
  negative: [
    negative("an unknown summary id throws", ["x", MethodKind.Get, "r", "nope"], {
      name: "TypeError",
    }),
    negative("a missing summary id throws", ["x", MethodKind.Get, "r"], { name: "TypeError" }),
  ],
});

unit(emailMask, {
  positive: [
    positive(
      "a field path gives one remove rule unless the reader scope",
      ["authorEmail"],
      removing("authorEmail"),
    ),
    positive(
      "a nested path is kept as given",
      ["books.authorEmail"],
      removing("books.authorEmail"),
    ),
  ],
  negative: [
    rejected("an empty path gives a rule with an empty path", [""], removing("")),
    rejected("the rule never uses another strategy", ["authorEmail"], ANY_REMOVAL),
  ],
});

unit(stamp, {
  positive: [
    positive(
      "an old etag is replaced by the hash of the stamped book",
      [BOOK, NOW],
      await stamped(BOOK, NOW),
    ),
    positive(
      "the update time is the given instant",
      [{ ...BOOK, title: "U" }, NOW],
      expect.objectContaining({ updateTime: NOW.toISOString(), title: "U" }),
    ),
  ],
  negative: [
    negative("an invalid date throws a range error", [BOOK, new Date(Number.NaN)], {
      name: "RangeError",
    }),
    negative("a missing book throws a type error", [undefined, NOW], { name: "TypeError" }),
  ],
});
