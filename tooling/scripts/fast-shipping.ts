import { StdioMode } from "@platform/constants";
import type { StepTiming } from "@platform/types";
import { all } from "@platform/util";
import {
  FAST_SHIP_BANNER,
  FAST_SHIP_BUDGET_SECONDS,
  FAST_SHIP_CONCURRENCY,
  FAST_SHIP_EARLY,
  FAST_SHIP_EXCLUDED,
  FAST_SHIP_FINAL,
  FAST_SHIP_INTEGRATION,
  FAST_SHIP_INTEGRATION_COMMAND,
  FAST_SHIP_REPORT,
  FAST_SHIP_SCAN_COMMAND,
  FAST_SHIP_SCAN_STEP,
  FAST_SHIP_SERIAL,
  FAST_SHIP_TIMING,
  FAST_SHIP_UNIT,
  FAST_SHIP_UNIT_COMMAND,
} from "../../packages/constants/src/fast-shipping.ts";
import { REPO_ROOT } from "./tools.ts";
import { measurePhase, writeTimings } from "./verification-timing.ts";

export async function shippingCommands(
  commands: Readonly<Record<string, readonly string[]>>,
): Promise<Record<string, readonly string[]>> {
  const selected = Object.entries(commands).filter(([step]) => !FAST_SHIP_EXCLUDED.includes(step));
  return Object.fromEntries([
    [FAST_SHIP_UNIT, FAST_SHIP_UNIT_COMMAND],
    [FAST_SHIP_INTEGRATION, FAST_SHIP_INTEGRATION_COMMAND],
    [FAST_SHIP_SCAN_STEP, FAST_SHIP_SCAN_COMMAND],
    ...selected,
  ]);
}

export async function launchShippingCommand(
  command: readonly string[],
  spawn = Bun.spawn,
): Promise<number> {
  const child = spawn([...command], {
    cwd: REPO_ROOT,
    stdout: StdioMode.Inherit,
    stderr: StdioMode.Inherit,
  });
  return child.exited;
}

async function releaseFormatter(step: string, release: () => void): Promise<void> {
  if (step === FAST_SHIP_SCAN_STEP) release();
}

export async function fastShipping(
  commands: Readonly<Record<string, readonly string[]>>,
  execute: (command: readonly string[]) => Promise<number> = launchShippingCommand,
  root = REPO_ROOT,
  budget = FAST_SHIP_BUDGET_SECONDS,
): Promise<number> {
  const started = performance.now();
  const results: StepTiming[] = [];
  const entries = Object.entries(await shippingCommands(commands));
  const serial = FAST_SHIP_SERIAL.flatMap((step) => entries.filter(([name]) => name === step));
  const early = entries.filter(([step]) => FAST_SHIP_EARLY.includes(step));
  const parallel = entries.filter(
    ([step]) =>
      !FAST_SHIP_SERIAL.includes(step) &&
      !FAST_SHIP_EARLY.includes(step) &&
      step !== FAST_SHIP_FINAL,
  );
  const prepared = Promise.withResolvers<void>();
  const formatterReady = Promise.withResolvers<void>();
  console.log(FAST_SHIP_BANNER);
  await all(
    [
      async () => {
        try {
          for (const [step, command] of serial) {
            await measurePhase(step, async () => execute(command), results, true);
            await releaseFormatter(step, formatterReady.resolve);
          }
        } finally {
          formatterReady.resolve();
          prepared.resolve();
        }
      },
      ...early.map(([step, command]) => async () => {
        await formatterReady.promise;
        await measurePhase(step, async () => execute(command), results, true);
      }),
      ...parallel.map(([step, command]) => async () => {
        await prepared.promise;
        await measurePhase(step, async () => execute(command), results, true);
      }),
    ],
    FAST_SHIP_CONCURRENCY,
  );
  for (const [step, command] of entries.filter(([step]) => step === FAST_SHIP_FINAL)) {
    await measurePhase(step, async () => execute(command), results, true);
  }
  await writeTimings(results, root, FAST_SHIP_REPORT);
  const seconds = (performance.now() - started) / 1000;
  console.log(FAST_SHIP_TIMING, seconds.toFixed(2));
  return results.every(({ ok }) => ok) && seconds <= budget ? 0 : 1;
}
