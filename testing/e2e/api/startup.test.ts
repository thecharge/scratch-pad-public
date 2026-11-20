import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { EnvVar, StdioMode } from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { all } from "@platform/util";

const ENTRY = join(REPO_ROOT, "apps/api/src/main.ts");

describe("startup configuration", () => {
  test("production without an auth decision exits non-zero and names the setting", async () => {
    const inherited = Object.entries(Bun.env).filter(([key]) => key !== EnvVar.AuthEnabled);
    const child = Bun.spawn(["bun", "run", ENTRY], {
      env: { ...Object.fromEntries(inherited), [EnvVar.AppEnv]: "production" },
      stdout: StdioMode.Pipe,
      stderr: StdioMode.Pipe,
    });
    const [code, out, err] = (await all<number | string>([
      async () => child.exited,
      async () => new Response(child.stdout).text(),
      async () => new Response(child.stderr).text(),
    ])) as [number, string, string];
    expect(code).not.toBe(0);
    expect(out + err).toContain(EnvVar.AuthEnabled);
  });
});
