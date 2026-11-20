export function bytesOf(...parts: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(part);
      }
      controller.close();
    },
  });
}

export function streamOf(...parts: string[]): ReadableStream<Uint8Array> {
  return bytesOf(...parts.map((part) => new TextEncoder().encode(part)));
}

export function cutStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new Error("connection reset"));
    },
  });
}

export function lockedStream(): ReadableStream<Uint8Array> {
  const stream = bytesOf();
  stream.getReader();
  return stream;
}

export async function* items<T>(...values: T[]): AsyncGenerator<T> {
  for (const value of values) {
    yield value;
  }
}

export async function* failing(): AsyncGenerator<number> {
  yield 1;
  throw new Error("boom");
}

export async function* watched(onStop: () => void): AsyncGenerator<string> {
  try {
    yield "a";
    yield "b";
  } finally {
    onStop();
  }
}

export function textOf(chunks: Uint8Array[]): string {
  return chunks.map((chunk) => new TextDecoder().decode(chunk)).join("");
}

export function chunksOf(chunks: Uint8Array[]): string[] {
  return chunks.map((chunk) => new TextDecoder().decode(chunk));
}

export async function* spaced<T>(delayMs: number, ...values: T[]): AsyncGenerator<T> {
  for (const value of values) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    yield value;
  }
}

export async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  needle: string,
  heard: string = "",
): Promise<string> {
  if (heard.includes(needle)) {
    return heard;
  }
  const next = await reader.read();
  return next.done
    ? heard
    : readUntil(reader, needle, heard + new TextDecoder().decode(next.value));
}

async function* spacedBytes(parts: readonly string[], gapMs: number): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder();
  for (const part of parts) {
    await Bun.sleep(gapMs);
    yield encoder.encode(part);
  }
}

export function chunkedBody(parts: readonly string[], gapMs = 10): ReadableStream<Uint8Array> {
  const iterator = spacedBytes(parts, gapMs);
  return new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      const next = await iterator.next();
      if (next.done) {
        controller.close();
        return;
      }
      controller.enqueue(next.value);
    },
  });
}
