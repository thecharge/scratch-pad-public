import { expect, test } from "bun:test";
import { runSdkIntegration } from "../../packages/scenarios/src/sdk-integration-fixtures.ts";

test("Better Auth retains its assertions through the isolated proxy", async () => {
  expect(await runSdkIntegration("testing/integration/auth-better-auth/better-auth.proxy.ts")).toBe(
    0,
  );
}, 60_000);
