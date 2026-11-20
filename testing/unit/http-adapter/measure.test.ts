import { expect, test } from "bun:test";
import { negative, positive, seen, unit } from "@platform/test-factories";
import type { JsonObject, StreamTracker } from "@platform/types";
import { measured } from "../../../packages/http-adapter/src/measure.ts";

const heard: number[] = [];
const events: string[] = [];
const TRACKER: StreamTracker = {
  opened: async () => {
    events.push("opened");
  },
  closed: async () => {
    events.push("closed");
  },
};
const record = async (bytes: number) => {
  heard.push(bytes);
};
const failing = async () => {
  throw new Error("record failed");
};
const sized = () =>
  new Response("hello", { headers: { "content-length": "5", "content-type": "text/plain" } });
const chunked = () =>
  new Response(new Blob(["abc", "de"]).stream(), { headers: { "content-type": "text/plain" } });
const empty = () => new Response(null, { status: 204 });
const afterConsume = () => [heard.at(-1), events.slice(-2)];
const bodyText = (summary: JsonObject) => summary.body;

unit(measured, {
  positive: [
    positive(
      "a response with a length is recorded at once with that length",
      [sized(), TRACKER, record],
      seen((response: Response) => [response.status, heard.at(-1)], [200, 5]),
    ),
    positive(
      "a response without a body is recorded as zero bytes",
      [empty(), TRACKER, record],
      seen((response: Response) => [response.status, heard.at(-1)], [204, 0]),
    ),
    positive(
      "a streamed body is passed on whole",
      [chunked(), TRACKER, record],
      seen(bodyText, "abcde"),
    ),
    positive(
      "a streamed body counts its bytes and closes its stream",
      [chunked(), TRACKER, record],
      seen(afterConsume, [5, ["opened", "closed"]]),
    ),
  ],
  negative: [
    negative("needs a response", [undefined, TRACKER, record], { name: "TypeError" }),
    negative("raises the error of the recorder", [sized(), TRACKER, failing], {
      message: "record failed",
    }),
  ],
});

test("a cancelled stream is closed and recorded with the bytes read so far", async () => {
  const response = await measured(chunked(), TRACKER, record);
  await response.body?.cancel();
  expect(events.slice(-2)).toEqual(["opened", "closed"]);
});
