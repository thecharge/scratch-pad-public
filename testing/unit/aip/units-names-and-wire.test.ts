import {
  assertResourceId,
  buildResourceName,
  checkEtag,
  codePointLength,
  comparatorFor,
  computeEtag,
  executeOrPreview,
  hasValidCollections,
  isValidResourceId,
  normalizeInput,
  normalizeNfc,
  parseOrderBy,
  parseResourceName,
  requireResourceName,
  sameText,
  snakeToCamel,
  toWire,
} from "@platform/aip";
import { CanonicalCode, ErrorReason, OrderDirection } from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";

const setOf = (items: string[] = []) => new Set(items);
const PATTERN = "publishers/{publisher}/books/{book}";
const BAD_ID = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidResourceId };
const BAD_NAME = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidResourceName };
const BAD_ORDER = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidOrderBy };
const AMBIGUOUS = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.ValidationFailed };
const MISMATCH = { code: CanonicalCode.Aborted, reason: ErrorReason.EtagMismatch };
const ALLOWED = setOf(["title", "meta.rank"]);
const SNAKE_INPUT = { page_size: 1, nested: { next_page: "x" }, list: [{ a_b: 1 }] };
const CAMEL_INPUT = { pageSize: 1, nested: { nextPage: "x" }, list: [{ aB: 1 }] };
const RANK_ONE = { meta: { rank: 1 } };
const TIE_FIRST = { title: "a", meta: { rank: 1 } };
const TIE_SECOND = { title: "a", meta: { rank: 2 } };
const NFC = "café";
const NFD = "café";
const SAMPLE = { title: "b", meta: { rank: 2 } };
const ASC_TITLE = { path: "title", direction: OrderDirection.Ascending };

unit(isValidResourceId, {
  positive: [
    positive("a single letter", ["a"], true),
    positive("letters, digits and dashes", ["a-b-c1"], true),
  ],
  negative: [
    rejected("an uppercase id", ["A"], false),
    rejected("a trailing dash", ["a-"], false),
    rejected("a leading digit", ["1a"], false),
  ],
});

unit(assertResourceId, {
  positive: [
    positive("a valid id returns nothing", ["book-1"], undefined),
    positive("the longest valid id", ["a".padEnd(63, "b")], undefined),
  ],
  negative: [negative("an underscore", ["a_b"], BAD_ID), negative("the empty id", [""], BAD_ID)],
});

unit(normalizeNfc, {
  positive: [
    positive("a decomposed form is composed", [NFD], NFC),
    positive("a composed form is unchanged", [NFC], NFC),
  ],
  negative: [
    rejected("plain text is unchanged", ["abc"], "abc"),
    rejected("the empty text is unchanged", [""], ""),
  ],
});

unit(codePointLength, {
  positive: [
    positive("an emoji is one code point", ["a\u{1F600}b"], 3),
    positive("ascii counts each letter", ["abc"], 3),
  ],
  negative: [
    rejected("the empty text has none", [""], 0),
    rejected("an emoji is not two units", ["\u{1F600}"], 1),
  ],
});

unit(sameText, {
  positive: [
    positive("composed and decomposed text are the same", [NFC, NFD], true),
    positive("equal text is the same", ["a", "a"], true),
  ],
  negative: [
    rejected("different text differs", ["a", "b"], false),
    rejected("case matters", ["a", "A"], false),
  ],
});

unit(parseResourceName, {
  positive: [
    positive("a full name yields its parameters", [PATTERN, "publishers/p1/books/b1"], {
      publisher: "p1",
      book: "b1",
    }),
    positive("a pattern without parameters matches itself", ["settings", "settings"], {}),
  ],
  negative: [
    rejected("a missing segment", [PATTERN, "publishers/p1"], undefined),
    rejected("another collection", [PATTERN, "authors/p1/books/b1"], undefined),
    rejected("an invalid id", [PATTERN, "publishers/P1/books/b1"], undefined),
  ],
});

unit(requireResourceName, {
  positive: [
    positive("a valid name yields its parameters", [PATTERN, "publishers/p1/books/b1"], {
      publisher: "p1",
      book: "b1",
    }),
    positive("a pattern without parameters", ["settings", "settings"], {}),
  ],
  negative: [
    negative("a missing segment", [PATTERN, "publishers/p1"], BAD_NAME),
    negative("another collection", [PATTERN, "authors/p1/books/b1"], BAD_NAME),
  ],
});

unit(buildResourceName, {
  positive: [
    positive(
      "fills every parameter",
      [PATTERN, { publisher: "p1", book: "b1" }],
      "publishers/p1/books/b1",
    ),
    positive("a pattern without parameters is returned", ["settings", {}], "settings"),
  ],
  negative: [
    negative("a missing parameter", [PATTERN, { publisher: "p1" }], BAD_NAME),
    negative("an invalid parameter", [PATTERN, { publisher: "P1", book: "b1" }], BAD_ID),
  ],
});

unit(hasValidCollections, {
  positive: [
    positive("camel case collections", ["publishers/{publisher}/userEvents/{event}"], true),
    positive("a pattern with only parameters", ["{a}/{b}"], true),
  ],
  negative: [
    rejected("an uppercase first letter in a collection", ["Publishers/{publisher}"], false),
    rejected("an underscore in a collection", ["user_events/{event}"], false),
  ],
});

unit(snakeToCamel, {
  positive: [
    positive("one underscore", ["page_size"], "pageSize"),
    positive("two underscores", ["next_page_token"], "nextPageToken"),
  ],
  negative: [
    rejected("no underscore is unchanged", ["pageSize"], "pageSize"),
    rejected("a trailing underscore is unchanged", ["page_"], "page_"),
  ],
});

unit(normalizeInput, {
  positive: [
    positive("keys become camel case deeply", [SNAKE_INPUT], CAMEL_INPUT),
    positive("a scalar is returned as it is", [5], 5),
  ],
  negative: [
    negative("both spellings of one field", [{ page_size: 1, pageSize: 2 }], AMBIGUOUS),
    negative("both spellings inside a list", [[{ a_b: 1, aB: 2 }]], AMBIGUOUS),
  ],
});

unit(toWire, {
  positive: [
    positive(
      "a date becomes RFC 3339",
      [new Date("2020-01-02T03:04:05.000Z")],
      "2020-01-02T03:04:05.000Z",
    ),
    positive(
      "undefined fields are dropped and keys are camel case",
      [{ create_time: 1, gone: undefined }],
      {
        createTime: 1,
      },
    ),
  ],
  negative: [
    rejected("null is kept", [null], null),
    rejected("a list is mapped", [[{ a_b: undefined, c: 1 }]], [{ c: 1 }]),
  ],
});

unit(computeEtag, {
  positive: [
    positive("a resource is quoted sixteen hash characters", [{ a: 1 }], '"015abd7f5cc57a2d"'),
    positive("the etag follows the content", [{ a: 2 }], '"7e8059f495589fcd"'),
  ],
  negative: [
    rejected("null has its own etag", [null], '"74234e98afe7498f"'),
    rejected("the empty object has its own etag", [{}], '"44136fa355b3678a"'),
  ],
});

unit(checkEtag, {
  positive: [
    positive("no etag provided passes", [undefined, '"a"'], undefined),
    positive("a weak etag matches its strong form", ['W/"a"', '"a"'], undefined),
    positive("an empty etag passes", ["", '"a"'], undefined),
  ],
  negative: [
    negative("another etag aborts", ['"b"', '"a"'], MISMATCH),
    negative("another weak etag aborts", ['W/"b"', '"a"'], MISMATCH),
  ],
});

unit(executeOrPreview, {
  positive: [
    positive("validate-only previews", [true, () => "preview", async () => "run"], "preview"),
    positive("otherwise executes", [false, () => "preview", async () => "run"], "run"),
  ],
  negative: [
    negative(
      "a failing preview throws",
      [true, () => Promise.reject(new Error("no")), async () => "run"],
      { message: "no" },
    ),
    negative(
      "a failing execution throws",
      [undefined, () => "preview", () => Promise.reject(new Error("bad"))],
      { message: "bad" },
    ),
  ],
});

unit(parseOrderBy, {
  positive: [
    positive(
      "a field defaults to ascending",
      ["title", ALLOWED],
      [{ path: "title", direction: OrderDirection.Ascending }],
    ),
    positive(
      "two terms with directions",
      ["title desc, meta.rank asc", ALLOWED],
      [
        { path: "title", direction: OrderDirection.Descending },
        { path: "meta.rank", direction: OrderDirection.Ascending },
      ],
    ),
    positive("no text gives no terms", [undefined, ALLOWED], []),
  ],
  negative: [
    negative("a field that is not allowed", ["secret", ALLOWED], BAD_ORDER),
    negative("an unknown direction", ["title up", ALLOWED], BAD_ORDER),
    negative("an extra word", ["title desc now", ALLOWED], BAD_ORDER),
  ],
});

unit(comparatorFor, {
  positive: [
    positive("ascending puts the smaller first", [[ASC_TITLE]], -1, [
      { title: "a" },
      { title: "b" },
    ]),
    positive(
      "a nested path is read",
      [[{ path: "meta.rank", direction: OrderDirection.Ascending }]],
      1,
      [SAMPLE, RANK_ONE],
    ),
  ],
  negative: [
    rejected(
      "descending reverses the order",
      [[{ path: "title", direction: OrderDirection.Descending }]],
      1,
      [{ title: "a" }, { title: "b" }],
    ),
    rejected("equal records tie", [[ASC_TITLE]], 0, [{ title: "a" }, { title: "a" }]),
    rejected("a missing value sorts first", [[ASC_TITLE]], 1, [{ title: "a" }, {}]),
    rejected(
      "the next term breaks a tie",
      [[ASC_TITLE, { path: "meta.rank", direction: OrderDirection.Descending }]],
      1,
      [TIE_FIRST, TIE_SECOND],
    ),
  ],
});
