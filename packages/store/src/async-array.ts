import { all } from "@platform/util";
export async function filterAsync<T>(
  items: readonly T[],
  keep: (item: T, index: number) => Promise<boolean>,
): Promise<T[]> {
  const flags = await all(items.map((item, index) => async () => keep(item, index)));
  return items.filter((_item, index) => flags[index]);
}

export async function flatMapAsync<T, U>(
  items: readonly T[],
  expand: (item: T, index: number) => Promise<readonly U[]>,
): Promise<U[]> {
  const groups = await all(items.map((item, index) => async () => expand(item, index)));
  return groups.flat();
}

export async function someAsync<T>(
  items: readonly T[],
  test: (item: T, index: number) => Promise<boolean>,
): Promise<boolean> {
  const flags = await all(items.map((item, index) => async () => test(item, index)));
  return flags.some(Boolean);
}

export async function everyAsync<T>(
  items: readonly T[],
  test: (item: T, index: number) => Promise<boolean>,
): Promise<boolean> {
  const flags = await all(items.map((item, index) => async () => test(item, index)));
  return flags.every(Boolean);
}

export async function findAsync<T>(
  items: readonly T[],
  test: (item: T, index: number) => Promise<boolean>,
): Promise<T | undefined> {
  const flags = await all(items.map((item, index) => async () => test(item, index)));
  return items.find((_item, index) => flags[index]);
}

export async function reduceAsync<T, A>(
  items: readonly T[],
  step: (accumulator: A, item: T, index: number) => Promise<A>,
  initial: A,
): Promise<A> {
  return items.reduce<Promise<A>>(
    async (previous, item, index) => step(await previous, item, index),
    Promise.resolve(initial),
  );
}
