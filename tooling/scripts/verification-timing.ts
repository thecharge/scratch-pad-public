import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { MILLISECONDS_PER_SECOND, VERIFY_REPORT_DIR } from "@platform/constants";
import type { StepTiming } from "@platform/types";

export async function measurePhase<T>(
  step: string,
  action: () => Promise<T>,
  records: StepTiming[],
  exitStatus = false,
): Promise<T> {
  const started = performance.now();
  let ok = false;
  try {
    const result = await action();
    ok = !exitStatus || result === 0;
    return result;
  } finally {
    records.push({ step, ok, seconds: (performance.now() - started) / MILLISECONDS_PER_SECOND });
  }
}

export async function writeTimings(
  records: readonly StepTiming[],
  root: string,
  file: string,
): Promise<void> {
  const directory = join(root, VERIFY_REPORT_DIR);
  await mkdir(directory, { recursive: true });
  await Bun.write(join(directory, file), JSON.stringify(records, null, 2));
}
