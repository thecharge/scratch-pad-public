import { describe, expect, test } from "bun:test";
import {
  readEvents,
  readJson,
  readNdjson,
  writeEvents,
  writeJson,
  writeNdjson,
} from "@platform/streams";
import { items } from "@platform/test-scenarios";
import { z } from "zod";

const BOOK = z.object({ name: z.string(), pages: z.number() });
const BOOKS = [
  { name: "publishers/1/books/1", pages: 10 },
  { name: "publishers/1/books/2", pages: 20 },
  { name: "publishers/1/books/3", pages: 30 },
];

describe("what a writer sends a reader receives", () => {
  test("a streamed document with an array property", async () => {
    const stream = await writeJson({ books: items(...BOOKS), nextPageToken: "" });
    expect(await readJson(stream)).toEqual({ books: BOOKS, nextPageToken: "" });
  });

  test("newline-delimited items, validated line by line", async () => {
    const stream = await writeNdjson(items(...BOOKS));
    expect(await Array.fromAsync(readNdjson(stream, BOOK))).toEqual(BOOKS);
  });

  test("events with name, id and data", async () => {
    const events = BOOKS.map((data, index) => ({ event: "book", id: String(index), data }));
    const stream = await writeEvents(items(...events));
    expect(await Array.fromAsync(readEvents(stream))).toEqual(events);
  });

  test("the first bytes leave before the last element is produced", async () => {
    const produced: number[] = [];
    async function* slow(): AsyncGenerator<number> {
      produced.push(1);
      yield 1;
      produced.push(2);
      yield 2;
      produced.push(3);
      yield 3;
    }
    const stream = await writeJson({ values: slow() });
    const reader = stream.getReader();
    await reader.read();
    await reader.read();
    await reader.read();
    expect(produced.length).toBeLessThan(3);
    await reader.cancel();
  });

  test("a body cut in the middle is an incomplete stream", async () => {
    const whole = await new Response(await writeNdjson(items(...BOOKS))).text();
    const cut = new Response(whole.slice(0, whole.length - 5)).body as ReadableStream<Uint8Array>;
    await expect(Array.fromAsync(readNdjson(cut, BOOK))).rejects.toMatchObject({
      name: "StreamError",
    });
  });
});
