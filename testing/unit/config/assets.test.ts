import { expect, test } from "bun:test";
import { loadConfig } from "@platform/config";
import { assetStorageFor } from "@platform/config/assets";
import { environmentFor } from "@platform/config/environments";
import { EnvironmentName } from "@platform/constants";
import { negative, positive, unit } from "@platform/test-factories";
import { TEST_PROXY_SECRET } from "@platform/test-scenarios";
import { ASSET_STORE_SETTINGS } from "../../packages/scenarios/src/asset-store-fixtures.ts";

const BASE = await environmentFor(EnvironmentName.Test, TEST_PROXY_SECRET);
const ENVIRONMENT = await environmentFor(EnvironmentName.Test, TEST_PROXY_SECRET, {
  RUSTFS_ACCESS_KEY: ASSET_STORE_SETTINGS.accessKeyId,
  RUSTFS_SECRET_KEY: ASSET_STORE_SETTINGS.secretAccessKey,
});
const EXPECTED = { ...ASSET_STORE_SETTINGS, endpoint: "http://10.91.2.13:9000" };

unit(assetStorageFor, {
  positive: [
    positive(
      "uses the backend for upload and the asset proxy for signed downloads",
      [ENVIRONMENT],
      EXPECTED,
    ),
    positive("leaves storage disabled without a store", [BASE], undefined),
  ],
  negative: [
    negative("refuses a missing environment", [undefined], { name: "TypeError" }),
    negative("refuses a null environment", [null], { name: "TypeError" }),
  ],
});

test("loadConfig validates the complete asset configuration", async () => {
  const config = await loadConfig({ ASSET_STORAGE: JSON.stringify(ASSET_STORE_SETTINGS) });
  expect(config.assets).toEqual(ASSET_STORE_SETTINGS);
});

test.each(["invalid", "{}"])(
  "loadConfig refuses malformed storage without echoing credentials: %s",
  async (value) => {
    await expect(loadConfig({ ASSET_STORAGE: value })).rejects.toMatchObject({
      name: "ConfigError",
      issues: [{ variable: "ASSET_STORAGE", code: "invalid" }],
    });
  },
);
