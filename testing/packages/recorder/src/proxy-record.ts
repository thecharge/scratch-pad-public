import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PROXY_RECORDER_ENTRY,
  PROXY_RECORDER_ENV,
  PROXY_RECORDER_INPUT_FILE,
  PROXY_RECORDER_PREFIX,
  PROXY_RECORDER_RESULT_SUFFIX,
  Text,
} from "@platform/constants";
import { runSdkIntegration } from "@platform/test-scenarios";
import { type ProxyRecorderInput, ProxyRecorderOutputSchema } from "@platform/types";

export async function runProxyRecorder(input: ProxyRecorderInput) {
  const folder = await mkdtemp(join(tmpdir(), PROXY_RECORDER_PREFIX));
  const path = join(folder, PROXY_RECORDER_INPUT_FILE);
  try {
    await Bun.write(path, JSON.stringify(input));
    await runSdkIntegration(PROXY_RECORDER_ENTRY, undefined, [folder], {
      [PROXY_RECORDER_ENV]: path,
    });
    return ProxyRecorderOutputSchema.parse(
      await Bun.file([path, PROXY_RECORDER_RESULT_SUFFIX].join(Text.Empty)).json(),
    );
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}
