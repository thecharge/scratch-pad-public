import { describe, expect, test } from "bun:test";
import { DEFAULT_CONCURRENCY_LIMIT, EnvVar } from "@platform/constants";
import { negative, positive, unit } from "@platform/test-factories";
import { all, concurrencyLimit } from "@platform/util";
import { all as browserAll } from "@platform/util/browser";
import { runCapped } from "../../../packages/util/src/capped.ts";

const FAIL = async (): Promise<number> => {
  throw new Error("boom");
};

function tasksOf(values: readonly number[]): (() => Promise<number>)[] {
  return values.map((value) => async () => value);
}

async function pause(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1));
}

unit(all, {
  positive: [
    positive("returns the results in the order of the tasks", [tasksOf([3, 1, 2]), 2], [3, 1, 2]),
    positive("returns nothing for no tasks", [[], 4], []),
    positive(
      "runs every task when the limit is larger than the list",
      [tasksOf([1, 2]), 50],
      [1, 2],
    ),
  ],
  negative: [
    negative("rejects with the first failure", [[...tasksOf([1]), FAIL], 1], {
      message: "boom",
    }),
    negative("rejects a limit of zero", [tasksOf([1]), 0], { name: "ZodError" }),
    negative("rejects a limit that is not a whole number", [tasksOf([1]), 1.5], {
      name: "ZodError",
    }),
  ],
});

unit(browserAll, {
  positive: [
    positive("returns the results in the order of the tasks", [tasksOf([3, 1, 2]), 2], [3, 1, 2]),
    positive("uses the default limit without one", [tasksOf([1, 2])], [1, 2]),
  ],
  negative: [
    negative("rejects with the first failure", [[...tasksOf([1]), FAIL], 1], {
      message: "boom",
    }),
    negative("rejects a limit of zero", [tasksOf([1]), 0], { name: "ZodError" }),
  ],
});

unit(runCapped, {
  positive: [
    positive("returns the results in the order of the tasks", [tasksOf([3, 1, 2]), 2], [3, 1, 2]),
    positive("returns nothing for no tasks", [[], 3], []),
  ],
  negative: [
    negative("rejects with the first failure", [[...tasksOf([1]), FAIL], 1], {
      message: "boom",
    }),
    negative("rejects with the first of two failures", [[FAIL, FAIL], 1], { message: "boom" }),
  ],
});

unit(concurrencyLimit, {
  positive: [
    positive("uses the limit it is given", [3, {}], 3),
    positive("uses the configured limit", [undefined, { [EnvVar.ConcurrencyLimit]: "5" }], 5),
    positive("uses the default without a setting", [undefined, {}], DEFAULT_CONCURRENCY_LIMIT),
  ],
  negative: [
    negative("rejects a given zero", [0, {}], { name: "ZodError" }),
    negative("rejects a configured zero", [undefined, { [EnvVar.ConcurrencyLimit]: "0" }], {
      name: "ZodError",
    }),
    negative("rejects a configured word", [undefined, { [EnvVar.ConcurrencyLimit]: "many" }], {
      name: "ZodError",
    }),
  ],
});

describe("the cap", () => {
  test("100 tasks with a limit of 5 never run more than 5 at once and keep the order", async () => {
    const running = { now: 0, peak: 0 };
    const tasks = Array.from({ length: 100 }, (_, index) => async () => {
      running.now += 1;
      running.peak = Math.max(running.peak, running.now);
      await pause();
      running.now -= 1;
      return index;
    });
    const results = await all(tasks, 5);
    expect([running.peak, results]).toEqual([5, Array.from({ length: 100 }, (_, index) => index)]);
  });

  test("the configured limit is used when none is given", async () => {
    const running = { now: 0, peak: 0 };
    const tasks = Array.from({ length: 40 }, () => async () => {
      running.now += 1;
      running.peak = Math.max(running.peak, running.now);
      await pause();
      running.now -= 1;
      return 1;
    });
    await all(tasks);
    expect(running.peak).toBe(DEFAULT_CONCURRENCY_LIMIT);
  });

  test("after a failure no further task starts", async () => {
    const started: number[] = [];
    const tasks = Array.from({ length: 20 }, (_, index) => async () => {
      started.push(index);
      await pause();
      return index;
    });
    tasks[1] = async () => {
      started.push(1);
      await pause();
      throw new Error("stop");
    };
    const outcome = await all(tasks, 2).catch((error: Error) => error.message);
    expect([outcome, started.length < 20]).toEqual(["stop", true]);
  });
});
