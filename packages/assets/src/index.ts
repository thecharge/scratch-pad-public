import { ASSET_ALLOWED_MEDIA_TYPES, ASSET_MAX_BYTES } from "@platform/config/assets";
import {
  ASSET_DOWNLOAD_TTL_SECONDS,
  ASSET_ID_PREFIX,
  ASSET_METADATA_PREFIX,
  ASSET_METADATA_SUFFIX,
  ASSET_MULTIPART_BYTES,
  ASSET_OBJECT_PREFIX,
  ASSET_RESOURCE_PREFIX,
  ASSET_URI_SCHEME,
} from "@platform/constants";
import { uploadStream } from "@platform/streams/upload";
import {
  type Asset,
  type AssetClients,
  type AssetObject,
  type AssetObjectClient,
  AssetRecordSchema,
  type AssetSink,
  type AssetStorageOptions,
  AssetStorageOptionsSchema,
  type AssetStore,
  type AssetUploadTarget,
} from "@platform/types";
import { all } from "@platform/util";
import { S3Client } from "bun";

async function targetFor(
  object: AssetObject,
  metadata: AssetObject,
  mediaType: string,
): Promise<AssetUploadTarget> {
  let sink: AssetSink | undefined;
  const writer = async () => {
    sink ??= object.writer({ partSize: ASSET_MULTIPART_BYTES, queueSize: 1, type: mediaType });
    return sink;
  };
  return {
    async write(chunk) {
      const stream = await writer();
      await stream.write(chunk);
      await stream.flush();
    },
    async complete() {
      await (await writer()).end();
    },
    async abort(error) {
      if (sink === undefined) return;
      await sink.end(error instanceof Error ? error : new Error(String(error)));
    },
    async remove() {
      await all([async () => object.delete(), async () => metadata.delete()]);
    },
  };
}

async function metadataKeys(client: AssetObjectClient): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.list({
      prefix: ASSET_METADATA_PREFIX,
      ...(continuationToken === undefined ? {} : { continuationToken }),
    });
    keys.push(...(page.contents ?? []).map((item) => item.key));
    continuationToken = page.nextContinuationToken;
  } while (continuationToken !== undefined);
  return keys;
}

async function publicAsset(record: Asset): Promise<Asset> {
  const { name, uri, sizeBytes, sha256, mediaType, createTime } = record;
  return { name, uri, sizeBytes, sha256, mediaType, createTime };
}

async function clientsFor(settings: AssetStorageOptions): Promise<AssetClients> {
  const shared = {
    bucket: settings.bucket,
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
  };
  return {
    internal: new S3Client({ ...shared, endpoint: settings.endpoint }),
    external: new S3Client({ ...shared, endpoint: settings.publicEndpoint }),
  };
}

export async function createAssetStore(
  options: AssetStorageOptions,
  injected?: AssetClients,
): Promise<AssetStore> {
  const settings = AssetStorageOptionsSchema.parse(options);
  const clients = injected ?? (await clientsFor(settings));
  return {
    async upload(body, headers, owner, signal) {
      AssetRecordSchema.shape.owner.parse(owner);
      const id = ASSET_ID_PREFIX + crypto.randomUUID();
      const object = clients.internal.file(ASSET_OBJECT_PREFIX + id);
      const metadata = clients.internal.file(ASSET_METADATA_PREFIX + id + ASSET_METADATA_SUFFIX);
      const target = await targetFor(object, metadata, headers.mediaType);
      const result = await uploadStream(
        body,
        target,
        headers,
        { maxBytes: ASSET_MAX_BYTES, mediaTypes: [...ASSET_ALLOWED_MEDIA_TYPES] },
        signal,
      );
      const record = AssetRecordSchema.parse({
        ...result,
        owner,
        name: ASSET_RESOURCE_PREFIX + id,
        uri: ASSET_URI_SCHEME + id,
        createTime: new Date().toISOString(),
      });
      try {
        await metadata.write(JSON.stringify(record));
      } catch (error) {
        await target.remove();
        throw error;
      }
      return publicAsset(record);
    },
    async get(name, owner) {
      if (!name.startsWith(ASSET_RESOURCE_PREFIX)) return undefined;
      const id = name.slice(ASSET_RESOURCE_PREFIX.length);
      const metadata = clients.internal.file(ASSET_METADATA_PREFIX + id + ASSET_METADATA_SUFFIX);
      if (!(await metadata.exists())) return undefined;
      const record = AssetRecordSchema.parse(JSON.parse(await metadata.text()));
      if (record.owner !== owner || record.name !== name) return undefined;
      const downloadUrl = clients.external.presign(ASSET_OBJECT_PREFIX + id, {
        expiresIn: ASSET_DOWNLOAD_TTL_SECONDS,
      });
      return { ...(await publicAsset(record)), downloadUrl };
    },
    async list(owner) {
      const keys = await metadataKeys(clients.internal);
      const records = await all(
        keys.map(
          (key) => async () =>
            AssetRecordSchema.parse(JSON.parse(await clients.internal.file(key).text())),
        ),
      );
      const visible = records.filter((record) => record.owner === owner);
      return all(visible.map((record) => async () => publicAsset(record)));
    },
  };
}
