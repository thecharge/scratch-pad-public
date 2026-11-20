import { expect, test } from "bun:test";
import { runSdkIntegration } from "../../packages/scenarios/src/sdk-integration-fixtures.ts";

test("asset integration retains its assertions through the isolated proxy", async () => {
  expect(await runSdkIntegration("testing/integration/api/assets.proxy.ts")).toBe(0);
}, 60_000);
