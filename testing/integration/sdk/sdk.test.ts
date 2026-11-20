import { expect, test } from "bun:test";
import { runSdkIntegration } from "../../packages/scenarios/src/sdk-integration-fixtures.ts";

test("the generated SDK passes its original cases through the isolated proxy", async () => {
  expect(await runSdkIntegration()).toBe(0);
}, 60_000);
