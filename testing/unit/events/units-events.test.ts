import {
  CanonicalCode,
  EventKind,
  PolicyOutcome,
  PrincipalKind,
  TransportKind,
} from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import type { PipelineRecord } from "@platform/types";
import { EventBus, observerFor } from "../../../packages/events/src/index.ts";

const NOW = new Date("2026-02-03T04:05:06.000Z");
const clock = async () => NOW;
const RECORD: PipelineRecord = {
  capabilityId: "books.get",
  requestId: "r-1",
  transport: TransportKind.Http,
  principalKind: PrincipalKind.User,
  status: CanonicalCode.NotFound,
  latencyMs: 12,
  cacheHit: true,
  policyOutcome: PolicyOutcome.Allow,
};
const EXPECTED_EVENT = {
  kind: EventKind.Request,
  time: NOW.toISOString(),
  requestId: "r-1",
  capability: "books.get",
  transport: TransportKind.Http,
  principalKind: PrincipalKind.User,
  status: 404,
  latencyMs: 12,
  cacheHit: true,
};
const OK_RECORD = { ...RECORD, status: CanonicalCode.Ok, cacheHit: false, requestId: "r-2" };
const OK_EVENT = { ...EXPECTED_EVENT, status: 200, cacheHit: false, requestId: "r-2" };
const recent = (bus: EventBus) => async () => bus.recent({});

const recording = new EventBus();
const fresh = new EventBus();
const stampedNow = (bus: EventBus) => async () => {
  const [event] = await bus.recent({});
  return Math.abs(Date.parse(event?.time ?? "") - Date.now()) < 5000;
};
const second = new EventBus();
const clocked = new EventBus();
const idle = new EventBus();

unit(observerFor, {
  positive: [
    positive(
      "a record becomes a request event with the http status",
      [recording, clock],
      seen(recent(recording), [EXPECTED_EVENT]),
      ["record", RECORD],
    ),
    positive(
      "the system clock stamps the event when none is given",
      [fresh],
      seen(stampedNow(fresh), true),
      ["record", OK_RECORD],
    ),
    positive("an ok record becomes status 200", [second, clock], seen(recent(second), [OK_EVENT]), [
      "record",
      OK_RECORD,
    ]),
  ],
  negative: [
    rejected("nothing is published before a record arrives", [idle, clock], seen(recent(idle), [])),
    negative(
      "a clock that fails surfaces its failure",
      [
        clocked,
        async () => {
          throw new RangeError("clock down");
        },
      ],
      { name: "RangeError" },
      ["record", RECORD],
    ),
  ],
});
