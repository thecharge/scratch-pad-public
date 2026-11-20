import { HttpHeader } from "@platform/constants";
import type { StreamTracker } from "@platform/types";

export async function measured(
  response: Response,
  streams: StreamTracker | undefined,
  record: (bytes: number) => Promise<void>,
): Promise<Response> {
  const length = response.headers.get(HttpHeader.ContentLength);
  if (response.body === null || length !== null) {
    await record(Number(length ?? 0));
    return response;
  }
  await streams?.opened();
  const reader = response.body.getReader();
  let bytes = 0;
  let finished = false;
  const finish = async () => {
    if (!finished) {
      finished = true;
      await streams?.closed();
      await record(bytes);
    }
  };
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await reader.read();
      if (next.done) {
        controller.close();
        await finish();
        return;
      }
      bytes += next.value.byteLength;
      controller.enqueue(next.value);
    },
    async cancel(reason) {
      await reader.cancel(reason);
      await finish();
    },
  });
  return new Response(body, response);
}
