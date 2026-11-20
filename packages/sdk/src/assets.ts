import {
  ASSET_CHECKSUM_HEADER,
  ASSET_UPLOAD_PATH,
  HttpHeader,
  MediaType,
  OpenApiLiteral,
  SDK_STREAM_PARSE,
  Separator,
} from "@platform/constants";
import {
  AssetDownloadSchema,
  AssetSchema,
  type AssetSdkClient,
  type AssetUploadHeaders,
  AssetUploadHeadersSchema,
  ReadableStreamAssetSchema,
} from "@platform/types";
import { unwrap } from "./unwrap.ts";

export async function uploadAsset(
  client: AssetSdkClient,
  body: ReadableStream<Uint8Array>,
  headers: AssetUploadHeaders,
  signal?: AbortSignal,
) {
  const checked = AssetUploadHeadersSchema.parse(headers);
  return AssetSchema.parse(
    await unwrap(
      client.post({
        url: ASSET_UPLOAD_PATH,
        body,
        bodySerializer: null,
        ...(signal === undefined ? {} : { signal }),
        security: [{ scheme: OpenApiLiteral.BearerKeyword, type: OpenApiLiteral.HttpType }],
        headers: {
          [HttpHeader.Accept]: MediaType.Json,
          [HttpHeader.ContentType]: checked.mediaType,
          [ASSET_CHECKSUM_HEADER]: checked.checksum,
        },
      }),
    ),
  );
}

export async function downloadAsset(
  client: AssetSdkClient,
  asset: string,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const metadata = AssetDownloadSchema.parse(
    await unwrap(
      client.get({
        url: ASSET_UPLOAD_PATH + Separator.Resource + encodeURIComponent(asset),
        security: [{ scheme: OpenApiLiteral.BearerKeyword, type: OpenApiLiteral.HttpType }],
        ...(signal === undefined ? {} : { signal }),
      }),
    ),
  );
  const url = new URL(metadata.downloadUrl);
  return ReadableStreamAssetSchema.parse(
    await unwrap(
      client.get({
        baseUrl: url.origin,
        url: url.pathname + url.search,
        ...(signal === undefined ? {} : { signal }),
        parseAs: SDK_STREAM_PARSE,
        headers: { [HttpHeader.Accept]: metadata.mediaType },
      }),
    ),
  );
}
