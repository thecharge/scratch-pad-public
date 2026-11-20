import { expect, test } from "bun:test";
import { runSdkIntegration } from "../../packages/scenarios/src/sdk-integration-fixtures.ts";

test("API conformance retains its assertions through the isolated proxy", async () => {
  expect(await runSdkIntegration("testing/integration/api/conformance.proxy.ts")).toBe(0);
}, 60_000);
