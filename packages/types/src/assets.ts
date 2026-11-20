import { ASSET_CHECKSUM_PATTERN } from "@platform/constants";
import { z } from "zod";

export const AssetUploadPolicySchema = z.object({
  maxBytes: z.number().int().positive(),
  mediaTypes: z.array(z.string().min(1)).min(1),
});
export type AssetUploadPolicy = z.infer<typeof AssetUploadPolicySchema>;

export const AssetUploadHeadersSchema = z.object({
  mediaType: z.string().min(1),
  checksum: z.string().regex(ASSET_CHECKSUM_PATTERN),
});
export type AssetUploadHeaders = z.infer<typeof AssetUploadHeadersSchema>;

export const AssetUploadResultSchema = z.object({
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(ASSET_CHECKSUM_PATTERN),
  mediaType: z.string().min(1),
});
export type AssetUploadResult = z.infer<typeof AssetUploadResultSchema>;

export interface AssetUploadTarget {
  write(chunk: Uint8Array): Promise<void>;
  complete(): Promise<void>;
  abort(error: unknown): Promise<void>;
  remove(): Promise<void>;
}

export const AssetStorageOptionsSchema = z.object({
  endpoint: z.url(),
  publicEndpoint: z.url(),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  bucket: z.string().min(1),
});
export type AssetStorageOptions = z.infer<typeof AssetStorageOptionsSchema>;

export const AssetSchema = AssetUploadResultSchema.extend({
  name: z.string().min(1),
  uri: z.string().min(1),
  createTime: z.iso.datetime(),
});
export type Asset = z.infer<typeof AssetSchema>;
export const AssetRecordSchema = AssetSchema.extend({ owner: z.string().min(1) });
export type AssetRecord = z.infer<typeof AssetRecordSchema>;
export const AssetDownloadSchema = AssetSchema.extend({ downloadUrl: z.url() });
export type AssetDownload = z.infer<typeof AssetDownloadSchema>;

export const AssetUploadInputSchema = AssetUploadHeadersSchema.extend({
  body: z.instanceof(ReadableStream<Uint8Array>),
});
export type AssetUploadInput = z.infer<typeof AssetUploadInputSchema>;
export const AssetNameInputSchema = z.object({ name: z.string().min(1) });
export const AssetListInputSchema = z.object({
  pageSize: z.number().int().optional(),
  pageToken: z.string().optional(),
});
export const AssetListSchema = z.object({
  assets: z.array(AssetSchema),
  nextPageToken: z.string(),
});

export const RawMediaSchema = z.object({
  bodyField: z.string().min(1),
  mediaTypeField: z.string().min(1),
  checksumField: z.string().min(1),
  checksumHeader: z.string().min(1),
  mediaTypes: z.array(z.string().min(1)).min(1),
});
export type RawMedia = z.infer<typeof RawMediaSchema>;

export interface AssetSink {
  write(chunk: Uint8Array): number | Promise<number>;
  flush(): number | Promise<number>;
  end(error?: Error): number | Promise<number>;
}

export interface AssetObject {
  writer(options: { partSize: number; queueSize: number; type: string }): AssetSink;
  text(): Promise<string>;
  write(value: string): Promise<number>;
  exists(): Promise<boolean>;
  delete(): Promise<void>;
}

export interface AssetObjectClient {
  file(path: string): AssetObject;
  list(options: { prefix: string; continuationToken?: string }): Promise<{
    contents?: { key: string }[];
    nextContinuationToken?: string;
  }>;
  presign(path: string, options: { expiresIn: number }): string;
}

export interface AssetClients {
  internal: AssetObjectClient;
  external: AssetObjectClient;
}

export interface AssetStore {
  upload(
    body: ReadableStream<Uint8Array>,
    headers: AssetUploadHeaders,
    owner: string,
    signal?: AbortSignal,
  ): Promise<Asset>;
  get(name: string, owner: string): Promise<AssetDownload | undefined>;
  list(owner: string): Promise<Asset[]>;
}

export const ReadableStreamAssetSchema = z.instanceof(ReadableStream<Uint8Array>);
