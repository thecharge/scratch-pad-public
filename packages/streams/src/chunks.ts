import { MessageId, STREAM_TEXT_ENCODING } from "@platform/constants";
import { StreamError } from "./errors.ts";

async function readNext(reader: ReadableStreamDefaultReader<Uint8Array>) {
  return reader.read().catch((error: unknown) => {
    throw new StreamError(MessageId.StreamAborted, { detail: String(error) });
  });
}

export async function* textChunks(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder(STREAM_TEXT_ENCODING);
  try {
    for (let next = await readNext(reader); !next.done; next = await readNext(reader)) {
      yield decoder.decode(next.value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export async function byteStream(
  chunks: AsyncIterable<string>,
): Promise<ReadableStream<Uint8Array>> {
  const iterator = chunks[Symbol.asyncIterator]();
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await iterator.next();
      if (next.done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(next.value));
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}
