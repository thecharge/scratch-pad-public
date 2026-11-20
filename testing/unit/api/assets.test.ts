import { expect, test } from "bun:test";
import { createAssetStore } from "@platform/assets";
import { PrincipalKind, TransportKind } from "@platform/constants";
import { skillFilesFor } from "@platform/skill-protocol";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { bytesOf, fakeDeps } from "@platform/test-scenarios";
import {
  AssetDownloadSchema,
  AssetListSchema,
  AssetSchema,
  type CapabilityContext,
} from "@platform/types";
import { assetCapabilities } from "../../../apps/api/src/capabilities/assets.ts";
import { assetChecksum } from "../../packages/scenarios/src/asset-fixtures.ts";
import {
  ASSET_STORE_SETTINGS,
  assetClients,
} from "../../packages/scenarios/src/asset-store-fixtures.ts";

const DEPS = await fakeDeps();
const STORE = await createAssetStore(ASSET_STORE_SETTINGS, assetClients().clients);
const PRINCIPAL = {
  kind: PrincipalKind.User,
  subject: "owner",
  scopes: ["read", "write"],
  roles: [],
};
const CONTEXT: CapabilityContext = {
  principal: PRINCIPAL,
  requestId: "asset-request",
  transport: TransportKind.Http,
  authEnabled: true,
};
const BYTES = new Uint8Array([1, 2]);
const HEADERS = { mediaType: "application/octet-stream", checksum: assetChecksum(BYTES) };
const ASSET = await STORE.upload(bytesOf(BYTES), HEADERS, "owner");
const EMPTY_LIST = { assets: [], nextPageToken: "" };
const OTHER = { ...CONTEXT, principal: { ...PRINCIPAL, subject: "other" } };

unit(assetCapabilities, {
  positive: [
    positive(
      "defines streamed upload only over HTTP",
      [DEPS, STORE],
      seen(
        async (capabilities: Awaited<ReturnType<typeof assetCapabilities>>) =>
          capabilities.upload.onlyOver,
        TransportKind.Http,
      ),
    ),
    positive("lists only the current principal's metadata", [DEPS, STORE], EMPTY_LIST, [
      "list.handler",
      {},
      OTHER,
    ]),
  ],
  negative: [
    negative(
      "without storage configuration storage refuses reads",
      [DEPS],
      { code: "UNAVAILABLE" },
      ["get.handler", { name: "assets/missing" }, CONTEXT],
    ),
    negative("another owner cannot obtain a signed URL", [DEPS, STORE], { code: "NOT_FOUND" }, [
      "get.handler",
      { name: ASSET.name },
      OTHER,
    ]),
  ],
});

test("upload, metadata and paginated list share one capability definition", async () => {
  const capabilities = await assetCapabilities(DEPS, STORE);
  const result = AssetSchema.parse(
    await capabilities.upload.handler({ ...HEADERS, body: bytesOf(BYTES) }, CONTEXT),
  );
  const metadata = AssetDownloadSchema.parse(
    await capabilities.get.handler({ name: result.name }, CONTEXT),
  );
  expect(metadata.sha256).toBe(HEADERS.checksum);
  const first = AssetListSchema.parse(await capabilities.list.handler({ pageSize: 1 }, CONTEXT));
  expect(first.assets).toHaveLength(1);
  expect(first.nextPageToken).not.toBe("");
});

test("a stream validation failure is an invalid-argument API error", async () => {
  const capabilities = await assetCapabilities(DEPS, STORE);
  const bad = { ...HEADERS, checksum: "0".repeat(64), body: bytesOf(BYTES) };
  await expect(capabilities.upload.handler(bad, CONTEXT)).rejects.toMatchObject({
    code: "INVALID_ARGUMENT",
  });
});

test("a credential without a subject cannot access assets", async () => {
  const capabilities = await assetCapabilities(DEPS, STORE);
  const principal = { kind: PrincipalKind.User, scopes: ["read"], roles: [] };
  await expect(capabilities.list.handler({}, { ...CONTEXT, principal })).rejects.toMatchObject({
    code: "UNAUTHENTICATED",
  });
});

test("asset skill reference documents a binary body while runtime validation requires a stream", async () => {
  const capabilities = await assetCapabilities(DEPS, STORE);
  const files = await skillFilesFor({ name: "assets", capabilities: [capabilities.upload] });
  expect(files["references/assets.create.md"]).toContain('"format": "binary"');
  expect(capabilities.upload.input.safeParse({ ...HEADERS, body: "bytes" }).success).toBe(false);
  expect(capabilities.upload.input.safeParse({ ...HEADERS, body: bytesOf(BYTES) }).success).toBe(
    true,
  );
});
