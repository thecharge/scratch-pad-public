import type { EnvironmentName } from "@platform/constants";
import type { StreamObservation } from "@platform/types";
import {
  containerOutput,
  proxyErrorLines,
  proxyRequest,
  removeContainer,
  startStream,
  waitForContainer,
} from "./proxy-fixtures.ts";

const WAIT_STEP_MS = 100;
const WAIT_LIMIT_MS = 5000;
const OUTPUT_LINE_BREAK = "\n";
const ACCEPT_JSON = "Accept: application/json";
const REQUEST_ID_HEADER = "X-Request-Id: ";
const STREAM_SECONDS = 10;

async function until(name: string, text: string): Promise<boolean> {
  const limit = performance.now() + WAIT_LIMIT_MS;
  while (performance.now() < limit) {
    if ((await containerOutput(name)).includes(text)) {
      return true;
    }
    await Bun.sleep(WAIT_STEP_MS);
  }
  return false;
}

export async function observeStream(
  environment: EnvironmentName,
  flag: string,
  version: string,
  token: string,
  paths: readonly string[],
  steps: readonly string[],
): Promise<StreamObservation> {
  const [streamPath = "", requestPath = ""] = paths;
  const name = ["stream", version].join("-");
  await removeContainer(name);
  await startStream(environment, name, flag, streamPath, token, STREAM_SECONDS);
  const answers: number[] = [];
  const heard: boolean[] = [];
  for (const step of steps) {
    const id = [step, version].join("-");
    answers.push(
      await proxyRequest(environment, flag, requestPath, [ACCEPT_JSON, REQUEST_ID_HEADER + id]),
    );
    heard.push(await until(name, id));
  }
  await waitForContainer(name);
  const lines = (await containerOutput(name)).trim().split(OUTPUT_LINE_BREAK);
  await removeContainer(name);
  return {
    answers,
    heard,
    last: lines.at(-1) ?? "",
    errors: await proxyErrorLines(environment),
  };
}
