import { afterAll, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UI_LOCK_OWNER_FILE } from "@platform/constants";
import { negative, positive, unit } from "@platform/test-factories";
import { thrownBy } from "@platform/test-framework";
import { all } from "@platform/util";
import {
  DeadlineExceeded,
  retryOnDeadline,
  withDeadline,
} from "../../packages/recorder/src/deadline.ts";
import { UiLockTimeout, withUiLock } from "../../packages/recorder/src/ui/lock.ts";

const SHORT_MS = 30;
const LONG_MS = 5000;
const NEVER = new Promise<never>(() => undefined);
const FAILS = Promise.reject(new Error("own"));
FAILS.catch(() => undefined);
const names: string[] = [];

function lockName(): string {
  const name = `deadline-lock-test-${crypto.randomUUID()}`;
  names.push(name);
  return name;
}

afterAll(async () => {
  await all(
    names.map((name) => async () => rm(join(tmpdir(), name), { recursive: true, force: true })),
  );
});

unit(withDeadline, {
  positive: [
    positive(
      "work that finishes in time returns its value",
      [Promise.resolve(7), "work", LONG_MS],
      7,
    ),
    positive(
      "a resolved string comes back unchanged",
      [Promise.resolve("a"), "work", LONG_MS],
      "a",
    ),
  ],
  negative: [
    negative("work that never finishes is stopped", [NEVER, "the browser", SHORT_MS], {
      message: "the browser did not finish within 0.03 seconds and was stopped.",
    }),
    negative("work that fails keeps its own error", [FAILS, "work", LONG_MS], {
      message: "own",
    }),
  ],
});

unit(withUiLock, {
  positive: [
    positive("the work runs and its value returns", [async () => 5, LONG_MS, lockName()], 5),
    positive(
      "a released lock can be taken again",
      [async () => "again", LONG_MS, lockName()],
      "again",
    ),
  ],
  negative: [
    negative(
      "work that fails releases the lock and rethrows",
      [
        async () => {
          throw new Error("work failed");
        },
        LONG_MS,
        lockName(),
      ],
      { message: "work failed" },
    ),
    negative(
      "a failure in the work is not swallowed",
      [
        async () => {
          throw new Error("second failure");
        },
        0,
        lockName(),
      ],
      { message: "second failure" },
    ),
  ],
});

function flaky(failures: number, error: Error) {
  const calls = { count: 0 };
  const run = async () => {
    calls.count += 1;
    return calls.count <= failures ? Promise.reject(error) : calls.count;
  };
  return run;
}

const TIMED_OUT = new DeadlineExceeded("timed out");
const BROKEN = new Error("broken");

unit(retryOnDeadline, {
  positive: [
    positive("work that succeeds is run once", [flaky(0, TIMED_OUT), 3], 1),
    positive("one deadline is retried and then succeeds", [flaky(1, TIMED_OUT), 3], 2),
  ],
  negative: [
    negative("a deadline on every attempt fails after the last", [flaky(9, TIMED_OUT), 3], {
      message: "timed out",
    }),
    negative("another error is not retried", [flaky(9, BROKEN), 3], { message: "broken" }),
  ],
});

describe("the retries are counted", () => {
  test.each([
    ["a deadline on every attempt", TIMED_OUT, 3],
    ["another error", BROKEN, 1],
  ])("%s", async (_name, error, expected) => {
    const calls = { count: 0 };
    await thrownBy(() =>
      retryOnDeadline(async () => {
        calls.count += 1;
        throw error;
      }, 3),
    );
    expect(calls.count).toBe(expected);
  });
});

describe("the lock", () => {
  test("a second taker gives up with a clear error while the first holds it", async () => {
    const name = lockName();
    let open: (() => void) | undefined;
    const held = withUiLock(() => new Promise<void>((resolve) => (open = resolve)), LONG_MS, name);
    await Bun.sleep(SHORT_MS);
    const failure = await thrownBy(() => withUiLock(async () => 1, SHORT_MS, name));
    open?.();
    await held;
    expect(failure instanceof UiLockTimeout).toBe(true);
  });

  test("a lock left by a process that no longer exists is taken over", async () => {
    const name = lockName();
    const directory = join(tmpdir(), name);
    await mkdir(directory);
    await writeFile(join(directory, UI_LOCK_OWNER_FILE), "2147483646");
    expect(await withUiLock(async () => "taken", LONG_MS, name)).toBe("taken");
  });

  test("the deadline error is a DeadlineExceeded", async () => {
    const failure = await thrownBy(() => withDeadline(NEVER, "work", SHORT_MS));
    expect(failure instanceof DeadlineExceeded).toBe(true);
  });
});
