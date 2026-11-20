import { runCapped } from "./capped.ts";
import { concurrencyLimit } from "./env.ts";

export async function all<T>(tasks: readonly (() => Promise<T>)[], limit?: number): Promise<T[]> {
  return runCapped(tasks, await concurrencyLimit(limit));
}
