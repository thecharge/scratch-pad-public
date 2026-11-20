import { describe, expect, test } from "bun:test";
import { CanonicalCode, Text } from "@platform/constants";
import { thrownBy } from "@platform/test-framework";
import type { Operation } from "@platform/types";
import { paginate, waitForOperation } from "../../../packages/sdk/src/helpers.ts";

const NAME = "operations/op-1";

function pages(all: readonly (readonly number[])[]) {
  return async (token: string | undefined) => {
    const index = token === undefined ? 0 : Number(token);
    const next = index + 1 < all.length ? String(index + 1) : Text.Empty;
    return { items: [...(all[index] ?? [])], nextPageToken: next };
  };
}

function reads(done: readonly boolean[]) {
  const state = { calls: 0 };
  const read = async (): Promise<Operation> => {
    const flag = done[Math.min(state.calls, done.length - 1)] ?? false;
    state.calls += 1;
    return { name: NAME, done: flag };
  };
  return { read, state };
}

describe("paginate", () => {
  test.each([
    ["one page", [[1, 2]], [1, 2]],
    ["three pages", [[1], [2], [3]], [1, 2, 3]],
    ["an empty page between full pages", [[1], [], [2]], [1, 2]],
  ])("yields every item of %s", async (_name, all, expected) => {
    expect(await Array.fromAsync(paginate(pages(all)))).toEqual(expected);
  });

  test.each([
    ["no items on the only page", [[]]],
    ["empty pages only", [[], []]],
  ])("yields nothing for %s", async (_name, all) => {
    expect(await Array.fromAsync(paginate(pages(all)))).toEqual([]);
  });

  test("a failing page request stops the iteration with its error", async () => {
    const failure = await thrownBy(() =>
      Array.fromAsync(paginate(async () => Promise.reject(new Error("page failed")))),
    );
    expect(failure).toMatchObject({ message: "page failed" });
  });
});

describe("waitForOperation", () => {
  test.each([
    ["is done at once", [true], 1],
    ["is done on the second read", [false, true], 2],
    ["is done on the third read", [false, false, true], 3],
  ])("returns when the operation %s", async (_name, done, calls) => {
    const { read, state } = reads(done);
    const finished = await waitForOperation(read, { intervalMs: 1, timeoutMs: 1000 });
    expect([finished.done, state.calls]).toEqual([true, calls]);
  });

  test.each([
    ["never finishes", [false]],
    ["finishes only after the deadline", [false, false, false, false, false, false, true]],
  ])("reports a deadline when the operation %s", async (_name, done) => {
    const { read } = reads(done);
    const failure = await thrownBy(() => waitForOperation(read, { intervalMs: 1, timeoutMs: 3 }));
    expect(failure).toMatchObject({ status: CanonicalCode.DeadlineExceeded, message: NAME });
  });

  test("a failing read stops the wait with its error", async () => {
    const failure = await thrownBy(() =>
      waitForOperation(async () => Promise.reject(new Error("read failed"))),
    );
    expect(failure).toMatchObject({ message: "read failed" });
  });
});
