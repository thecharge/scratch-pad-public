import { OpenApiLiteral, SDK_STREAM_PARSE } from "@platform/constants";
import { z } from "zod";

export interface SdkClientOptions {
  origin: string;
  token?: string | (() => string | undefined);
}

export interface SdkResult<T> {
  data?: T | undefined;
  error?: unknown;
  response?: Response | undefined;
}

export const AssetSdkRequestSchema = z.object({
  url: z.string(),
  baseUrl: z.string().optional(),
  body: z.instanceof(ReadableStream<Uint8Array>).optional(),
  bodySerializer: z.null().optional(),
  signal: z.instanceof(AbortSignal).optional(),
  parseAs: z.literal(SDK_STREAM_PARSE).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  security: z
    .array(
      z.object({
        scheme: z.literal(OpenApiLiteral.BearerKeyword),
        type: z.literal(OpenApiLiteral.HttpType),
      }),
    )
    .optional(),
});
export type AssetSdkRequestFields = z.infer<typeof AssetSdkRequestSchema>;
export type AssetSdkRequest = {
  [Key in keyof AssetSdkRequestFields]: Exclude<AssetSdkRequestFields[Key], undefined>;
};

export interface AssetSdkClient {
  get(options: AssetSdkRequest): Promise<SdkResult<unknown>>;
  post(options: AssetSdkRequest): Promise<SdkResult<unknown>>;
}

export interface SdkPage<T> {
  items: T[];
  nextPageToken: string;
}

export const WaitOptionsSchema = z.object({ intervalMs: z.number(), timeoutMs: z.number() });
export type WaitOptions = z.infer<typeof WaitOptionsSchema>;
