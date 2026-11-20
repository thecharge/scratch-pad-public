import { describe, expect, test } from "bun:test";
import {
  buildResourceName,
  codePointLength,
  hasValidCollections,
  isValidResourceId,
  normalizeInput,
  parseResourceName,
  requireResourceName,
  sameText,
  snakeToCamel,
  toWire,
} from "@platform/aip";
import { thrownBy } from "@platform/test-framework";
import {
  displayNameSchema,
  durationSchema,
  etagSchema,
  int64Schema,
  timestampSchema,
} from "@platform/types";

const PATTERN = "publishers/{publisher}/books/{book}";

describe("resource names (AIP-122)", () => {
  test("a valid name yields its parameters", async () => {
    expect(await parseResourceName(PATTERN, "publishers/lacroix/books/les-miserables")).toEqual({
      publisher: "lacroix",
      book: "les-miserables",
    });
  });

  test.each([
    ["a different collection", "authors/lacroix/books/x"],
    ["an uppercase id", "publishers/Lacroix/books/x"],
    ["a missing segment", "publishers/lacroix"],
    ["a colon in an id", "publishers/a:b/books/x"],
  ])("does not match %s", async (_name, name) => {
    expect(await parseResourceName(PATTERN, name)).toBeUndefined();
  });

  test.each([
    ["a", true],
    ["a-b-c", true],
    ["a1", true],
    ["a".padEnd(63, "b"), true],
    ["", false],
    ["A", false],
    ["1a", false],
    ["a-", false],
    ["a_b", false],
    ["a".padEnd(64, "b"), false],
  ])("id %p is valid: %p", async (id, valid) => {
    expect(await isValidResourceId(id)).toBe(valid);
  });

  test("an invalid name is INVALID_ARGUMENT", async () => {
    expect(await thrownBy(async () => requireResourceName(PATTERN, "bad"))).toMatchObject({
      httpStatus: 400,
    });
  });

  test("building a name round-trips and rejects a bad or missing id", async () => {
    expect(await buildResourceName(PATTERN, { publisher: "p1", book: "b1" })).toBe(
      "publishers/p1/books/b1",
    );
    expect(
      await thrownBy(async () => buildResourceName(PATTERN, { publisher: "P1", book: "b1" })),
    ).toBeDefined();
    expect(
      await thrownBy(async () => buildResourceName(PATTERN, { publisher: "p1" })),
    ).toBeDefined();
  });

  test.each([
    ["publishers/{publisher}/userEvents/{event}", true],
    ["Publishers/{publisher}", false],
    ["user_events/{event}", false],
  ])("collections in %s are plural camelCase: %p", async (pattern, valid) => {
    expect(await hasValidCollections(pattern)).toBe(valid);
  });
});

describe("text rules (AIP-210)", () => {
  test("NFC and NFD forms are the same text", async () => {
    expect(await sameText("café", "café")).toBe(true);
  });

  test("length counts code points, not UTF-16 units", async () => {
    expect([await codePointLength("a\u{1F600}b"), "a\u{1F600}b".length]).toEqual([3, 4]);
  });

  test.each([
    ["\u{1F600}".repeat(63), true],
    ["\u{1F600}".repeat(64), false],
  ])("a display name of %# code points is accepted: %p", (name, accepted) => {
    expect(displayNameSchema.safeParse(name).success).toBe(accepted);
  });

  test("display names are stored in NFC", () => {
    expect(displayNameSchema.parse("café")).toBe("café");
  });
});

describe("wire primitives (AIP-142, ProtoJSON)", () => {
  test.each([
    [timestampSchema, "2012-04-21T11:30:00-04:00", true],
    [timestampSchema, "2012-04-21T11:30:00Z", true],
    [timestampSchema, "2012-04-21", false],
    [durationSchema, "1.5s", true],
    [durationSchema, "-3.000340012s", true],
    [durationSchema, "1m", false],
    [durationSchema, "1.1234567891s", false],
    [int64Schema, "9007199254740993", true],
    [int64Schema, "1.5", false],
    [etagSchema, '"abc"', true],
    [etagSchema, 'W/"abc"', true],
    [etagSchema, "abc", false],
  ])("%# %p accepts %p: %p", (schema, value, accepted) => {
    expect(schema.safeParse(value).success).toBe(accepted);
  });
});

describe("wire format", () => {
  test("snake_case input becomes camelCase, deeply", async () => {
    expect(await snakeToCamel("page_size")).toBe("pageSize");
    expect(
      await normalizeInput({ page_size: 3, nested: { next_page_token: "x" }, list: [{ a_b: 1 }] }),
    ).toEqual({
      pageSize: 3,
      nested: { nextPageToken: "x" },
      list: [{ aB: 1 }],
    });
  });

  test("both spellings of one field are rejected", async () => {
    expect(await thrownBy(async () => normalizeInput({ page_size: 1, pageSize: 2 }))).toBeDefined();
  });

  test("responses drop undefined and serialize dates as RFC 3339", async () => {
    const wire = await toWire({
      create_time: new Date("2020-01-02T03:04:05.000Z"),
      skipped: undefined,
      ok: 1,
    });
    expect(wire).toEqual({ createTime: "2020-01-02T03:04:05.000Z", ok: 1 });
  });
});
