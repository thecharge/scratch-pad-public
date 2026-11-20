import { KB_CLOCK_EPOCH, KB_CLOCK_STEP_MS } from "@platform/constants";

export async function createTickClock(
  epoch: string = KB_CLOCK_EPOCH,
  stepMs: number = KB_CLOCK_STEP_MS,
): Promise<() => Promise<Date>> {
  const start = new Date(epoch).getTime();
  const counter = { ticks: 0 };
  return async () => {
    const date = new Date(start + counter.ticks * stepMs);
    counter.ticks += 1;
    return date;
  };
}
