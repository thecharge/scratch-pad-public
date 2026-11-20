import { describe, expect, test } from "bun:test";
import { cacheHintFor, MemoryResponseCache } from "@platform/cache";
import { CacheScope } from "@platform/constants";

const BLOCK = { ttlMs: 1000, scope: CacheScope.Private };

describe("MemoryResponseCache", () => {
  test.each([
    [0, { a: 1 }],
    [999, { a: 1 }],
    [1000, undefined],
  ])("a value read at t=%dms is %p", async (readAt, expected) => {
    let now = 0;
    const cache = new MemoryResponseCache({ now: () => now });
    await cache.set("k", { a: 1 }, BLOCK);
    now = readAt;
    expect(await cache.get("k")).toEqual(expected);
  });

  test("callers cannot mutate stored values", async () => {
    const cache = new MemoryResponseCache();
    const original = { list: [1] };
    await cache.set("k", original, BLOCK);
    original.list.push(2);
    ((await cache.get("k")) as typeof original).list.push(3);
    expect(await cache.get("k")).toEqual({ list: [1] });
  });

  test("the oldest entries are evicted beyond the bound", async () => {
    const cache = new MemoryResponseCache({ maxEntries: 2 });
    await cache.set("a", 1, BLOCK);
    await cache.set("b", 2, BLOCK);
    await cache.set("c", 3, BLOCK);
    expect([await cache.get("a"), await cache.get("b"), await cache.get("c")]).toEqual([
      undefined,
      2,
      3,
    ]);
  });
});

describe("cacheHintFor (MCP ttlMs and cacheScope)", () => {
  test.each([
    [undefined, { ttlMs: 0, cacheScope: CacheScope.Private }],
    [
      { ttlMs: 5000, scope: CacheScope.Public },
      { ttlMs: 5000, cacheScope: CacheScope.Public },
    ],
  ])("%p gives %p", async (block, expected) => {
    expect(await cacheHintFor(block)).toEqual(expected);
  });
});
