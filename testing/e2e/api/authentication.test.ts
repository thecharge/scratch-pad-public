import { expect, test } from "bun:test";
import { runSdkIntegration } from "../../packages/scenarios/src/sdk-integration-fixtures.ts";

test("the recorder retains its assertions through the isolated proxy", async () => {
  expect(await runSdkIntegration("testing/e2e/api/authentication.proxy.ts")).toBe(0);
}, 60_000);
