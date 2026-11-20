import {
  CustomVerb,
  HttpMethod,
  MessageId,
  MethodKind,
  TransportKind,
  WATCH_DEFAULT_EVENTS,
  WATCH_DEFAULT_TIMEOUT_MS,
  WATCH_MAX_EVENTS,
  WATCH_MAX_TIMEOUT_MS,
} from "@platform/constants";
import { message } from "@platform/messages";
import { type Capability, WatchInputSchema } from "@platform/types";
import { z } from "zod";
import { CapabilityDefinitionError, defineCapability } from "./capability.ts";

async function idleAfter(ms: number): Promise<undefined> {
  await Bun.sleep(Math.max(ms, 0));
}

export async function collectEvents(
  source: AsyncIterable<unknown>,
  maxEvents: number,
  timeoutMs: number,
): Promise<unknown[]> {
  const iterator = source[Symbol.asyncIterator]();
  const found: unknown[] = [];
  const deadline = Date.now() + timeoutMs;
  while (found.length < maxEvents) {
    const next = await Promise.race([iterator.next(), idleAfter(deadline - Date.now())]);
    if (next === undefined || next.done) {
      break;
    }
    found.push(next.value);
  }
  await iterator.return?.();
  return found;
}

export async function watchCapability(base: Capability, id: string): Promise<Capability> {
  const events = base.events;
  if (events === undefined) {
    throw new CapabilityDefinitionError(MessageId.WatchNeedsEvents, { id: base.id });
  }
  return defineCapability({
    id,
    version: base.version,
    method: MethodKind.Custom,
    customVerb: CustomVerb.Watch,
    httpMethod: HttpMethod.Get,
    resource: base.resource,
    summary: message(MessageId.WatchSummary, { summary: base.summary }),
    description: message(MessageId.WatchDescription, { summary: base.summary }),
    auth: base.auth,
    policy: base.policy,
    onlyOver: TransportKind.Mcp,
    input: WatchInputSchema,
    output: z.object({ events: z.array(events.item ?? base.output) }),
    handler: async (input, context) => ({
      events: await collectEvents(
        await events.source(base.input.parse({ name: input.name }), context),
        Math.min(input.maxEvents ?? WATCH_DEFAULT_EVENTS, WATCH_MAX_EVENTS),
        Math.min(input.timeoutMs ?? WATCH_DEFAULT_TIMEOUT_MS, WATCH_MAX_TIMEOUT_MS),
      ),
    }),
  });
}
