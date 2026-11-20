import { expect, test } from "bun:test";
import type { ResourceTemplate } from "@modelcontextprotocol/server";
import { createAssetStore } from "@platform/assets";
import { PrincipalKind, TransportKind } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { bytesOf, fakeDeps, stubServer } from "@platform/test-scenarios";
import {
  AssetDownloadSchema,
  type CapabilityContext,
  type Invoke,
  type ReadStateCallback,
} from "@platform/types";
import { assetCapabilities } from "../../../apps/api/src/capabilities/assets.ts";
import { registerAssetResources } from "../../../packages/mcp-adapter/src/assets.ts";
import { toolHandler } from "../../../packages/mcp-adapter/src/tools.ts";
import { assetChecksum } from "../../packages/scenarios/src/asset-fixtures.ts";
import {
  ASSET_STORE_SETTINGS,
  assetClients,
} from "../../packages/scenarios/src/asset-store-fixtures.ts";

const STORE = await createAssetStore(ASSET_STORE_SETTINGS, assetClients().clients);
const DEPS = await fakeDeps();
const CAPS = await assetCapabilities(DEPS, STORE);
const CAPABILITIES = [CAPS.get, CAPS.list];
const PRINCIPAL = { kind: PrincipalKind.User, subject: "owner", scopes: ["read"], roles: [] };
const CONTEXT: CapabilityContext = {
  principal: PRINCIPAL,
  requestId: "asset-request",
  transport: TransportKind.Mcp,
  authEnabled: true,
};
const BODY = new Uint8Array([1, 2, 3]);
const ASSET = await STORE.upload(
  bytesOf(BODY),
  { mediaType: "application/octet-stream", checksum: assetChecksum(BODY) },
  "owner",
);
const invoke: Invoke = async (capability, input, context) => ({
  output: await capability.handler(input, context),
  cacheHit: false,
});
const registration = stubServer();
const reading = stubServer();
const skipped = stubServer();
const refusing = stubServer(new Error("registration refused"));
const readOf = (calls: unknown[][]) =>
  ((calls[0] ?? [])[3] as ReadStateCallback)(new URL(ASSET.uri), { asset: ASSET.name.slice(7) });
const DETAIL = await STORE.get(ASSET.name, "owner");
const EXPECTED = {
  contents: [
    {
      uri: ASSET.uri,
      mimeType: "application/json",
      text: JSON.stringify(AssetDownloadSchema.parse(DETAIL)),
    },
  ],
};

unit(registerAssetResources, {
  positive: [
    positive(
      "registers an asset URI template",
      [registration.server, CAPABILITIES, invoke, CONTEXT],
      seen(async () => registration.calls[0]?.[0], "assets.get"),
    ),
    positive(
      "resource reads return metadata and an authorized download link",
      [reading.server, CAPABILITIES, invoke, CONTEXT],
      seen(async () => readOf(reading.calls), EXPECTED),
    ),
  ],
  negative: [
    rejected(
      "a hidden get capability exposes no asset template",
      [skipped.server, [CAPS.list], invoke, CONTEXT],
      seen(async () => skipped.calls.length, 0),
    ),
    negative(
      "registration failures remain visible",
      [refusing.server, CAPABILITIES, invoke, CONTEXT],
      { message: "registration refused" },
    ),
  ],
});

test("the list callback enumerates only resources visible to the principal", async () => {
  const fixture = stubServer();
  await registerAssetResources(fixture.server, CAPABILITIES, invoke, CONTEXT);
  const template = fixture.calls[0]?.[1] as ResourceTemplate;
  const result = await template.listCallback?.({} as never);
  expect(result?.resources).toEqual([
    expect.objectContaining({ uri: ASSET.uri, mimeType: "application/json" }),
  ]);
});

test("an asset tool returns metadata and a resource link without embedding file bytes", async () => {
  const handle = await toolHandler(CAPS.get, invoke, PRINCIPAL, true, "request");
  const result = await handle({ name: ASSET.name });
  expect(result.isError).toBe(false);
  expect(result.content[1]).toMatchObject({ type: "resource_link", name: ASSET.name, size: 3 });
  expect(result.structuredContent?.sha256).toBe(ASSET.sha256);
});
