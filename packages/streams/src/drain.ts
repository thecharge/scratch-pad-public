import { DRAIN_LIMIT_BYTES } from "@platform/constants";

export async function drain(
  body: ReadableStream<Uint8Array> | null,
  limit: number = DRAIN_LIMIT_BYTES,
): Promise<number> {
  if (body === null || body.locked) {
    return 0;
  }
  const reader = body.getReader();
  let seen = 0;
  const next = async () =>
    reader.read().catch(async () => ({ done: true as const, value: undefined }));
  for (let chunk = await next(); !chunk.done; chunk = await next()) {
    seen += chunk.value.length;
    if (seen > limit) {
      await reader.cancel();
      return seen;
    }
  }
  return seen;
}
