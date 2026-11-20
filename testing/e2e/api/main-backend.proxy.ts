import { test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { API_PORT } from "@platform/config/environments";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import {
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  EnvVar,
  READY_LINE_PREFIX,
  StdioMode,
} from "@platform/constants";
import { REPO_ROOT, readUntil, waitUntil } from "@platform/test-framework";

test.each(["SIGTERM", "SIGINT"] as const)("the actual api process handles %s", async (signal) => {
  const child = Bun.spawn(["bun", "run", join(REPO_ROOT, "apps/api/src/main.ts")], {
    env: {
      ...Bun.env,
      [EnvVar.Port]: String(API_PORT),
      [EnvVar.DatabasePath]: ":memory:",
      [EnvVar.AuthEnabled]: "false",
      [EnvVar.AuthResource]: TEST_PROXY_ORIGIN,
      [EnvVar.ProxySecret]: Bun.env.FIXTURE_SECRET,
      [EnvVar.LogLevel]: "info",
      [EnvVar.ShutdownTimeoutMs]: String(DEFAULT_SHUTDOWN_TIMEOUT_MS),
    },
    stdout: StdioMode.Pipe,
    stderr: StdioMode.Inherit,
  });
  try {
    const reader = child.stdout.getReader();
    const started = await readUntil(reader, READY_LINE_PREFIX);
    await Bun.write(join(tmpdir(), `${signal}-ready`), "ready");
    await waitUntil(() => Bun.file(join(tmpdir(), `${signal}-finish`)).exists());
    const signalled = performance.now();
    child.kill(signal);
    const rest = await readUntil(reader, "stopped");
    const code = await child.exited;
    const elapsed = performance.now() - signalled;
    await Bun.write(
      join(tmpdir(), `${signal}-result.json`),
      JSON.stringify({ code, elapsed, started, rest }),
    );
  } finally {
    child.kill();
    await child.exited;
  }
});
