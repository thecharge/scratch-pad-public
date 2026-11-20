import { HttpHeader, MediaType } from "@platform/constants";
import type { SdkClientOptions } from "@platform/types";
import { createClient, createConfig } from "../generated/client/index.ts";

export async function createSdkClient(options: SdkClientOptions) {
  const token = options.token;
  return createClient(
    createConfig({
      baseUrl: options.origin,
      headers: { [HttpHeader.Accept]: MediaType.Json, [HttpHeader.ContentType]: MediaType.Json },
      auth: async () => (token instanceof Function ? token() : token),
    }),
  );
}
