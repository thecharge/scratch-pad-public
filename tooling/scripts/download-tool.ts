import { DigestEncoding, HashAlgorithm, MessageId } from "@platform/constants";
import { message } from "@platform/messages";

export async function downloadTool(
  url: string,
  file: string,
  expected: string,
  fetcher: typeof fetch,
): Promise<Uint8Array> {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(message(MessageId.DownloadFailed, { status: response.status, url }));
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = new Bun.CryptoHasher(HashAlgorithm.Sha256)
    .update(bytes)
    .digest(DigestEncoding.Hex);
  if (digest !== expected) {
    throw new Error(message(MessageId.ChecksumMismatch, { file, digest }));
  }
  return bytes;
}
