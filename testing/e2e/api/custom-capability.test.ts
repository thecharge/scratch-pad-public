import { expect, test } from "bun:test";
import { runSdkIntegration } from "../../packages/scenarios/src/sdk-integration-fixtures.ts";

test("custom capabilities retain their assertions through the isolated proxy", async () => {
  expect(await runSdkIntegration("testing/e2e/api/custom-capability.proxy.ts")).toBe(0);
}, 60_000);
