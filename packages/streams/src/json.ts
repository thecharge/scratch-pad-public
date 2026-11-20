import { JsonToken, MessageId, StreamWhat, Text } from "@platform/constants";
import type { JsonDocument } from "@platform/types";
import { byteStream, textChunks } from "./chunks.ts";
import { StreamError } from "./errors.ts";

async function isIterable(value: unknown): Promise<boolean> {
  return Symbol.asyncIterator in Object(value);
}

async function* arrayChunks(items: AsyncIterable<unknown>): AsyncGenerator<string> {
  yield JsonToken.ArrayOpen;
  let separator: string = Text.Empty;
  for await (const item of items) {
    yield separator + JSON.stringify(item);
    separator = JsonToken.Comma;
  }
  yield JsonToken.ArrayClose;
}

async function* documentChunks(document: JsonDocument): AsyncGenerator<string> {
  yield JsonToken.ObjectOpen;
  let separator: string = Text.Empty;
  for (const [key, value] of Object.entries(document)) {
    if (await isIterable(value)) {
      yield separator + JSON.stringify(key) + JsonToken.Colon;
      yield* arrayChunks(value as AsyncIterable<unknown>);
      separator = JsonToken.Comma;
      continue;
    }
    const text = JSON.stringify(await value);
    if (text !== undefined) {
      yield separator + JSON.stringify(key) + JsonToken.Colon + text;
      separator = JsonToken.Comma;
    }
  }
  yield JsonToken.ObjectClose;
}

export async function writeJson(document: JsonDocument): Promise<ReadableStream<Uint8Array>> {
  return byteStream(documentChunks(document));
}

async function isBalanced(text: string): Promise<boolean> {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const character of text) {
    if (inString) {
      escaped = !escaped && character === JsonToken.Escape;
      inString = escaped || character !== JsonToken.Quote;
      continue;
    }
    if (character === JsonToken.Quote) {
      inString = true;
    } else if (character === JsonToken.ObjectOpen || character === JsonToken.ArrayOpen) {
      depth += 1;
    } else if (character === JsonToken.ObjectClose || character === JsonToken.ArrayClose) {
      depth -= 1;
    }
  }
  return depth <= 0 && !inString;
}

export async function readJson(stream: ReadableStream<Uint8Array>): Promise<unknown> {
  let text: string = Text.Empty;
  for await (const chunk of textChunks(stream)) {
    text += chunk;
  }
  if (text.trim() === Text.Empty || !(await isBalanced(text))) {
    throw new StreamError(MessageId.StreamIncomplete, { what: StreamWhat.Document });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new StreamError(MessageId.StreamJsonInvalid, { detail: (error as Error).message });
  }
}
