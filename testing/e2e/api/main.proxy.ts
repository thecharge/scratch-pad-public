import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { API_PORT } from "@platform/config/environments";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { CLEAN_EXIT_CODE, DEFAULT_SHUTDOWN_TIMEOUT_MS } from "@platform/constants";
import { waitUntil } from "@platform/test-framework";
import { LifecycleResultSchema } from "@platform/types";
import { proxyBackendRefused } from "../../packages/scenarios/src/integration-proxy-client.ts";

async function ready(signal: string) {
  await waitUntil(() => Bun.file(join(tmpdir(), `${signal}-ready`)).exists());
}
async function finish(signal: string) {
  await Bun.write(join(tmpdir(), `${signal}-finish`), "finish");
  const path = join(tmpdir(), `${signal}-result.json`);
  await waitUntil(() => Bun.file(path).exists());
  return LifecycleResultSchema.parse(await Bun.file(path).json());
}

describe("the server process", () => {
  test("serves a request, then shuts down cleanly with its logs flushed", async () => {
    await ready("SIGTERM");
    expect(await proxyBackendRefused()).toBe(true);
    const response = await fetch(`${TEST_PROXY_ORIGIN}/v1/config`, {
      headers: { accept: "application/json" },
    });
    const served = await response.json();
    const { started, rest, code } = await finish("SIGTERM");
    const lines = (started + rest)
      .split("\n")
      .filter((line) => line.startsWith("{"))
      .map((line) => JSON.parse(line));
    expect(served).toMatchObject({ name: "config" });
    expect(code).toBe(0);
    expect(lines.map((line) => line.msg)).toEqual([
      `listening on port ${API_PORT}`,
      "request completed",
      "shutting down",
      "stopped",
    ]);
    expect(lines[1]).toMatchObject({ capability: "config.get", status: "OK" });
    expect(lines[1].traceId).toMatch(/^[0-9a-f]{32}$/);
  });
  test("SIGINT exits cleanly within the shutdown timeout with the stopped line present", async () => {
    await ready("SIGINT");
    const { code, elapsed, rest } = await finish("SIGINT");
    expect(code).toBe(CLEAN_EXIT_CODE);
    expect(elapsed).toBeLessThan(DEFAULT_SHUTDOWN_TIMEOUT_MS);
    expect(rest).toContain("stopped");
  });
});
