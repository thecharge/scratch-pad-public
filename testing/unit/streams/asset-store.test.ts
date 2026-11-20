import { expect, test } from "bun:test";
import { createAssetStore } from "@platform/assets";
import { negative, positive, unit } from "@platform/test-factories";
import { bytesOf } from "@platform/test-scenarios";
import { assetChecksum } from "../../packages/scenarios/src/asset-fixtures.ts";
import {
  ASSET_STORE_SETTINGS,
  assetClients,
} from "../../packages/scenarios/src/asset-store-fixtures.ts";

const BYTES = new Uint8Array([1, 2, 3]);
const HEADERS = { mediaType: "application/octet-stream", checksum: assetChecksum(BYTES) };
const EMPTY_HEADERS = { ...HEADERS, checksum: assetChecksum(new Uint8Array()) };
const WRONG_HEADERS = { ...HEADERS, checksum: "0".repeat(64) };
const BAD_ENDPOINT = { ...ASSET_STORE_SETTINGS, endpoint: "bad" };
const BAD_SECRET = { ...ASSET_STORE_SETTINGS, secretAccessKey: "" };

unit(createAssetStore, {
  positive: [
    positive(
      "builds clients lazily without opening a connection",
      [ASSET_STORE_SETTINGS],
      undefined,
      ["get", "invalid", "owner"],
    ),
    positive(
      "a missing metadata record has no download link",
      [ASSET_STORE_SETTINGS, assetClients().clients],
      undefined,
      ["get", "assets/missing", "owner"],
    ),
  ],
  negative: [
    negative("refuses an invalid endpoint", [BAD_ENDPOINT], { name: "ZodError" }),
    negative("refuses an empty credential", [BAD_SECRET], { name: "ZodError" }),
  ],
});

test("publishes metadata after completion and returns an expiring proxy link only to its owner", async () => {
  const fixture = assetClients();
  const store = await createAssetStore(ASSET_STORE_SETTINGS, fixture.clients);
  const asset = await store.upload(bytesOf(BYTES), HEADERS, "owner");
  expect(asset).toMatchObject({ sizeBytes: 3, sha256: HEADERS.checksum });
  expect(asset.uri).toBe(asset.name.replace("assets/", "asset://"));
  expect(asset).not.toHaveProperty("owner");
  expect(fixture.calls.slice(0, 2)).toEqual([
    "writer 5242880 1 application/octet-stream",
    "complete",
  ]);
  expect(await store.get(asset.name, "owner")).toMatchObject({
    downloadUrl: expect.stringContaining("?expires=300"),
  });
  expect(await store.get(asset.name, "other")).toBeUndefined();
  expect(await store.list("owner")).toEqual([asset]);
  expect(await store.list("other")).toEqual([]);
});

test("reads every metadata page without returning another owner's assets", async () => {
  const fixture = assetClients();
  const store = await createAssetStore(ASSET_STORE_SETTINGS, fixture.clients);
  const first = await store.upload(bytesOf(BYTES), HEADERS, "owner");
  await store.upload(bytesOf(BYTES), HEADERS, "other");
  const last = await store.upload(bytesOf(), EMPTY_HEADERS, "owner");
  expect(await store.list("owner")).toEqual([first, last]);
});

test.each(["complete", "metadata"])("removes data and metadata when %s fails", async (failure) => {
  const fixture = assetClients(failure);
  const store = await createAssetStore(ASSET_STORE_SETTINGS, fixture.clients);
  await expect(store.upload(bytesOf(BYTES), HEADERS, "owner")).rejects.toThrow(`${failure} failed`);
  expect(fixture.objects.size).toBe(0);
  expect(fixture.calls.filter((call) => call.startsWith("delete "))).toHaveLength(2);
});

test("a checksum failure aborts multipart work and removes both records", async () => {
  const fixture = assetClients();
  const store = await createAssetStore(ASSET_STORE_SETTINGS, fixture.clients);
  await expect(store.upload(bytesOf(BYTES), WRONG_HEADERS, "owner")).rejects.toThrow("checksum");
  expect(fixture.objects.size).toBe(0);
  expect(fixture.calls).toContain("abort");
});

test("preflight refusal allocates no multipart writer", async () => {
  const fixture = assetClients();
  const store = await createAssetStore(ASSET_STORE_SETTINGS, fixture.clients);
  await expect(
    store.upload(bytesOf(BYTES), { ...HEADERS, mediaType: "invalid" }, "owner"),
  ).rejects.toThrow("media type");
  expect(fixture.calls).toEqual([]);
});
