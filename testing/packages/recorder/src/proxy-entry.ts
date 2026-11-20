import { afterAll, expect, test } from "bun:test";
import {
  PROXY_RECORDER_CASE,
  PROXY_RECORDER_ENV,
  PROXY_RECORDER_MISSING_INPUT,
  PROXY_RECORDER_RESULT_SUFFIX,
  Text,
  UI_RECORDING_TIMEOUT_MS,
} from "@platform/constants";
import { finishProxyIntegration, proxyBackendRefused } from "@platform/test-scenarios";
import { ProxyRecorderInputSchema } from "@platform/types";
import { fetchLiveInterfaces } from "./live.ts";
import { recordPages } from "./record.ts";

afterAll(finishProxyIntegration);
test(
  PROXY_RECORDER_CASE,
  async () => {
    const path = Bun.env[PROXY_RECORDER_ENV];
    if (path === undefined) throw new Error(PROXY_RECORDER_MISSING_INPUT);
    const input = ProxyRecorderInputSchema.parse(await Bun.file(path).json());
    expect(await proxyBackendRefused()).toBe(true);
    const output =
      input.scenarios === undefined
        ? { interfaces: await fetchLiveInterfaces() }
        : { pages: await recordPages(input.scenarios, input.transports) };
    await Bun.write([path, PROXY_RECORDER_RESULT_SUFFIX].join(Text.Empty), JSON.stringify(output));
  },
  UI_RECORDING_TIMEOUT_MS,
);
