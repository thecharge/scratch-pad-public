export const ASSET_URI_SCHEME = "asset://";
export const ASSET_RESOURCE_PREFIX = "assets/";
export const ASSET_ABORT_EVENT = "abort";
export const ASSET_HASH_ALGORITHM = "sha256";
export const ASSET_HASH_ENCODING = "hex";
export const ASSET_CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;
export const ASSET_CHUNK_BYTES = 65_536;
export const ASSET_MULTIPART_BYTES = 5_242_880;
export const ASSET_CHECKSUM_HEADER = "x-content-sha256";
export const ASSET_BUCKET = "assets";
export const ASSET_OBJECT_PREFIX = "objects/";
export const ASSET_METADATA_PREFIX = "metadata/";
export const ASSET_METADATA_SUFFIX = ".json";
export const ASSET_DOWNLOAD_TTL_SECONDS = 300;

export enum AssetCapabilityId {
  Upload = "assets.create",
  Get = "assets.get",
  List = "assets.list",
}

export enum AssetPattern {
  Collection = "assets",
  Item = "assets/{asset}",
}

export const ASSET_MEDIA_BODY_FIELD = "body";
export const ASSET_MEDIA_TYPE_FIELD = "mediaType";
export const ASSET_MEDIA_CHECKSUM_FIELD = "checksum";

export const ASSET_BUCKET_PATH = "/assets";
export const ASSET_BINARY_FORMAT = "binary";
export const ASSET_ID_PREFIX = "a-";
export const ASSET_RECORD_PATH = ".stack/e2e/assets.json";
export const ASSET_DOC_PATH = "api-calls/private-assets.mdx";
export const ASSET_UPLOAD_PATH = "/v1/assets";
export const ASSET_URI_VARIABLE = "{asset}";
