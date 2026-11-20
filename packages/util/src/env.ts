import { DEFAULT_CONCURRENCY_LIMIT, EnvVar } from "@platform/constants";
import { ConcurrencyLimitSchema, type Environment } from "@platform/types";

export async function concurrencyLimit(
  limit?: number,
  environment: Environment = process.env,
): Promise<number> {
  const raw = limit ?? environment[EnvVar.ConcurrencyLimit];
  if (raw === undefined) {
    return DEFAULT_CONCURRENCY_LIMIT;
  }
  return Number.isInteger(raw) && Number(raw) >= 1
    ? Number(raw)
    : ConcurrencyLimitSchema.parse(raw);
}
