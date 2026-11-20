import { describe, expect, test } from "bun:test";
import { MessageId } from "@platform/constants";
import {
  drain,
  iterate,
  readEvents,
  readJson,
  readNdjson,
  writeEvents,
  writeJson,
  writeNdjson,
} from "@platform/streams";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { waitUntil } from "@platform/test-framework";
import {
  chunksOf,
  cutStream,
  failing,
  items,
  lockedStream,
  spaced,
  streamOf,
  textOf,
} from "@platform/test-scenarios";
import { z } from "zod";

const LINE = z.object({ a: z.number() });
const STREAM_ERROR = "StreamError";
const SCALARS = { a: 1, b: "x" };
const WITH_UNDEFINED = { a: 1, b: undefined };
const WITH_ARRAY = { books: items(1, 2), total: 2 };
const WITH_BIGINT = { n: 1n };
const WITH_FAILING = { books: failing() };
const ARRAY_CHUNKS = ["{", '"books":', "[", "1", ",2", "]", ',"total":2', "}"];
const NAMED_EVENT = { event: "progress", id: "1", data: { n: 1 } };
const BARE_EVENT = { data: 5 };
const BIGINT_EVENT = { data: 1n };
const BAD_EVENT = { event: 5, data: 1 };
const SECOND_EVENT = { data: { n: 2 } };
const INCOMPLETE = { name: STREAM_ERROR, messageId: MessageId.StreamIncomplete };
const INVALID_JSON = { name: STREAM_ERROR, messageId: MessageId.StreamJsonInvalid };
const ABORTED = { name: STREAM_ERROR, messageId: MessageId.StreamAborted };
const LINE_ERROR = { name: STREAM_ERROR, messageId: MessageId.StreamLineInvalid };
const FRAME_ERROR = { name: STREAM_ERROR, messageId: MessageId.StreamFrameInvalid };
const AT_LINE_2 = { ...LINE_ERROR, params: { line: 2 } };
const AT_LINE_3 = { ...LINE_ERROR, params: { line: 3 } };
const AT_FRAME_2 = { ...FRAME_ERROR, params: { frame: 2 } };
const TYPE_ERROR = { name: "TypeError" };
const KEEPALIVE_THEN_DATA = (chunks: Uint8Array[]) =>
  textOf(chunks).startsWith(": connected\n\n: keepalive\n\n") &&
  textOf(chunks).endsWith("data: 5\n\n");
const BOOM = { message: "boom" };
const ZOD_ERROR = { name: "ZodError" };

unit(writeJson, {
  positive: [
    positive("writes scalar properties in order", [SCALARS], seen(textOf, '{"a":1,"b":"x"}')),
    positive(
      "writes an async iterable as an array, one chunk per element",
      [WITH_ARRAY],
      seen(chunksOf, ARRAY_CHUNKS),
    ),
  ],
  negative: [
    rejected(
      "leaves out a property whose value is undefined",
      [WITH_UNDEFINED],
      seen(textOf, '{"a":1}'),
    ),
    negative("fails when a value cannot be written as JSON", [WITH_BIGINT], TYPE_ERROR),
    negative("fails when the array source fails part way", [WITH_FAILING], BOOM),
  ],
});

unit(readJson, {
  positive: [
    positive("reads an object", [streamOf('{"a":1}')], { a: 1 }),
    positive("reads a document split over several chunks", [streamOf('{"a"', ":[1,", "2]}")], {
      a: [1, 2],
    }),
  ],
  negative: [
    negative("reports a body that ends inside the document", [streamOf('{"a":[1,')], INCOMPLETE),
    negative("reports an empty body as incomplete", [streamOf("")], INCOMPLETE),
    negative("reports a complete body that is not JSON", [streamOf('{"a":}')], INVALID_JSON),
    negative("reports a connection that was cut", [cutStream()], ABORTED),
  ],
});

unit(writeNdjson, {
  positive: [
    positive(
      "writes one line per item",
      [items({ a: 1 }, { a: 2 })],
      seen(textOf, '{"a":1}\n{"a":2}\n'),
    ),
    positive("writes nothing for no items", [items()], seen(textOf, "")),
  ],
  negative: [
    negative("fails when an item cannot be written as JSON", [items(1n)], TYPE_ERROR),
    negative("fails when the source fails part way", [failing()], BOOM),
  ],
});

unit(readNdjson, {
  positive: [
    positive(
      "yields each valid line",
      [streamOf('{"a":1}\n{"a":2}\n'), LINE],
      [{ a: 1 }, { a: 2 }],
    ),
    positive(
      "yields lines split across chunks and a last line without a line break",
      [streamOf('{"a"', ":1}\n", '{"a":2}'), LINE],
      [{ a: 1 }, { a: 2 }],
    ),
  ],
  negative: [
    negative("names the line that is not JSON", [streamOf('{"a":1}\nnot json\n'), LINE], AT_LINE_2),
    negative(
      "names the line that fails the schema, counting blank lines",
      [streamOf('{"a":1}\n\n{"a":"x"}\n'), LINE],
      AT_LINE_3,
    ),
    negative(
      "reports a body that ends inside a line",
      [streamOf('{"a":1}\n{"a":'), LINE],
      INCOMPLETE,
    ),
  ],
});

unit(writeEvents, {
  positive: [
    positive(
      "writes the event name, the id and the data",
      [items(NAMED_EVENT)],
      seen(textOf, ': connected\n\nevent: progress\nid: 1\ndata: {"n":1}\n\n'),
    ),
    positive(
      "writes a keep-alive comment while the source is idle, then the event",
      [spaced(90, BARE_EVENT), 20],
      seen(KEEPALIVE_THEN_DATA, true),
    ),
    positive(
      "writes only the data when there is no name",
      [items(BARE_EVENT)],
      seen(textOf, ": connected\n\ndata: 5\n\n"),
    ),
  ],
  negative: [
    negative("fails when the data cannot be written as JSON", [items(BIGINT_EVENT)], TYPE_ERROR),
    negative("fails when an event is not valid", [items(BAD_EVENT)], ZOD_ERROR),
  ],
});

unit(readEvents, {
  positive: [
    positive(
      "yields each frame with its name, id and data",
      [streamOf('event: progress\nid: 1\ndata: {"n":1}\n\ndata: 5\n\n')],
      [NAMED_EVENT, BARE_EVENT],
    ),
    positive(
      "ignores a comment frame and joins a frame split across chunks",
      [streamOf(": keepalive\n\n", "data: ", '{"n":2}\n', "\n")],
      [SECOND_EVENT],
    ),
  ],
  negative: [
    negative(
      "names the frame whose data is not JSON",
      [streamOf("data: 1\n\ndata: nope\n\n")],
      AT_FRAME_2,
    ),
    negative(
      "reports a stream that ends inside a frame",
      [streamOf('data: {"n":1}\n')],
      INCOMPLETE,
    ),
    negative("reports a connection that was cut", [cutStream()], ABORTED),
  ],
});

describe("writeEvents releases what feeds it", () => {
  test("the source is cancelled soon after the reader cancels", async () => {
    let cancelled = false;
    const source = new ReadableStream({
      start: async (controller) => controller.enqueue(BARE_EVENT),
      cancel: async () => {
        cancelled = true;
      },
    });
    const reader = (await writeEvents(source, 20)).getReader();
    await reader.read();
    await reader.cancel();
    await waitUntil(async () => cancelled);
    expect(cancelled).toBe(true);
  });
});

const numbers = async (...values: number[]) =>
  new ReadableStream<number>({
    start: async (controller) => {
      values.forEach((value) => {
        controller.enqueue(value);
      });
      controller.close();
    },
  });
const broken = async () =>
  new ReadableStream<number>({
    start: async (controller) => controller.error(new RangeError("source failed")),
  });
const taken = await numbers(1);
taken.getReader();
const everything = async (iterable: AsyncIterable<number>) => Array.fromAsync(iterable);

unit(iterate, {
  positive: [
    positive("yields every item in order", [await numbers(1, 2, 3)], seen(everything, [1, 2, 3])),
    positive("an empty stream yields nothing", [await numbers()], seen(everything, [])),
  ],
  negative: [
    negative("a stream that is already read by someone else cannot be taken", [taken], {
      name: "TypeError",
    }),
    negative("something that is not a stream cannot be taken", [undefined as never], {
      name: "TypeError",
    }),
  ],
});

describe("a stream that fails", () => {
  test("rejects the read", async () => {
    const reading = Array.fromAsync(await iterate(await broken()));
    expect(reading).rejects.toMatchObject({ name: "RangeError" });
  });
});

describe("iterate lets go of the stream", () => {
  test("return cancels the source even while a read is waiting", async () => {
    let cancelled = false;
    const source = new ReadableStream<number>({
      cancel: async () => {
        cancelled = true;
      },
    });
    const iterator = (await iterate(source))[Symbol.asyncIterator]();
    void iterator.next();
    await iterator.return?.();
    expect(cancelled).toBe(true);
  });
});

unit(drain, {
  positive: [
    positive("reads a body to its end and counts the bytes", [streamOf("ab", "cde")], 5),
    positive("stops reading past the limit", [streamOf("word", "more"), 3], 4),
  ],
  negative: [
    rejected("a missing body drains nothing", [null], 0),
    rejected("a body somebody else is reading is left alone", [lockedStream()], 0),
    rejected("a body that breaks off drains what came before", [cutStream()], 0),
  ],
});
