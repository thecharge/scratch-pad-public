import { ASSET_BUCKET, MediaType, PORT_SEPARATOR } from "@platform/constants";
import type { StackEnvironment } from "@platform/types";
import { HTTP_SCHEME, HTTPS_SCHEME } from "./environments.ts";

export const ASSET_MAX_BYTES = 20_000_000;
export const ASSET_ALLOWED_MEDIA_TYPES: readonly string[] = [
  MediaType.OctetStream,
  MediaType.Pdf,
  MediaType.Png,
  MediaType.Jpeg,
  MediaType.PlainText,
];

export async function assetStorageFor(environment: StackEnvironment) {
  const store = environment.objectStore;
  if (store === undefined) return undefined;
  return {
    endpoint: `${HTTP_SCHEME}${store.address}${PORT_SEPARATOR}${store.port}`,
    publicEndpoint: `${HTTPS_SCHEME}${store.host}${PORT_SEPARATOR}${environment.proxy.port}`,
    bucket: ASSET_BUCKET,
    accessKeyId: store.accessKey,
    secretAccessKey: store.secretKey,
  };
}
