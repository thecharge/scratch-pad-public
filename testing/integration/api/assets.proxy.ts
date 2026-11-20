import { afterAll, expect, test } from "bun:test";
import { TEST_ASSET_PUBLIC_ENDPOINT } from "@platform/config/urls";
import { bytesOf, removeAll } from "@platform/test-scenarios";
import { AssetSchema } from "@platform/types";
import { z } from "zod";
import { assetChecksum } from "../../packages/scenarios/src/asset-fixtures.ts";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const fixture = await proxyFixture({ enabled: true, assets: true, domain: "api.test" });
const origin = fixture.origin;
const issuer = fixture.issuer;
const api = { fetch: (request: Request) => fetch(request) };
const ObjectEntriesSchema = z.array(z.tuple([z.string(), z.array(z.number())]));
async function objects() {
  const response = await fetch(`${origin}/__objects`);
  if (!response.ok) throw new Error(await response.text());
  return new Map(
    ObjectEntriesSchema.parse(await response.json()).map(([key, value]) => [
      key,
      new Uint8Array(value),
    ]),
  );
}
const owner = await issuer.issue({ subject: "owner", scopes: ["read", "write"] });
const reader = await issuer.issue({ subject: "owner", scopes: ["read"] });
const other = await issuer.issue({ subject: "other", scopes: ["read", "write"] });
const bytes = new Uint8Array([0, 255, 1, 128]);
const checksum = assetChecksum(bytes);
afterAll(async () => {
  await finishProxyIntegration();
  await removeAll();
});

test("HTTP upload preserves raw binary and publishes only completed owner metadata", async () => {
  const response = await api.fetch(
    new Request(`${origin}/v1/assets`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/octet-stream",
        "x-content-sha256": checksum,
        Authorization: `Bearer ${owner}`,
      },
      body: bytesOf(bytes),
    }),
  );
  expect(response.status).toBe(200);
  const asset = AssetSchema.parse(await response.json());
  expect((await objects()).get(`objects/${asset.name.slice(7)}`)).toEqual(bytes);
  const metadata = await api.fetch(
    new Request(`${origin}/v1/${asset.name}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${owner}` },
    }),
  );
  expect(await metadata.json()).toMatchObject({
    sha256: checksum,
    sizeBytes: 4,
    downloadUrl: expect.stringContaining(`${TEST_ASSET_PUBLIC_ENDPOINT}/`),
  });
  const denied = await api.fetch(
    new Request(`${origin}/v1/${asset.name}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${other}` },
    }),
  );
  expect(denied.status).toBe(404);
});

test.each([
  ["reader cannot upload", reader, "application/octet-stream", checksum, 403],
  ["unsupported media is refused", owner, "application/x-unknown", checksum, 415],
  ["malformed checksum is refused", owner, "application/octet-stream", "bad", 400],
  ["wrong checksum removes partial bytes", owner, "application/octet-stream", "0".repeat(64), 400],
] as const)("%s", async (_label, token, media, hash, status) => {
  const before = [...(await objects()).keys()];
  const response = await api.fetch(
    new Request(`${origin}/v1/assets`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": media,
        "x-content-sha256": hash,
        Authorization: `Bearer ${token}`,
      },
      body: bytesOf(bytes),
    }),
  );
  expect(response.status).toBe(status);
  expect([...(await objects()).keys()]).toEqual(before);
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
