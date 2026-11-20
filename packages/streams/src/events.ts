import {
  MessageId,
  SSE_COMMENT_PREFIX,
  SSE_FIELD_SEPARATOR,
  SSE_FRAME_END,
  SSE_KEEPALIVE_FRAME,
  SSE_KEEPALIVE_MS,
  SSE_OPEN_FRAME,
  SseField,
  STREAM_IDLE,
  STREAM_LINE_END,
  StreamWhat,
  Text,
} from "@platform/constants";
import { type StreamEvent, StreamEventSchema } from "@platform/types";
import { byteStream, textChunks } from "./chunks.ts";
import { StreamError } from "./errors.ts";

async function frameOf(event: StreamEvent): Promise<string> {
  const lines: string[] = [];
  if (event.event !== undefined) {
    lines.push(SseField.Event + SSE_FIELD_SEPARATOR + event.event);
  }
  if (event.id !== undefined) {
    lines.push(SseField.Id + SSE_FIELD_SEPARATOR + event.id);
  }
  lines.push(SseField.Data + SSE_FIELD_SEPARATOR + JSON.stringify(event.data));
  return lines.join(STREAM_LINE_END) + SSE_FRAME_END;
}

async function idleAfter(ms: number): Promise<typeof STREAM_IDLE> {
  await Bun.sleep(ms);
  return STREAM_IDLE;
}

async function* frameLoop(
  iterator: AsyncIterator<StreamEvent>,
  keepAliveMs: number,
): AsyncGenerator<string> {
  let pending = iterator.next();
  while (true) {
    const winner = await Promise.race([pending, idleAfter(keepAliveMs)]);
    if (winner === STREAM_IDLE) {
      yield SSE_KEEPALIVE_FRAME;
      continue;
    }
    if (winner.done) {
      return;
    }
    yield await frameOf(StreamEventSchema.parse(winner.value));
    pending = iterator.next();
  }
}

async function* frames(
  events: AsyncIterable<StreamEvent>,
  keepAliveMs: number,
): AsyncGenerator<string> {
  const iterator = events[Symbol.asyncIterator]();
  yield SSE_OPEN_FRAME;
  try {
    yield* frameLoop(iterator, keepAliveMs);
  } finally {
    await iterator.return?.();
  }
}

export async function writeEvents(
  events: AsyncIterable<StreamEvent>,
  keepAliveMs: number = SSE_KEEPALIVE_MS,
): Promise<ReadableStream<Uint8Array>> {
  return byteStream(frames(events, keepAliveMs));
}

async function eventOf(frame: string, number: number): Promise<StreamEvent | undefined> {
  const fields = new Map<string, string>();
  for (const line of frame.split(STREAM_LINE_END)) {
    if (line === Text.Empty || line.startsWith(SSE_COMMENT_PREFIX)) {
      continue;
    }
    const at = line.indexOf(SSE_COMMENT_PREFIX);
    const name = at < 0 ? line : line.slice(0, at);
    const value = at < 0 ? Text.Empty : line.slice(at + 1).replace(/^ /, Text.Empty);
    fields.set(name, value);
  }
  const data = fields.get(SseField.Data);
  if (data === undefined) {
    return undefined;
  }
  try {
    return StreamEventSchema.parse({
      event: fields.get(SseField.Event),
      id: fields.get(SseField.Id),
      data: JSON.parse(data),
    });
  } catch (error) {
    throw new StreamError(MessageId.StreamFrameInvalid, {
      frame: number,
      detail: (error as Error).message,
    });
  }
}

async function* eventsOf(parts: string[], first: number): AsyncGenerator<StreamEvent> {
  for (const [index, part] of parts.entries()) {
    const event = await eventOf(part, first + index);
    if (event !== undefined) {
      yield event;
    }
  }
}

export async function* readEvents(stream: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  let pending: string = Text.Empty;
  let number = 0;
  for await (const chunk of textChunks(stream)) {
    pending += chunk;
    const parts = pending.split(SSE_FRAME_END);
    pending = parts.pop() ?? Text.Empty;
    yield* eventsOf(parts, number + 1);
    number += parts.length;
  }
  if (pending.trim() !== Text.Empty) {
    throw new StreamError(MessageId.StreamIncomplete, { what: StreamWhat.Event });
  }
}
