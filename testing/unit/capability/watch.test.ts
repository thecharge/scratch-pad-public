import { collectEvents, watchCapability } from "@platform/capability";
import { AuthMode, HttpMethod, MessageId, MethodKind, TransportKind } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { failing, items, spaced, tickCapability } from "@platform/test-scenarios";
import type { Capability, CapabilityContext } from "@platform/types";

const CONTEXT = {
  principal: { subject: "s", scopes: [], authenticated: false },
  requestId: "r",
  transport: TransportKind.Mcp,
  authEnabled: false,
} as unknown as CapabilityContext;
const WATCH_ID = "ticks.watch";
const NAME = { name: "ticks/t1" };
const BOOM = { message: "boom" };
const NEEDS_EVENTS = { name: "CapabilityDefinitionError", messageId: MessageId.WatchNeedsEvents };

const baseWith = async (source?: () => Promise<AsyncIterable<unknown>>) => tickCapability(source);

async function* twoTickStates(): AsyncGenerator<unknown> {
  yield { n: 1 };
  yield { n: 2 };
}

const twoTicks = async () => twoTickStates();
const failingTicks = async () => failing();

const withEvents = await baseWith(twoTicks);
const withoutEvents = await baseWith();
const withFailure = await baseWith(failingTicks);
const identity = (capability: Capability) => ({
  id: capability.id,
  auth: capability.auth,
  method: capability.method,
  httpMethod: capability.httpMethod,
  onlyOver: capability.onlyOver,
});
const run = (capability: Capability, input: object) => capability.handler(input, CONTEXT);
const DERIVED = {
  id: WATCH_ID,
  auth: AuthMode.Required,
  method: MethodKind.Custom,
  httpMethod: HttpMethod.Get,
  onlyOver: TransportKind.Mcp,
};
const TWO_TICKS = { events: [{ n: 1 }, { n: 2 }] };
const ONE_TICK = { events: [{ n: 1 }] };

unit(collectEvents, {
  positive: [
    positive("collects every state until the source ends", [items(1, 2, 3), 10, 1000], [1, 2, 3]),
    positive("stops at the maximum number of events", [items(1, 2, 3), 2, 1000], [1, 2]),
  ],
  negative: [
    rejected("returns what arrived when the timeout passes first", [spaced(300, 1, 2), 10, 40], []),
    rejected("returns nothing for a source with no states", [items(), 10, 1000], []),
    negative("fails when the source fails", [failing(), 10, 1000], BOOM),
  ],
});

unit(watchCapability, {
  positive: [
    positive(
      "derives an MCP-only GET custom capability with the same auth",
      [withEvents, WATCH_ID],
      seen(identity, DERIVED),
    ),
    positive(
      "its handler returns the states of the source",
      [withEvents, WATCH_ID],
      seen((capability: Capability) => run(capability, NAME), TWO_TICKS),
    ),
    positive(
      "its handler stops at maxEvents",
      [withEvents, WATCH_ID],
      seen((capability: Capability) => run(capability, { ...NAME, maxEvents: 1 }), ONE_TICK),
    ),
  ],
  negative: [
    negative(
      "refuses a capability without an event source",
      [withoutEvents, WATCH_ID],
      NEEDS_EVENTS,
    ),
    negative("its handler fails when the source fails", [withFailure, WATCH_ID], BOOM, [
      "handler",
      NAME,
      CONTEXT,
    ]),
  ],
});
