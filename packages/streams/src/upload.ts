import { createHash, type Hash, timingSafeEqual } from "node:crypto";
import {
  ASSET_ABORT_EVENT,
  ASSET_CHUNK_BYTES,
  ASSET_HASH_ALGORITHM,
  ASSET_HASH_ENCODING,
  MessageId,
} from "@platform/constants";
import { message } from "@platform/messages";
import {
  type AssetUploadHeaders,
  AssetUploadHeadersSchema,
  type AssetUploadPolicy,
  AssetUploadPolicySchema,
  type AssetUploadResult,
  type AssetUploadTarget,
} from "@platform/types";
import { StreamError } from "./errors.ts";

async function discard(target: AssetUploadTarget, error: unknown): Promise<never> {
  const failures: unknown[] = [error];
  try {
    await target.abort(error);
  } catch (failure) {
    failures.push(failure);
  }
  try {
    await target.remove();
  } catch (failure) {
    failures.push(failure);
  }
  if (failures.length > 1)
    throw new AggregateError(failures, message(MessageId.AssetCleanupFailed));
  throw error;
}

async function writeChunk(target: AssetUploadTarget, chunk: Uint8Array): Promise<void> {
  for (let offset = 0; offset < chunk.byteLength; offset += ASSET_CHUNK_BYTES)
    await target.write(chunk.subarray(offset, offset + ASSET_CHUNK_BYTES));
}

async function send(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  target: AssetUploadTarget,
  maxBytes: number,
  hash: Hash,
  signal?: AbortSignal,
): Promise<number> {
  signal?.throwIfAborted();
  let sizeBytes = 0;
  let next = await reader.read();
  while (!next.done) {
    signal?.throwIfAborted();
    sizeBytes += next.value.byteLength;
    if (sizeBytes > maxBytes) throw new StreamError(MessageId.AssetSizeLimit, { maxBytes });
    hash.update(next.value);
    await writeChunk(target, next.value);
    next = await reader.read();
  }
  signal?.throwIfAborted();
  return sizeBytes;
}

export async function uploadStream(
  body: ReadableStream<Uint8Array>,
  target: AssetUploadTarget,
  headers: AssetUploadHeaders,
  policy: AssetUploadPolicy,
  signal?: AbortSignal,
): Promise<AssetUploadResult> {
  const checked = AssetUploadHeadersSchema.parse(headers);
  const limits = AssetUploadPolicySchema.parse(policy);
  if (!limits.mediaTypes.includes(checked.mediaType))
    throw new StreamError(MessageId.AssetMediaType, { mediaType: checked.mediaType });
  const hash = createHash(ASSET_HASH_ALGORITHM);
  const reader = body.getReader();
  const cancel = async () => {
    await reader.cancel(signal?.reason).catch(async () => undefined);
  };
  signal?.addEventListener(ASSET_ABORT_EVENT, cancel, { once: true });
  try {
    const sizeBytes = await send(reader, target, limits.maxBytes, hash, signal);
    const sha256 = hash.digest(ASSET_HASH_ENCODING);
    if (!timingSafeEqual(Buffer.from(sha256), Buffer.from(checked.checksum)))
      throw new StreamError(MessageId.AssetChecksumMismatch);
    await target.complete();
    return { sizeBytes, sha256, mediaType: checked.mediaType };
  } catch (error) {
    await reader.cancel(error).catch(async () => undefined);
    return discard(target, error);
  } finally {
    signal?.removeEventListener(ASSET_ABORT_EVENT, cancel);
    reader.releaseLock();
  }
}
