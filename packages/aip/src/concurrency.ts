import {
  CanonicalCode,
  DEFAULT_STORE_MAX_ENTRIES,
  DigestEncoding,
  ErrorReason,
  ETAG_HASH_CHARS,
  ETAG_QUOTE,
  HashAlgorithm,
  MessageId,
  Text,
  WEAK_ETAG_PREFIX,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { BoundedStore } from "@platform/store";
import type { RequestIdStoreOptions, StoredRequest } from "@platform/types";

export async function computeEtag(resource: unknown): Promise<string> {
  const hash = new Bun.CryptoHasher(HashAlgorithm.Sha256)
    .update(JSON.stringify(resource))
    .digest(DigestEncoding.Hex);
  return [ETAG_QUOTE, hash.slice(0, ETAG_HASH_CHARS), ETAG_QUOTE].join(Text.Empty);
}

async function opaque(etag: string): Promise<string> {
  return etag.startsWith(WEAK_ETAG_PREFIX) ? etag.slice(WEAK_ETAG_PREFIX.length) : etag;
}

export async function checkEtag(provided: string | undefined, current: string): Promise<void> {
  if (provided === undefined || provided.length === 0) {
    return;
  }
  if ((await opaque(provided)) !== (await opaque(current))) {
    throw new ApiError(CanonicalCode.Aborted, ErrorReason.EtagMismatch, MessageId.EtagMismatch);
  }
}

export class RequestIdStore {
  private readonly entries: BoundedStore<StoredRequest>;

  constructor(options: RequestIdStoreOptions) {
    this.entries = new BoundedStore({
      maxEntries: DEFAULT_STORE_MAX_ENTRIES,
      ttlMs: options.ttlMs,
      ...(options.now === undefined ? {} : { now: options.now }),
    });
  }

  async run<T>(
    scope: string,
    requestId: string | undefined,
    execute: () => Promise<T>,
  ): Promise<T> {
    if (requestId === undefined) {
      return execute();
    }
    const key = [scope, requestId].join(Text.Empty);
    const stored = await this.entries.update(key, (current) => current ?? { result: execute() });
    return (stored.result as Promise<T>).catch(async (error: unknown) => {
      await this.entries.delete(key);
      throw error;
    });
  }
}

export async function executeOrPreview<T>(
  validateOnly: boolean | undefined,
  preview: () => T | Promise<T>,
  execute: () => Promise<T>,
): Promise<T> {
  return validateOnly === true ? preview() : execute();
}
