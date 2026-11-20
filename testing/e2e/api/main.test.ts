import { expect, test } from "bun:test";
import { runSdkIntegration } from "../../packages/scenarios/src/sdk-integration-fixtures.ts";

test("the real api process retains its lifecycle assertions through the proxy", async () => {
  expect(
    await runSdkIntegration(
      "testing/e2e/api/main.proxy.ts",
      "testing/e2e/api/main-backend.proxy.ts",
    ),
  ).toBe(0);
}, 60_000);
