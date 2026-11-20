import { TEST_ASSET_ENDPOINT, TEST_ASSET_PUBLIC_ENDPOINT } from "@platform/config/urls";
import type { AssetClients, AssetObject, AssetObjectClient, AssetSink } from "@platform/types";

export const ASSET_STORE_SETTINGS = {
  endpoint: TEST_ASSET_ENDPOINT,
  publicEndpoint: TEST_ASSET_PUBLIC_ENDPOINT,
  bucket: "assets",
  accessKeyId: "fixture-access",
  secretAccessKey: "fixture-secret-for-object-store",
};

export function assetClients(failure = "") {
  const objects = new Map<string, Uint8Array>();
  const calls: string[] = [];
  const file = (path: string): AssetObject => {
    const chunks: Uint8Array[] = [];
    const sink: AssetSink = {
      async write(chunk) {
        chunks.push(chunk.slice());
        return chunk.length;
      },
      async flush() {
        return 0;
      },
      async end(error) {
        calls.push(error === undefined ? "complete" : "abort");
        if (error !== undefined) return 0;
        if (failure === "complete") throw new Error("complete failed");
        objects.set(path, Buffer.concat(chunks));
        return 0;
      },
    };
    return {
      writer(options) {
        calls.push(`writer ${options.partSize} ${options.queueSize} ${options.type}`);
        return sink;
      },
      async text() {
        return new TextDecoder().decode(objects.get(path));
      },
      async write(value) {
        if (failure === "metadata") throw new Error("metadata failed");
        objects.set(path, new TextEncoder().encode(value));
        return value.length;
      },
      async exists() {
        return objects.has(path);
      },
      async delete() {
        calls.push(`delete ${path}`);
        objects.delete(path);
      },
    };
  };
  const internal: AssetObjectClient = {
    file,
    async list(options) {
      const keys = [...objects.keys()].filter((key) => key.startsWith(options.prefix));
      const offset = Number(options.continuationToken ?? 0);
      const contents = keys.slice(offset, offset + 1).map((key) => ({ key }));
      const nextContinuationToken = offset + 1 < keys.length ? String(offset + 1) : undefined;
      return {
        contents,
        ...(nextContinuationToken === undefined ? {} : { nextContinuationToken }),
      };
    },
    presign(path, options) {
      return `${ASSET_STORE_SETTINGS.publicEndpoint}/assets/${path}?expires=${options.expiresIn}`;
    },
  };
  const clients: AssetClients = { internal, external: internal };
  return { clients, objects, calls };
}
