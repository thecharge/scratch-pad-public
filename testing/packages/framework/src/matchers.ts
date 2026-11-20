import { expect } from "bun:test";

expect.extend({
  toSettleAs(received: unknown, read: (value: unknown) => unknown, expected: unknown) {
    const actual = read(received);
    return {
      pass: Bun.deepEquals(actual, expected),
      message: () => JSON.stringify({ actual, expected }),
    };
  },
});

export function settlesAs(read: (value: unknown) => unknown, expected: unknown): unknown {
  return Reflect.apply(Reflect.get(expect, "toSettleAs"), expect, [read, expected]);
}
