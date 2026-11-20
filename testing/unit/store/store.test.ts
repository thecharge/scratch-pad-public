import { describe, expect, test } from "bun:test";
import { BoundedStore, lazy } from "@platform/store";
import { thrownBy } from "@platform/test-framework";
import type { StoreOptions } from "@platform/types";
import { all } from "@platform/util";

function clocked(options: StoreOptions) {
  const clock = { now: 0 };
  return { clock, store: new BoundedStore<string>({ ...options, now: () => clock.now }) };
}

describe("capacity", () => {
  test("the least recently used entry is evicted first", async () => {
    const { store } = clocked({ maxEntries: 2 });
    await store.set("a", "1");
    await store.set("b", "2");
    await store.get("a");
    await store.set("c", "3");
    expect(await store.keys()).toEqual(["a", "c"]);
  });

  test("the size never exceeds the ceiling however many keys are written", async () => {
    const { store } = clocked({ maxEntries: 3 });
    await all(Array.from({ length: 50 }, (_, index) => async () => store.set(String(index), "v")));
    expect(await store.size()).toBe(3);
  });
});

describe("expiry", () => {
  test("an entry disappears after its time to live", async () => {
    const { clock, store } = clocked({ maxEntries: 5, ttlMs: 100 });
    await store.set("a", "1");
    clock.now = 99;
    const before = await store.get("a");
    clock.now = 100;
    expect([before, await store.get("a")]).toEqual(["1", undefined]);
  });

  test("a per-entry time to live overrides the default", async () => {
    const { clock, store } = clocked({ maxEntries: 5, ttlMs: 100 });
    await store.set("a", "1", 10);
    clock.now = 10;
    expect(await store.get("a")).toBeUndefined();
  });

  test("sweep drops every expired entry at once", async () => {
    const { clock, store } = clocked({ maxEntries: 5, ttlMs: 10 });
    await all([async () => store.set("a", "1"), async () => store.set("b", "2")]);
    clock.now = 10;
    await store.sweep();
    expect(await store.size()).toBe(0);
  });

  test("entries without a time to live stay", async () => {
    const { clock, store } = clocked({ maxEntries: 5 });
    await store.set("a", "1");
    clock.now = 1e12;
    expect(await store.get("a")).toBe("1");
  });
});

describe("update", () => {
  test("concurrent updates never lose a write", async () => {
    const store = new BoundedStore<number>({ maxEntries: 5 });
    await all(
      Array.from(
        { length: 20 },
        () => async () => store.update("n", (current) => (current ?? 0) + 1),
      ),
    );
    expect(await store.get("n")).toBe(20);
  });

  test("a change that throws leaves the entry untouched", async () => {
    const store = new BoundedStore<number>({ maxEntries: 5 });
    await store.set("n", 1);
    await thrownBy(() =>
      store.update("n", () => {
        throw new Error("no");
      }),
    );
    expect(await store.get("n")).toBe(1);
  });

  test("delete reports whether something was removed", async () => {
    const { store } = clocked({ maxEntries: 5 });
    await store.set("a", "1");
    expect([await store.delete("a"), await store.delete("a")]).toEqual([true, false]);
  });
});

describe("lazy", () => {
  test("the factory runs on first use only and once", async () => {
    const calls = { count: 0 };
    const load = lazy(() => ++calls.count);
    const before = calls.count;
    const values = await all([load, load, load]);
    expect([before, values, calls.count]).toEqual([0, [1, 1, 1], 1]);
  });
});
