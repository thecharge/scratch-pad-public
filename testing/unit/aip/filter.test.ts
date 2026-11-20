import { describe, expect, test } from "bun:test";
import { comparatorFor, matchesFilter, parseFilter, parseOrderBy } from "@platform/aip";
import { CanonicalCode, ErrorReason, FilterFieldKind, OrderDirection } from "@platform/constants";
import { filterAsync } from "@platform/store";
import { thrownBy } from "@platform/test-framework";
import type { FilterFields } from "@platform/types";

const fields = (): FilterFields =>
  new Map([
    ["title", { kind: FilterFieldKind.String }],
    ["rating", { kind: FilterFieldKind.Number }],
    ["published", { kind: FilterFieldKind.Boolean }],
    ["state", { kind: FilterFieldKind.Enum, values: ["ACTIVE", "DELETED"] }],
    ["createTime", { kind: FilterFieldKind.Timestamp }],
    ["readTime", { kind: FilterFieldKind.Duration }],
    ["tags", { kind: FilterFieldKind.StringList }],
    ["author.givenName", { kind: FilterFieldKind.String }],
  ]);

const LES_MIS = "Les Misérables";
const NOTRE_DAME = "Notre-Dame de Paris";
const BOOKS = [
  {
    title: LES_MIS,
    rating: 5,
    published: true,
    state: "ACTIVE",
    createTime: "2020-01-01T00:00:00Z",
    readTime: "3600s",
    tags: ["classic", "french"],
    author: { givenName: "Victor" },
  },
  {
    title: NOTRE_DAME,
    rating: 4,
    published: true,
    state: "ACTIVE",
    createTime: "2021-06-01T00:00:00Z",
    readTime: "1800.5s",
    tags: ["classic"],
    author: { givenName: "Victor" },
  },
  {
    title: "Draft",
    rating: 1,
    published: false,
    state: "DELETED",
    createTime: "2022-03-01T00:00:00Z",
    readTime: "60s",
    tags: [],
    author: { givenName: "Anon" },
  },
  { title: "No rating", published: true, state: "ACTIVE", createTime: "2023-01-01T00:00:00Z" },
];

async function titlesMatching(filter: string): Promise<string[]> {
  const node = await parseFilter(filter, fields());
  return (await filterAsync(BOOKS, async (book) => matchesFilter(node, fields(), book))).map(
    (book) => book.title,
  );
}

describe("filter evaluation (AIP-160)", () => {
  test.each([
    ["", ["Les Misérables", "Notre-Dame de Paris", "Draft", "No rating"]],
    ["rating = 5", [LES_MIS]],
    ["rating >= 4", [LES_MIS, NOTRE_DAME]],
    ["rating < 4", ["Draft"]],
    ["rating > -1", [LES_MIS, NOTRE_DAME, "Draft"]],
    ["published = true rating >= 4", [LES_MIS, NOTRE_DAME]],
    ["published = false AND rating = 1 OR rating = 5", ["Draft"]],
    ["published = true AND rating = 1 OR rating = 5", [LES_MIS]],
    ["(rating = 5 OR rating = 1) AND published = true", [LES_MIS]],
    ["NOT published = true", ["Draft"]],
    ["-published = true", ["Draft"]],
    ["NOT (rating = 5 OR rating = 4)", ["Draft", "No rating"]],
    ["rating != 5", [NOTRE_DAME, "Draft"]],
    ['author.givenName = "Victor"', [LES_MIS, NOTRE_DAME]],
    ['title = "Les*"', [LES_MIS]],
    ['title = "*Paris"', [NOTRE_DAME]],
    ['title = "*Dame*"', [NOTRE_DAME]],
    ['title = "Draft"', ["Draft"]],
    ["title = 'Les Misérables'", [LES_MIS]],
    ["tags:classic", [LES_MIS, NOTRE_DAME]],
    ["tags:*", [LES_MIS, NOTRE_DAME]],
    ["rating:*", [LES_MIS, NOTRE_DAME, "Draft"]],
    ["published = false", ["Draft"]],
    ["state = DELETED", ["Draft"]],
    ["createTime > 2021-01-01T00:00:00Z", [NOTRE_DAME, "Draft", "No rating"]],
    ["createTime <= 2020-01-01T00:00:00+00:00", [LES_MIS]],
    ["readTime >= 1800.5s", [LES_MIS, NOTRE_DAME]],
  ])("%p", async (filter, expected) => {
    expect(await titlesMatching(filter)).toEqual(expected);
  });
});

describe("filter validation", () => {
  test.each([
    "secret = 1",
    "author.familyName = x",
    "rating = hello",
    "published = maybe",
    "createTime > yesterday",
    "readTime > 5",
    "state = INVALID",
    "published > true",
    "state > ACTIVE",
    "tags = classic",
    "rating =",
    "(rating = 1",
    "rating = 1)",
    'title = "unterminated',
    "justaword",
    "rating = 1 AND",
    "rating = 5 and published = true",
    "title = x; DROP TABLE books",
    "1=1 OR 1=1",
  ])("rejects %p as INVALID_ARGUMENT", async (filter) => {
    expect(await thrownBy(async () => parseFilter(filter, fields()))).toMatchObject({
      code: CanonicalCode.InvalidArgument,
      reason: ErrorReason.InvalidFilter,
    });
  });
});

describe("orderBy (AIP-132)", () => {
  const allowed = new Set(["title", "rating", "author.givenName"]);

  test.each([
    [
      "rating desc, title",
      [
        { path: "rating", direction: OrderDirection.Descending },
        { path: "title", direction: OrderDirection.Ascending },
      ],
    ],
    [
      " rating , title desc ",
      [
        { path: "rating", direction: OrderDirection.Ascending },
        { path: "title", direction: OrderDirection.Descending },
      ],
    ],
    [undefined, []],
  ])("parses %p", async (text, expected) => {
    expect(await parseOrderBy(text, allowed)).toEqual(expected);
  });

  test.each(["secret", "rating up", "rating desc extra", ",", "rating,"])(
    "rejects %p",
    async (text) => {
      expect(await thrownBy(async () => parseOrderBy(text, allowed))).toMatchObject({
        httpStatus: 400,
      });
    },
  );

  test("sorting applies the terms in order with natural comparison", async () => {
    const rows = [
      { rating: 4, title: "b" },
      { rating: 5, title: "a" },
      { rating: 4, title: "a" },
    ];
    const sorted = [...rows].sort(comparatorFor(await parseOrderBy("rating desc, title", allowed)));
    expect(sorted).toEqual([
      { rating: 5, title: "a" },
      { rating: 4, title: "a" },
      { rating: 4, title: "b" },
    ]);
  });
});
