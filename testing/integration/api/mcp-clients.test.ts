import { expect, test } from "bun:test";
import { runSdkIntegration } from "../../packages/scenarios/src/sdk-integration-fixtures.ts";

test("mcp-clients retains its assertions through the isolated proxy", async () => {
  expect(await runSdkIntegration("testing/integration/api/mcp-clients.proxy.ts")).toBe(0);
}, 60_000);
