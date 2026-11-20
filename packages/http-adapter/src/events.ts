import { toWire } from "@platform/aip";
import { HttpHeader, MediaType, SseHeaderValue, Text } from "@platform/constants";
import { writeEvents } from "@platform/streams";
import type { Capability, CapabilityContext, StreamEvent } from "@platform/types";

export async function acceptsEvents(request: Request): Promise<boolean> {
  return (request.headers.get(HttpHeader.Accept) ?? Text.Empty).includes(MediaType.EventStream);
}

async function firstId(request: Request): Promise<number> {
  const last = Number(request.headers.get(HttpHeader.LastEventId));
  return Number.isInteger(last) && last > 0 ? last : 0;
}

async function* eventsOf(
  capability: Capability,
  input: unknown,
  context: CapabilityContext,
  start: number,
): AsyncGenerator<StreamEvent> {
  const events = capability.events;
  let id = start;
  for await (const state of (await events?.source(capability.input.parse(input), context)) ?? []) {
    id += 1;
    yield { event: events?.name, id: String(id), data: await toWire(state) };
  }
}

export async function eventResponse(
  capability: Capability,
  input: unknown,
  context: CapabilityContext,
  request: Request,
): Promise<Response> {
  const headers = new Headers({
    [HttpHeader.ContentType]: MediaType.EventStream,
    [HttpHeader.CacheControl]: SseHeaderValue.NoCache,
  });
  const events = eventsOf(capability, input, context, await firstId(request));
  return new Response(await writeEvents(events), { status: 200, headers });
}
