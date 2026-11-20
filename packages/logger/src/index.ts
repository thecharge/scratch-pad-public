import { LOG_REDACT_WILDCARD, MASK_REPLACEMENT } from "@platform/constants";
import type { LoggerOptions } from "@platform/types";
import pino from "pino";

async function expand(paths: readonly string[]): Promise<string[]> {
  return [...new Set(paths.flatMap((path) => [path, `${LOG_REDACT_WILDCARD}${path}`]))];
}

export async function createLogger(options: LoggerOptions) {
  return pino(
    {
      level: options.level,
      redact: { paths: await expand(options.redact), censor: MASK_REPLACEMENT },
    },
    options.sink ?? pino.destination({ sync: true }),
  );
}
