import type { HttpStage } from "@platform/constants";
import type { StageRecorder } from "@platform/types";

export async function timed<T>(
  stages: StageRecorder | undefined,
  stage: HttpStage,
  work: () => Promise<T>,
): Promise<T> {
  if (stages === undefined) {
    return await work();
  }
  const started = performance.now();
  try {
    return await work();
  } finally {
    await stages.record(stage, performance.now() - started);
  }
}
