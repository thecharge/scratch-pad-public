import { LogLevel } from "@platform/constants";
import { createLogger } from "@platform/logger";
import { sensitivePaths } from "@platform/masking";
import { startTelemetry } from "@platform/telemetry";
import { createRegistry } from "../../../../apps/api/src/registry.ts";

export async function integrationObservability(enabled: boolean | undefined) {
  const lines: string[] = [];
  const logger =
    enabled === true
      ? await createLogger({
          level: LogLevel.Info,
          redact: await sensitivePaths(await (await createRegistry()).list()),
          sink: { write: (line: string) => lines.push(line) },
        })
      : undefined;
  const telemetry = logger === undefined ? undefined : await startTelemetry([], []);
  return {
    lines,
    logger,
    telemetry:
      telemetry === undefined || logger === undefined
        ? undefined
        : { tracer: telemetry.tracer, meter: telemetry.meter, logger },
  };
}
