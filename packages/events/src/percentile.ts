import { OPERATION_BUCKETS_MS } from "@platform/constants";

export async function percentileMs(buckets: readonly number[], fraction: number): Promise<number> {
  const total = buckets.reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return 0;
  }
  const target = Math.ceil(total * fraction);
  let seen = 0;
  for (const [index, count] of buckets.entries()) {
    seen += count;
    if (seen >= target) {
      return OPERATION_BUCKETS_MS[index] ?? (OPERATION_BUCKETS_MS.at(-1) as number);
    }
  }
  return OPERATION_BUCKETS_MS.at(-1) as number;
}
