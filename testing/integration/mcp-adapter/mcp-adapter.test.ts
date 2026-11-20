import { expect, test } from "bun:test";
import { runSdkIntegration } from "../../packages/scenarios/src/sdk-integration-fixtures.ts";

test("mcp-adapter retains its assertions through the isolated proxy", async () => {
  expect(await runSdkIntegration("testing/integration/mcp-adapter/mcp-adapter.proxy.ts")).toBe(0);
}, 60_000);
