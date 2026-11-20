import { defineCapability } from "@platform/capability";
import { ApiVersion, AuthMode, HttpHeader, MethodKind, TransportKind } from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import type { CapabilityContext } from "@platform/types";
import { z } from "zod";
import { acceptsEvents, eventResponse } from "../../../packages/http-adapter/src/events.ts";

const CONTEXT: CapabilityContext = {
  principal: { subject: "s", scopes: [], authenticated: false },
  requestId: "r",
  transport: TransportKind.Http,
  authEnabled: false,
} as never;
const TICK = "tick";
const URL_OF = "http://localhost/v1/ticks/t1";
const BODY_TEXT = ["text"];

async function* twoStates(): AsyncGenerator<unknown> {
  yield { n: 1 };
  yield { n: 2 };
}

async function* breaking(): AsyncGenerator<unknown> {
  yield { n: 1 };
  throw new Error("source broke");
}

async function capabilityOf(source: () => Promise<AsyncIterable<unknown>>) {
  return defineCapability({
    id: "ticks.get",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: "ticks/{tick}",
    summary: "Get a tick",
    description: "Gets a tick.",
    auth: AuthMode.None,
    input: z.object({ name: z.string() }),
    output: z.object({ n: z.number() }),
    handler: async () => ({ n: 0 }),
    events: { name: TICK, source },
  });
}

const steady = await capabilityOf(async () => twoStates());
const broken = await capabilityOf(async () => breaking());
const acceptHeader = (accept?: string) =>
  accept === undefined ? {} : { [HttpHeader.Accept]: accept };
const withAccept = (accept?: string, extra: Record<string, string> = {}) =>
  new Request(URL_OF, { headers: { ...acceptHeader(accept), ...extra } });
const GOOD_INPUT = { name: "ticks/t1" };
const OPEN = ": connected\n\n";
const FRAMES = `${OPEN}event: tick\nid: 1\ndata: {"n":1}\n\nevent: tick\nid: 2\ndata: {"n":2}\n\n`;
const FRAMES_AFTER_FIVE = `${OPEN}event: tick\nid: 6\ndata: {"n":1}\n\nevent: tick\nid: 7\ndata: {"n":2}\n\n`;
const ZOD_ERROR = { name: "ZodError" };
const BROKE = { message: "source broke" };

unit(acceptsEvents, {
  positive: [
    positive("is true for an event-stream Accept", [withAccept("text/event-stream")], true),
    positive(
      "is true when the event stream is one of several types",
      [withAccept("application/json, text/event-stream;q=0.9")],
      true,
    ),
  ],
  negative: [
    rejected("is false without an Accept header", [withAccept()], false),
    rejected("is false for a JSON Accept", [withAccept("application/json")], false),
  ],
});

unit(eventResponse, {
  positive: [
    positive(
      "sends the states as numbered event frames",
      [steady, GOOD_INPUT, CONTEXT, withAccept("text/event-stream")],
      FRAMES,
      BODY_TEXT,
    ),
    positive(
      "continues the numbering after Last-Event-ID",
      [
        steady,
        GOOD_INPUT,
        CONTEXT,
        withAccept("text/event-stream", { [HttpHeader.LastEventId]: "5" }),
      ],
      FRAMES_AFTER_FIVE,
      BODY_TEXT,
    ),
  ],
  negative: [
    negative(
      "fails when the input is not valid for the capability",
      [steady, {}, CONTEXT, withAccept("text/event-stream")],
      ZOD_ERROR,
      BODY_TEXT,
    ),
    negative(
      "fails when the source fails part way",
      [broken, GOOD_INPUT, CONTEXT, withAccept("text/event-stream")],
      BROKE,
      BODY_TEXT,
    ),
  ],
});
