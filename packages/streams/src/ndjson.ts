import { MessageId, Separator, STREAM_LINE_END, StreamWhat, Text } from "@platform/constants";
import type { ZodType } from "zod";
import { byteStream, textChunks } from "./chunks.ts";
import { StreamError } from "./errors.ts";

async function* lineChunks(items: AsyncIterable<unknown>): AsyncGenerator<string> {
  for await (const item of items) {
    yield JSON.stringify(item) + STREAM_LINE_END;
  }
}

export async function writeNdjson(
  items: AsyncIterable<unknown>,
): Promise<ReadableStream<Uint8Array>> {
  return byteStream(lineChunks(items));
}

async function parsedLine<T>(text: string, number: number, schema: ZodType<T>): Promise<T> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new StreamError(MessageId.StreamLineInvalid, {
      line: number,
      detail: (error as Error).message,
    });
  }
  const checked = schema.safeParse(value);
  if (!checked.success) {
    const detail = checked.error.issues
      .map((issue) => issue.path.join(Separator.FieldPath) + Separator.Detail + issue.message)
      .join(Separator.ListSpaced);
    throw new StreamError(MessageId.StreamLineInvalid, { line: number, detail });
  }
  return checked.data;
}

async function* linesOf<T>(lines: string[], first: number, schema: ZodType<T>): AsyncGenerator<T> {
  for (const [index, line] of lines.entries()) {
    if (line.trim() !== Text.Empty) {
      yield await parsedLine(line, first + index, schema);
    }
  }
}

export async function* readNdjson<T>(
  stream: ReadableStream<Uint8Array>,
  schema: ZodType<T>,
): AsyncGenerator<T> {
  let pending: string = Text.Empty;
  let number = 0;
  for await (const chunk of textChunks(stream)) {
    pending += chunk;
    const lines = pending.split(STREAM_LINE_END);
    pending = lines.pop() ?? Text.Empty;
    yield* linesOf(lines, number + 1, schema);
    number += lines.length;
  }
  if (pending.trim() !== Text.Empty) {
    number += 1;
    try {
      yield await parsedLine(pending, number, schema);
    } catch {
      throw new StreamError(MessageId.StreamIncomplete, { what: StreamWhat.Line });
    }
  }
}
