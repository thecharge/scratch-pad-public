import { afterAll, beforeAll, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { ASSET_MAX_BYTES } from "@platform/config/assets";
import { HTTPS_SCHEME, OBJECT_STORE_HOSTS, PROXY_PORT } from "@platform/config/environments";
import { ASSET_RECORD_PATH, EnvironmentName } from "@platform/constants";
import { REPO_ROOT, waitUntil } from "@platform/test-framework";
import { documentStep } from "@platform/test-scenarios";
import { AssetListSchema } from "@platform/types";
import { all } from "@platform/util";
import { stackDown, stackUp } from "../../../apps/infra/src/cli.ts";
import { assetSdkProxy } from "../../packages/scenarios/src/asset-client-fixtures.ts";
import { assetChecksum } from "../../packages/scenarios/src/asset-fixtures.ts";
import { recordedAssetStep } from "../../packages/scenarios/src/asset-recording.ts";
import {
  OBJECT_STORE_TEST_ENV,
  objectStoreRequest,
  setObjectStoreEnvironment,
} from "../../packages/scenarios/src/object-store-fixtures.ts";
import { scopedApiFixture } from "../../packages/scenarios/src/scoped-api-fixtures.ts";

const environment = EnvironmentName.Test;
const budget = 1_800_000;
const previousAccess = Bun.env.RUSTFS_ACCESS_KEY;
const previousSecret = Bun.env.RUSTFS_SECRET_KEY;
const bucket = `/product-object-store-proof-${crypto.randomUUID()}`;
const object = `${bucket}/streamed.txt`;
const content = "a streamed product asset";
let started = -1;
let token = "";
let scoped: Awaited<ReturnType<typeof scopedApiFixture>> | undefined;

beforeAll(async () => {
  await rm(join(REPO_ROOT, ASSET_RECORD_PATH), { force: true });
  await setObjectStoreEnvironment(OBJECT_STORE_TEST_ENV);
  started = await stackUp(environment);
  expect(started).toBe(0);
  scoped = await scopedApiFixture(environment);
  token = scoped.owner;
}, budget);
afterAll(async () => {
  await all(
    [object, `${bucket}/presigned.txt`, `${bucket}/multipart.bin`].map(
      (path) => async () => objectStoreRequest(environment, "DELETE", path),
    ),
  );
  await objectStoreRequest(environment, "DELETE", bucket);
  await scoped?.stop();
  const stopped = await stackDown(environment);
  await rm(partPath, { force: true });
  await rm(assetPath, { force: true });
  await rm(oversizePath, { force: true });
  await setObjectStoreEnvironment({
    RUSTFS_ACCESS_KEY: previousAccess,
    RUSTFS_SECRET_KEY: previousSecret,
  });
  expect(stopped).toBe(0);
}, budget);

test("RustFS starts as part of the typed product stack", () => {
  expect(started).toBe(0);
});
test(
  "a signed request creates a bucket through Caddy",
  async () => {
    const result = await objectStoreRequest(environment, "PUT", bucket);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("200");
  },
  budget,
);
test(
  "signed upload and download preserve the exact asset through Caddy",
  () =>
    documentStep(
      {
        id: "object-store-put-get",
        title: "The object store accepts and returns an asset through the proxy",
        checked: "Signed PUT and GET return 200 and the exact asset bytes.",
        version: "all",
      },
      async () => {
        const put = await objectStoreRequest(environment, "PUT", object, [
          "--data-binary",
          content,
        ]);
        const get = await objectStoreRequest(environment, "GET", object);
        expect(put.stdout.trim()).toBe("200");
        expect(get.stdout).toBe(`${content}\n200`);
      },
    ),
  budget,
);
test(
  "range download returns 206 and only the requested bytes",
  async () => {
    const result = await objectStoreRequest(environment, "GET", object, ["-H", "Range: bytes=2-9"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(`${content.slice(2, 10)}\n206`);
  },
  budget,
);
test(
  "a private asset refuses an unsigned download",
  async () => {
    const result = await objectStoreRequest(environment, "GET", object, [], false);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toEndWith("403");
  },
  budget,
);

const s3 = new Bun.S3Client({
  accessKeyId: OBJECT_STORE_TEST_ENV.RUSTFS_ACCESS_KEY,
  secretAccessKey: OBJECT_STORE_TEST_ENV.RUSTFS_SECRET_KEY,
  endpoint: `${HTTPS_SCHEME}${OBJECT_STORE_HOSTS[environment]}:${PROXY_PORT}`,
  region: "us-east-1",
  bucket: bucket.slice(1),
});
test.each(["PUT", "GET"] as const)(
  "presigned %s works through the proxy with the original host",
  async (method) => {
    const url = new URL(s3.presign("presigned.txt", { method, expiresIn: 300 }));
    const extra = method === "PUT" ? ["--data-binary", content] : [];
    const result = await objectStoreRequest(
      environment,
      method,
      url.pathname + url.search,
      extra,
      false,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(method === "PUT" ? "\n200" : `${content}\n200`);
  },
  budget,
);

const partPath = join(REPO_ROOT, ".stack/e2e/object-store-part.bin");
const assetPath = join(REPO_ROOT, ".stack/e2e/product-upload.bin");
const oversizePath = join(REPO_ROOT, ".stack/e2e/product-upload-oversize.bin");
const assetBytes = new Uint8Array(12 * 1024 * 1024).fill(65);
const assetHeaders = [
  "-H",
  "Accept: application/json",
  "-H",
  "Content-Type: application/octet-stream",
];

test(
  "the packaged API uploads multipart assets and returns a private ranged download through Caddy",
  () =>
    documentStep(
      {
        id: "asset-api-upload-download",
        title: "Upload a private asset and download a range through the proxy",
        checked:
          "A 12 MiB body is uploaded in bounded multipart writes, the checksum matches, an owner receives a signed URL, unsigned access fails and Range returns 206.",
        version: "all",
      },
      async () => {
        await Bun.write(assetPath, assetBytes);
        const uploaded = await recordedAssetStep(
          "Call assets.create to upload a 12 MiB file and verify its checksum",
          "/v1/assets",
          {
            authorization: "Bearer <token>",
            accept: "application/json",
            "content-type": "application/octet-stream",
            "x-content-sha256": assetChecksum(assetBytes),
          },
          async () => {
            const uploaded = await objectStoreRequest(
              environment,
              "POST",
              "/v1/assets",
              [
                ...assetHeaders,
                "-H",
                `Authorization: Bearer ${token}`,
                "-H",
                `x-content-sha256: ${assetChecksum(assetBytes)}`,
                "--data-binary",
                `@${assetPath}`,
              ],
              false,
              "proxy",
            );
            expect(uploaded.stdout.trim()).toEndWith("200");
            return uploaded.stdout;
          },
          "asset.bin",
        );
        const record = JSON.parse(uploaded.slice(0, uploaded.lastIndexOf("\n")));
        expect(record.sizeBytes).toBe(assetBytes.length);
        expect(record.sha256).toBe(assetChecksum(assetBytes));
        await recordedAssetStep(
          "Call assets.list to find your uploaded asset",
          "/v1/assets",
          { authorization: "Bearer <token>", accept: "application/json" },
          async () => {
            const listed = await objectStoreRequest(
              environment,
              "GET",
              "/v1/assets",
              ["-H", "Accept: application/json", "-H", `Authorization: Bearer ${token}`],
              false,
              "proxy",
            );
            expect(listed.stdout.trim()).toEndWith("200");
            expect(listed.stdout).toContain(record.name);
            const page = AssetListSchema.parse(
              JSON.parse(listed.stdout.slice(0, listed.stdout.lastIndexOf("\n"))),
            );
            expect(page.assets.map((asset) => asset.name)).toEqual([record.name]);
            return listed.stdout;
          },
        );
        const metadata = await recordedAssetStep(
          "Call assets.get to read your metadata and obtain a signed download URL",
          `/v1/${record.name}`,
          { authorization: "Bearer <token>", accept: "application/json" },
          async () => {
            const metadata = await objectStoreRequest(
              environment,
              "GET",
              `/v1/${record.name}`,
              ["-H", "Accept: application/json", "-H", `Authorization: Bearer ${token}`],
              false,
              "proxy",
            );
            expect(metadata.stdout.trim()).toEndWith("200");
            return metadata.stdout;
          },
        );
        const detail = JSON.parse(metadata.slice(0, metadata.lastIndexOf("\n")));
        const url = new URL(detail.downloadUrl);
        await recordedAssetStep(
          "Download an exact range using the signed URL from your metadata",
          "$DOWNLOAD_URL",
          { range: "bytes=5242878-5242883" },
          async () => {
            const download = await objectStoreRequest(
              environment,
              "GET",
              url.pathname + url.search,
              ["-H", "Range: bytes=5242878-5242883"],
              false,
            );
            expect(download.stdout).toBe("AAAAAA\n206");
            return download.stdout;
          },
        );
        const denied = await objectStoreRequest(environment, "GET", url.pathname, [], false);
        expect(denied.stdout.trim()).toEndWith("403");
        await objectStoreRequest(environment, "DELETE", url.pathname);
        await objectStoreRequest(
          environment,
          "DELETE",
          `/assets/metadata/${record.name.slice(7)}.json`,
        );
      },
    ),
  budget,
);

test(
  "a failed API checksum leaves no multipart upload",
  async () => {
    await Bun.write(assetPath, assetBytes);
    const before = await objectStoreRequest(environment, "GET", "/assets?list-type=2");
    const uploaded = await objectStoreRequest(
      environment,
      "POST",
      "/v1/assets",
      [
        ...assetHeaders,
        "-H",
        `Authorization: Bearer ${token}`,
        "-H",
        `x-content-sha256: ${"0".repeat(64)}`,
        "--data-binary",
        `@${assetPath}`,
      ],
      false,
      "proxy",
    );
    expect(uploaded.stdout.trim()).toEndWith("400");
    const pending = await objectStoreRequest(environment, "GET", "/assets?uploads");
    expect(pending.stdout).not.toContain("<Upload>");
    const after = await objectStoreRequest(environment, "GET", "/assets?list-type=2");
    expect(after.stdout).toBe(before.stdout);
  },
  budget,
);

test(
  "the API refuses a body above 20 MB and removes its partial upload",
  async () => {
    const bytes = new Uint8Array(ASSET_MAX_BYTES + 1).fill(65);
    await Bun.write(oversizePath, bytes);
    const before = await objectStoreRequest(environment, "GET", "/assets?list-type=2");
    const result = await recordedAssetStep(
      "Refuse an upload above the configured 20 MB limit",
      "/v1/assets",
      {
        authorization: "Bearer <token>",
        accept: "application/json",
        "content-type": "application/octet-stream",
        "x-content-sha256": assetChecksum(bytes),
      },
      async () => {
        const result = await objectStoreRequest(
          environment,
          "POST",
          "/v1/assets",
          [
            ...assetHeaders,
            "-H",
            `Authorization: Bearer ${token}`,
            "-H",
            `x-content-sha256: ${assetChecksum(bytes)}`,
            "--data-binary",
            `@${oversizePath}`,
          ],
          false,
          "proxy",
        );
        expect(result.stdout.trim()).toEndWith("400");
        expect(result.stdout).toContain(String(ASSET_MAX_BYTES));
        return result.stdout;
      },
      "oversize.bin",
    );
    expect(result).toContain("INVALID_ARGUMENT");
    const after = await objectStoreRequest(environment, "GET", "/assets?list-type=2");
    expect(after.stdout).toBe(before.stdout);
    const pending = await objectStoreRequest(environment, "GET", "/assets?uploads");
    expect(pending.stdout).not.toContain("<Upload>");
  },
  budget,
);

test(
  "disconnecting a multipart upload removes partial bytes and pending parts",
  async () => {
    const before = await objectStoreRequest(environment, "GET", "/assets?list-type=2");
    const result = await objectStoreRequest(
      environment,
      "POST",
      "/v1/assets",
      [
        ...assetHeaders,
        "-H",
        `Authorization: Bearer ${token}`,
        "-H",
        `x-content-sha256: ${assetChecksum(assetBytes)}`,
        "--limit-rate",
        "4M",
        "--max-time",
        "2",
        "--data-binary",
        `@${assetPath}`,
      ],
      false,
      "proxy",
    );
    expect(result.exitCode).toBe(28);
    await waitUntil(
      async () =>
        !(await objectStoreRequest(environment, "GET", "/assets?uploads")).stdout.includes(
          "<Upload>",
        ),
      30_000,
    );
    const after = await objectStoreRequest(environment, "GET", "/assets?list-type=2");
    expect(after.stdout).toBe(before.stdout);
  },
  budget,
);

test(
  "the SDK streams an asset through the proxy from an isolated edge client",
  async () => {
    await Bun.write(assetPath, assetBytes);
    const result = await assetSdkProxy(
      environment,
      token,
      assetPath,
      assetChecksum(assetBytes),
      scoped?.other ?? "",
    );
    expect(result.exitCode).toBe(0);
    const asset = JSON.parse(result.stdout);
    expect(asset.sizeBytes).toBe(assetBytes.length);
    await objectStoreRequest(environment, "DELETE", `/assets/objects/${asset.name.slice(7)}`);
    await objectStoreRequest(environment, "DELETE", `/assets/metadata/${asset.name.slice(7)}.json`);
  },
  budget,
);

test.each([
  ["reader", "application/octet-stream", 403],
  ["owner", "application/x-unknown", 415],
] as const)(
  "the proxy refuses %s upload with %s",
  async (identity, mediaType, status) => {
    const authorization = identity === "reader" ? scoped?.reader : scoped?.owner;
    const result = await objectStoreRequest(
      environment,
      "POST",
      "/v1/assets",
      [
        "-H",
        "Accept: application/json",
        "-H",
        `Content-Type: ${mediaType}`,
        "-H",
        `Authorization: Bearer ${authorization}`,
        "-H",
        `x-content-sha256: ${assetChecksum(assetBytes)}`,
        "--data-binary",
        `@${assetPath}`,
      ],
      false,
      "proxy",
    );
    expect(result.stdout.trim()).toEndWith(String(status));
  },
  budget,
);
test(
  "multipart upload assembles streamed parts through the proxy",
  async () => {
    await Bun.write(partPath, new Uint8Array(5 * 1024 * 1024).fill(97));
    const initiated = await objectStoreRequest(
      environment,
      "POST",
      `${bucket}/multipart.bin?uploads`,
      ["--data-binary", ""],
    );
    const uploadId = /<UploadId>([^<]+)<\/UploadId>/.exec(initiated.stdout)?.[1];
    expect(uploadId).toBeDefined();
    const part = await objectStoreRequest(
      environment,
      "PUT",
      `${bucket}/multipart.bin?partNumber=1&uploadId=${uploadId}`,
      ["-D", "-", "--data-binary", `@${partPath}`],
    );
    const etag = /etag:\s*([^\r\n]+)/i.exec(part.stdout)?.[1];
    expect(etag).toBeDefined();
    const last = await objectStoreRequest(
      environment,
      "PUT",
      `${bucket}/multipart.bin?partNumber=2&uploadId=${uploadId}`,
      ["-D", "-", "--data-binary", "xyz"],
    );
    const lastTag = /etag:\s*([^\r\n]+)/i.exec(last.stdout)?.[1];
    expect(lastTag).toBeDefined();
    const complete = `<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>${etag}</ETag></Part><Part><PartNumber>2</PartNumber><ETag>${lastTag}</ETag></Part></CompleteMultipartUpload>`;
    const finished = await objectStoreRequest(
      environment,
      "POST",
      `${bucket}/multipart.bin?uploadId=${uploadId}`,
      ["--data-binary", complete],
    );
    expect(finished.stdout.trim()).toEndWith("200");
    const range = await objectStoreRequest(environment, "GET", `${bucket}/multipart.bin`, [
      "-H",
      "Range: bytes=5242870-5242882",
    ]);
    expect(range.stdout).toBe(`${"a".repeat(10)}xyz\n206`);
  },
  budget,
);

test.each(["console", "docs"])(
  "%s bucket website is public for reads only",
  async (site) => {
    const websiteContent = await Bun.file(
      join(REPO_ROOT, ".stack/static/test", site, "index.html"),
    ).text();
    expect(websiteContent).toContain("<html");
    const host = `${site}.sites.${OBJECT_STORE_HOSTS[environment]}`;
    const page = await objectStoreRequest(environment, "GET", "/", [], false, host);
    expect(page.stdout).toBe(`${websiteContent}\n200`);
    const denied = await objectStoreRequest(
      environment,
      "PUT",
      `/${site}/index.html`,
      ["--data-binary", "overwrite"],
      false,
    );
    expect(denied.stdout.trim()).toEndWith("403");
  },
  budget,
);

test(
  "unknown console routes return the index with 200 while docs preserve 404",
  async () => {
    const consolePage = await objectStoreRequest(
      environment,
      "GET",
      "/unknown/route",
      [],
      false,
      `console.sites.${OBJECT_STORE_HOSTS[environment]}`,
    );
    const missingDoc = await objectStoreRequest(
      environment,
      "GET",
      "/unknown/route",
      [],
      false,
      `docs.sites.${OBJECT_STORE_HOSTS[environment]}`,
    );
    const websiteContent = await Bun.file(
      join(REPO_ROOT, ".stack/static/test/console/index.html"),
    ).text();
    expect(consolePage.stdout).toBe(`${websiteContent}\n200`);
    expect(missingDoc.stdout.trim()).toEndWith("404");
  },
  budget,
);

test(
  "the static console host forwards API requests through the required proxy marker",
  async () => {
    const result = await objectStoreRequest(
      environment,
      "GET",
      "/v1/config",
      ["-H", "Accept: application/json"],
      false,
      `console.sites.${OBJECT_STORE_HOSTS[environment]}`,
    );
    expect(result.stdout.trim()).toEndWith("200");
    expect(result.stdout).toContain("bannerText");
  },
  budget,
);
