import { DEFAULT_CONCURRENCY_LIMIT } from "@platform/constants";
import { ConcurrencyLimitSchema } from "@platform/types";

class CappedRun<T> {
  private readonly results: T[] = [];
  private next = 0;
  private failed = false;
  private failure: unknown;

  constructor(private readonly tasks: readonly (() => Promise<T>)[]) {}

  async lane(): Promise<void> {
    while (!this.failed && this.next < this.tasks.length) {
      const index = this.next++;
      await this.attempt(index);
    }
  }

  async attempt(index: number): Promise<void> {
    try {
      this.results[index] = await (this.tasks[index] as () => Promise<T>)();
    } catch (error) {
      if (!this.failed) {
        this.failure = error;
      }
      this.failed = true;
    }
  }

  async finish(): Promise<T[]> {
    if (this.failed) {
      throw this.failure;
    }
    return this.results;
  }
}

export async function runCapped<T>(
  tasks: readonly (() => Promise<T>)[],
  cap: number,
): Promise<T[]> {
  const run = new CappedRun(tasks);
  const lanes = Array.from({ length: Math.min(cap, tasks.length) }, () => run.lane());
  for (const lane of lanes) {
    await lane;
  }
  return run.finish();
}

export async function all<T>(
  tasks: readonly (() => Promise<T>)[],
  limit: number = DEFAULT_CONCURRENCY_LIMIT,
): Promise<T[]> {
  return runCapped(tasks, ConcurrencyLimitSchema.parse(limit));
}
