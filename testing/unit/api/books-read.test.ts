import { expect } from "bun:test";
import { BookState, CanonicalCode, ErrorReason, ResourceView } from "@platform/constants";
import { negative, positive, unit } from "@platform/test-factories";
import {
  bookName,
  fakeDeps,
  OTHER_PUBLISHER_NAME,
  PUBLISHER_NAME,
  sampleBook,
} from "@platform/test-scenarios";
import {
  batchGetBooks,
  countBooks,
  getBook,
  listBooks,
  suggestBook,
} from "../../../apps/api/src/capabilities/books.ts";

const run = (input: unknown) => ["handler", input, {}];
const first = sampleBook("b1", { author: "Ann", authorEmail: "ann@example.com" });
const second = sampleBook("b2", { title: "Zebra", state: BookState.Archived });
const foreign = sampleBook("b9", {}, OTHER_PUBLISHER_NAME);
const deleted = sampleBook("b3", { deleteTime: "2026-01-02T03:04:05.000Z" });
const seeded = await fakeDeps([first, second, foreign, deleted]);
const empty = await fakeDeps();
const INVALID_NAME = {
  code: CanonicalCode.InvalidArgument,
  reason: ErrorReason.InvalidResourceName,
};
const NOT_FOUND = { code: CanonicalCode.NotFound, reason: ErrorReason.ResourceNotFound };

unit(getBook, {
  positive: [
    positive("the full book is returned by default", [seeded], first, run({ name: first.name })),
    positive(
      "the basic view keeps only name, title and state",
      [seeded],
      { name: first.name, title: first.title, state: first.state },
      run({ name: first.name, view: ResourceView.Basic }),
    ),
  ],
  negative: [
    negative(
      "a name that is not a book name is invalid",
      [seeded],
      INVALID_NAME,
      run({ name: "x" }),
    ),
    negative(
      "a book that does not exist is not found",
      [seeded],
      NOT_FOUND,
      run({ name: bookName("missing") }),
    ),
  ],
});

unit(listBooks, {
  positive: [
    positive(
      "live books of the parent are listed and deleted ones are hidden",
      [seeded],
      { books: [first, second], nextPageToken: "" },
      run({ parent: PUBLISHER_NAME }),
    ),
    positive(
      "deleted books are listed when asked for",
      [seeded],
      { books: [first, second, deleted], nextPageToken: "" },
      run({ parent: PUBLISHER_NAME, showDeleted: true }),
    ),
    positive(
      "a filter keeps the matching books",
      [seeded],
      { books: [second], nextPageToken: "" },
      run({ parent: PUBLISHER_NAME, filter: 'state = "ARCHIVED"' }),
    ),
    positive(
      "a page size smaller than the result gives a next page token",
      [seeded],
      { books: [first], nextPageToken: expect.stringMatching(/\S/) },
      run({ parent: PUBLISHER_NAME, pageSize: 1 }),
    ),
    positive(
      "order by title descending reverses the list",
      [seeded],
      { books: [second, first], nextPageToken: "" },
      run({ parent: PUBLISHER_NAME, orderBy: "title desc" }),
    ),
  ],
  negative: [
    negative(
      "a parent that is not a publisher name is invalid",
      [seeded],
      INVALID_NAME,
      run({ parent: "x" }),
    ),
    negative(
      "a filter on an unknown field is refused",
      [seeded],
      { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidFilter },
      run({ parent: PUBLISHER_NAME, filter: 'nope = "x"' }),
    ),
    negative(
      "an order by an unknown field is refused",
      [seeded],
      { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidOrderBy },
      run({ parent: PUBLISHER_NAME, orderBy: "nope" }),
    ),
    negative(
      "a page token that was not issued is refused",
      [seeded],
      { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidPageToken },
      run({ parent: PUBLISHER_NAME, pageToken: "garbage" }),
    ),
  ],
});

unit(countBooks, {
  positive: [
    positive(
      "every book of the parent is counted",
      [seeded],
      { count: 3 },
      run({ parent: PUBLISHER_NAME }),
    ),
    positive(
      "a parent without books counts zero",
      [empty],
      { count: 0 },
      run({ parent: PUBLISHER_NAME }),
    ),
  ],
  negative: [
    negative(
      "a parent that is not a publisher name is invalid",
      [seeded],
      INVALID_NAME,
      run({ parent: "x" }),
    ),
    negative("a book name is not a parent", [seeded], INVALID_NAME, run({ parent: first.name })),
  ],
});

unit(suggestBook, {
  positive: [
    positive(
      "the first book of the parent is suggested",
      [seeded],
      { books: [first] },
      run({ parent: PUBLISHER_NAME }),
    ),
    positive(
      "a parent without books suggests nothing",
      [empty],
      { books: [] },
      run({ parent: PUBLISHER_NAME }),
    ),
  ],
  negative: [
    negative(
      "a parent that is not a publisher name is invalid",
      [seeded],
      INVALID_NAME,
      run({ parent: "x" }),
    ),
    negative("a book name is not a parent", [seeded], INVALID_NAME, run({ parent: first.name })),
  ],
});

unit(batchGetBooks, {
  positive: [
    positive(
      "the named books are returned in the requested order",
      [seeded],
      { books: [second, first] },
      run({ parent: PUBLISHER_NAME, names: [second.name, first.name] }),
    ),
    positive(
      "a single name returns a single book",
      [seeded],
      { books: [first] },
      run({ parent: PUBLISHER_NAME, names: [first.name] }),
    ),
  ],
  negative: [
    negative(
      "a parent that is not a publisher name is invalid",
      [seeded],
      INVALID_NAME,
      run({ parent: "x", names: [first.name] }),
    ),
    negative(
      "a name that does not exist fails the whole batch",
      [seeded],
      NOT_FOUND,
      run({ parent: PUBLISHER_NAME, names: [first.name, bookName("missing")] }),
    ),
    negative(
      "an empty batch is refused",
      [seeded],
      { code: CanonicalCode.InvalidArgument },
      run({ parent: PUBLISHER_NAME, names: [] }),
    ),
  ],
});
