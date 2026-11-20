import { MessageId } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { bytesOf, cutStream, items, lockedStream, textOf, watched } from "@platform/test-scenarios";
import { byteStream, textChunks } from "../../../packages/streams/src/chunks.ts";

const STREAM_ERROR = "StreamError";
const ABORTED = { name: STREAM_ERROR, messageId: MessageId.StreamAborted };
const TYPE_ERROR = { name: "TypeError" };
const BROKE = { message: "source broke" };
const E_ACUTE = new TextEncoder().encode("é");
let stops = 0;

async function* breaking(): AsyncGenerator<string> {
  yield "a";
  throw new Error("source broke");
}

unit(textChunks, {
  positive: [
    positive(
      "yields each chunk as text",
      [bytesOf(new TextEncoder().encode("ab"), new TextEncoder().encode("cd"))],
      ["ab", "cd"],
    ),
    positive(
      "joins a character that is split between two chunks",
      [bytesOf(E_ACUTE.slice(0, 1), E_ACUTE.slice(1))],
      ["", "é"],
    ),
  ],
  negative: [
    negative("reports a connection that was cut", [cutStream()], ABORTED),
    negative("fails for a stream that is already being read", [lockedStream()], TYPE_ERROR),
  ],
});

unit(byteStream, {
  positive: [
    positive("writes the text as bytes", [items("ab", "cd")], seen(textOf, "abcd")),
    positive("closes at once for no text", [items()], seen(textOf, "")),
    positive(
      "stops the source when the reader cancels",
      [watched(() => stops++)],
      seen(() => stops, 1),
      ["cancel"],
    ),
  ],
  negative: [
    negative("fails when the source fails", [breaking()], BROKE),
    negative("fails when the source is not iterable", [undefined as never], TYPE_ERROR),
  ],
});
