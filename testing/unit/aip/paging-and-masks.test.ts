import { describe, expect, test } from "bun:test";
import {
  applyUpdateMask,
  applyView,
  collectBehaviors,
  createPageTokenCodec,
  maskPathsOf,
  paginate,
  parseFieldMask,
  resolvePageSize,
  selectFields,
  validateFieldMask,
} from "@platform/aip";
import { withBehavior } from "@platform/capability";
import { FieldBehavior, ResourceView } from "@platform/constants";
import { thrownBy } from "@platform/test-framework";
import { z } from "zod";

const LIMITS = { defaultPageSize: 50, maxPageSize: 1000 };
const ITEMS = Array.from({ length: 7 }, (_, index) => index);

describe("page size (AIP-158)", () => {
  test.each([
    [undefined, 50],
    [0, 50],
    [7, 7],
    [5000, 1000],
  ])("%p resolves to %d", async (requested, expected) => {
    expect(await resolvePageSize(requested, LIMITS)).toBe(expected);
  });

  test("a negative size is INVALID_ARGUMENT", async () => {
    expect(await thrownBy(async () => resolvePageSize(-1, LIMITS))).toMatchObject({
      httpStatus: 400,
    });
  });
});

describe("page tokens", () => {
  const codec = () => createPageTokenCodec(crypto.getRandomValues(new Uint8Array(32)));

  test("pages walk the collection and the last page has an empty token", async () => {
    const c = await codec();
    const query = { filter: "x" };
    const first = await paginate(ITEMS, { pageSize: 3, query }, c, LIMITS);
    const second = await paginate(
      ITEMS,
      { pageSize: 3, pageToken: first.nextPageToken, query },
      c,
      LIMITS,
    );
    const third = await paginate(
      ITEMS,
      { pageSize: 3, pageToken: second.nextPageToken, query },
      c,
      LIMITS,
    );
    expect([first.items, second.items, third.items, third.nextPageToken]).toEqual([
      [0, 1, 2],
      [3, 4, 5],
      [6],
      "",
    ]);
  });

  test("the page size may change between pages", async () => {
    const c = await codec();
    const first = await paginate(ITEMS, { pageSize: 2, query: {} }, c, LIMITS);
    const second = await paginate(
      ITEMS,
      { pageSize: 4, pageToken: first.nextPageToken, query: {} },
      c,
      LIMITS,
    );
    expect(second.items).toEqual([2, 3, 4, 5]);
  });

  test("tokens are URL-safe and do not expose the offset", async () => {
    const token = await (await codec()).encode(12345, { a: 1 });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, "base64url").toString("utf8")).not.toContain("12345");
  });

  test.each([
    ["a changed query", (token: string) => token, { filter: "b" }],
    ["a tampered token", (token: string) => `${token.slice(0, -2)}AA`, { filter: "a" }],
    ["a malformed token", () => "not-a-token", { filter: "a" }],
  ])("%s is INVALID_ARGUMENT", async (_name, alter, query) => {
    const c = await codec();
    const token = alter(await c.encode(3, { filter: "a" }));
    expect(await thrownBy(() => c.decode(token, query))).toMatchObject({ httpStatus: 400 });
  });

  test("a token from another key is rejected", async () => {
    const token = await (await codec()).encode(3, { filter: "a" });
    expect(
      await thrownBy(async () => (await codec()).decode(token, { filter: "a" })),
    ).toMatchObject({ httpStatus: 400 });
  });
});

const BookSchema = z.object({
  name: await withBehavior(z.string(), FieldBehavior.Immutable),
  title: z.string(),
  rating: z.number().optional(),
  createTime: await withBehavior(z.string(), FieldBehavior.OutputOnly),
  author: z.object({ givenName: z.string(), familyName: z.string() }).optional(),
  tags: z.array(z.string()).optional(),
});
const ALLOWED = await maskPathsOf(BookSchema);

describe("field masks (AIP-161)", () => {
  test.each([
    ["title, author.givenName,title", ["title", "author.givenName"]],
    [undefined, undefined],
    ["  ", undefined],
  ])("parsing %p", async (text, expected) => {
    expect(await parseFieldMask(text)).toEqual(expected);
  });

  test("a field as a whole and its subfields are both valid", async () => {
    expect(
      await validateFieldMask(["author", "author.givenName", "tags"], ALLOWED),
    ).toBeUndefined();
  });

  test.each([
    ["an index into a repeated field", "tags.0"],
    ["an unknown path", "missing"],
    ["a resource-prefixed path", "book.title"],
  ])("rejects %s", async (_name, path) => {
    expect(await thrownBy(async () => validateFieldMask([path], ALLOWED))).toMatchObject({
      httpStatus: 400,
    });
  });

  test("read masks keep only the named paths", async () => {
    const book = { name: "b", title: "T", author: { givenName: "A", familyName: "B" } };
    expect(await selectFields(book, ["title", "author.givenName"])).toEqual({
      title: "T",
      author: { givenName: "A" },
    });
  });

  test.each([
    [ResourceView.Basic, { name: "b", title: "T" }],
    [ResourceView.Full, { name: "b", title: "T", rating: 5 }],
  ])("view %s", async (view, expected) => {
    expect(await applyView({ name: "b", title: "T", rating: 5 }, view, ["name", "title"])).toEqual(
      expected,
    );
  });
});

describe("update masks (AIP-134, AIP-203)", async () => {
  const rules = { behaviors: await collectBehaviors(BookSchema) };
  const current = {
    name: "b1",
    title: "Old",
    rating: 3,
    createTime: "t0",
    author: { givenName: "A", familyName: "B" },
  };

  test.each([
    [
      "only masked paths change",
      { title: "New", rating: 5 },
      ["title"],
      { ...current, title: "New" },
    ],
    [
      "an omitted mask means every populated field of the patch",
      { title: "New", author: { givenName: "Z" } },
      undefined,
      { ...current, title: "New", author: { givenName: "Z", familyName: "B" } },
    ],
    [
      "output-only fields are ignored",
      { createTime: "forged", title: "New" },
      ["createTime", "title"],
      { ...current, title: "New" },
    ],
    ["an immutable field may be resent unchanged", { name: "b1" }, ["name"], current],
  ])("%s", async (_name, patch, mask, expected) => {
    expect(await applyUpdateMask(current, patch, mask, rules)).toEqual(expected);
  });

  test("changing an immutable field is INVALID_ARGUMENT", async () => {
    expect(
      await thrownBy(async () => applyUpdateMask(current, { name: "other" }, ["name"], rules)),
    ).toMatchObject({
      httpStatus: 400,
    });
  });

  test("the current resource is never mutated", async () => {
    const snapshot = structuredClone(current);
    await applyUpdateMask(current, { title: "New" }, ["title"], rules);
    expect(current).toEqual(snapshot);
  });
});
