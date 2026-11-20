import { expect, test } from "bun:test";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { streamOf } from "@platform/test-scenarios";
import { AssetSchema } from "@platform/types";
import { downloadAsset, uploadAsset } from "../../../packages/sdk/src/assets.ts";
import {
  assetSdkFailure,
  assetSdkFixture,
  SDK_ASSET,
} from "../../packages/scenarios/src/asset-sdk-fixtures.ts";

const HEADERS = { mediaType: "application/octet-stream", checksum: "0".repeat(64) };
const BAD_HEADERS = { ...HEADERS, checksum: "bad" };
const ERROR = { name: "ApiClientError", status: "UNAUTHENTICATED" };
const TEXT = async (body: ReadableStream<Uint8Array>) => new Response(body).text();

unit(uploadAsset, {
  positive: [
    positive(
      "uploads a stream with the generated client",
      [(await assetSdkFixture(Response.json(SDK_ASSET))).client, streamOf("abc"), HEADERS],
      AssetSchema.parse(SDK_ASSET),
    ),
    positive(
      "accepts an empty stream",
      [(await assetSdkFixture(Response.json(SDK_ASSET))).client, streamOf(), HEADERS],
      AssetSchema.parse(SDK_ASSET),
    ),
  ],
  negative: [
    negative(
      "validates the checksum before sending bytes",
      [(await assetSdkFixture()).client, streamOf("abc"), BAD_HEADERS],
      { name: "ZodError" },
    ),
    negative(
      "maps an API refusal to the typed error",
      [(await assetSdkFixture(assetSdkFailure())).client, streamOf("abc"), HEADERS],
      ERROR,
    ),
  ],
});

unit(downloadAsset, {
  positive: [
    positive(
      "returns a readable download body",
      [(await assetSdkFixture(Response.json(SDK_ASSET), new Response("abc"))).client, "a-one"],
      seen(TEXT, "abc"),
    ),
    positive(
      "supports an empty streamed download",
      [(await assetSdkFixture(Response.json(SDK_ASSET), new Response(""))).client, "a-one"],
      seen(TEXT, ""),
    ),
  ],
  negative: [
    negative(
      "maps a metadata refusal to a typed error",
      [(await assetSdkFixture(assetSdkFailure())).client, "a-one"],
      ERROR,
    ),
    negative(
      "maps a signed download refusal to a typed error",
      [(await assetSdkFixture(Response.json(SDK_ASSET), assetSdkFailure())).client, "a-one"],
      ERROR,
    ),
  ],
});

test("upload sends the original stream bytes, checksum, media type and API credential", async () => {
  const fixture = await assetSdkFixture(Response.json(SDK_ASSET));
  await uploadAsset(fixture.client, streamOf("abc"), HEADERS);
  expect(fixture.bodies).toEqual(["abc"]);
  expect(fixture.requests[0]?.headers.get("content-type")).toBe(HEADERS.mediaType);
  expect(fixture.requests[0]?.headers.get("x-content-sha256")).toBe(HEADERS.checksum);
  expect(fixture.requests[0]?.headers.get("authorization")).toBe("Bearer private-api-token");
});

test("the signed object-store download does not receive the API bearer token", async () => {
  const fixture = await assetSdkFixture(Response.json(SDK_ASSET), new Response("abc"));
  const body = await downloadAsset(fixture.client, "a-one");
  expect(await TEXT(body)).toBe("abc");
  expect(fixture.requests[1]?.url).toBe(SDK_ASSET.downloadUrl);
  expect(fixture.requests[1]?.headers.has("authorization")).toBe(false);
});
