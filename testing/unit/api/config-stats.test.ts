import { describe, expect, test } from "bun:test";
import { OperationStore } from "@platform/aip";
import { DEFAULT_ERROR_DOMAIN } from "@platform/config/urls";
import {
  CanonicalCode,
  CONFIG_ROW_ID,
  DEFAULT_BANNER_TEXT,
  DEFAULT_PAGE_SIZE,
  ErrorReason,
  EventKind,
  MAX_LOG_LIMIT,
  PrincipalKind,
  TransportKind,
} from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { waitUntil } from "@platform/test-framework";
import { fakeDeps, PUBLISHER_NAME, sampleBook, ZERO_RUNTIME } from "@platform/test-scenarios";
import type { ApiEvent, EventQuery, Operation, StatsSnapshot } from "@platform/types";
import { reindexBooks } from "../../../apps/api/src/capabilities/books.ts";
import { getConfig, updateConfig } from "../../../apps/api/src/capabilities/config.ts";
import { getEvents, getStats, listLogs } from "../../../apps/api/src/capabilities/observability.ts";

const run = (input: unknown) => ["handler", input, {}];
const INVALID_NAME = {
  code: CanonicalCode.InvalidArgument,
  reason: ErrorReason.InvalidResourceName,
};
const DEFAULT_CONFIG = {
  name: CONFIG_ROW_ID,
  bannerText: DEFAULT_BANNER_TEXT,
  pageSizeDefault: DEFAULT_PAGE_SIZE,
};
const NEW_BANNER = "Closed for stocktaking";
const BANNER_CONFIG = { ...DEFAULT_CONFIG, bannerText: NEW_BANNER };
const PAGE_CONFIG = { ...DEFAULT_CONFIG, pageSizeDefault: 7 };
const SNAPSHOT: StatsSnapshot = {
  name: "stats",
  total: 3,
  errors: 1,
  cacheHits: 2,
  byCapability: {},
  ...ZERO_RUNTIME,
};
const EVENT: ApiEvent = {
  kind: EventKind.Request,
  time: "2026-01-02T03:04:05.000Z",
  requestId: "r1",
  capability: "books.get",
  transport: TransportKind.Http,
  principalKind: PrincipalKind.User,
  status: 200,
  latencyMs: 1,
  cacheHit: false,
};

async function oneEvent(): Promise<ReadableStream<ApiEvent>> {
  return new ReadableStream<ApiEvent>({
    start: async (controller) => {
      controller.enqueue(EVENT);
      controller.close();
    },
  });
}

async function observing(received: EventQuery[]) {
  return {
    stats: async () => SNAPSHOT,
    recent: async (query: EventQuery) => {
      received.push(query);
      return [EVENT];
    },
    stream: oneEvent,
  };
}

const reader = await fakeDeps();
const stored = await fakeDeps([], {
  settings: {
    read: async () => BANNER_CONFIG,
    write: async () => undefined,
  },
});

unit(getConfig, {
  positive: [
    positive(
      "the stored settings are returned",
      [reader],
      DEFAULT_CONFIG,
      run({ name: CONFIG_ROW_ID }),
    ),
    positive(
      "changed settings are read back",
      [stored],
      BANNER_CONFIG,
      run({ name: CONFIG_ROW_ID }),
    ),
  ],
  negative: [
    negative(
      "a name other than the config name is invalid",
      [reader],
      INVALID_NAME,
      run({ name: "other" }),
    ),
    negative(
      "a book name is not a config name",
      [reader],
      INVALID_NAME,
      run({ name: "publishers/p/books/b" }),
    ),
  ],
});

const writer = await fakeDeps();
const pager = await fakeDeps();

unit(updateConfig, {
  positive: [
    positive(
      "a new banner is returned and stored",
      [writer],
      seen(async () => writer.settings.read(), BANNER_CONFIG),
      run({ name: CONFIG_ROW_ID, bannerText: NEW_BANNER }),
    ),
    positive(
      "a new page size keeps the banner",
      [pager],
      PAGE_CONFIG,
      run({ name: CONFIG_ROW_ID, pageSizeDefault: 7 }),
    ),
  ],
  negative: [
    negative(
      "a name other than the config name is invalid",
      [await fakeDeps()],
      INVALID_NAME,
      run({ name: "other", bannerText: "b" }),
    ),
    negative(
      "a book name is not a config name",
      [await fakeDeps()],
      INVALID_NAME,
      run({ name: "publishers/p/books/b" }),
    ),
  ],
});

const statsDeps = await fakeDeps([], { observability: await observing([]) });

unit(getStats, {
  positive: [
    positive(
      "the snapshot of the observer is returned",
      [statsDeps],
      SNAPSHOT,
      run({ name: "stats" }),
    ),
    positive(
      "the idle observer reports no traffic",
      [await fakeDeps()],
      expect.objectContaining({ total: 0, errors: 0 }),
      run({ name: "stats" }),
    ),
  ],
  negative: [
    negative(
      "a name other than stats is invalid",
      [statsDeps],
      INVALID_NAME,
      run({ name: "logs/x" }),
    ),
    negative("an empty name is invalid", [statsDeps], INVALID_NAME, run({ name: "" })),
  ],
});

const logQueries: EventQuery[] = [];
const logging = await fakeDeps([], { observability: await observing(logQueries) });
const broken = await fakeDeps([], {
  observability: {
    stats: async () => SNAPSHOT,
    recent: async () => {
      throw new RangeError("log store unavailable");
    },
    stream: oneEvent,
  },
});
const FILTERED = { pageSize: 5, capability: "books.get" };
const SENT_TO_OBSERVER: EventQuery = { capability: "books.get", limit: MAX_LOG_LIMIT };

unit(listLogs, {
  positive: [
    positive(
      "recent events are returned",
      [logging],
      { events: [EVENT], nextPageToken: "" },
      run({}),
    ),
    positive(
      "the query reaches the observer unchanged",
      [logging],
      seen(async () => logQueries.at(-1), SENT_TO_OBSERVER),
      run(FILTERED),
    ),
  ],
  negative: [
    negative("a failing observer surfaces its failure", [broken], { name: "RangeError" }, run({})),
    negative(
      "the failure keeps its message",
      [broken],
      { message: "log store unavailable" },
      run({ kind: EventKind.Request }),
    ),
  ],
});

const operations = new OperationStore(DEFAULT_ERROR_DOMAIN);
const indexing = await fakeDeps([sampleBook("b1"), sampleBook("b2")]);
const settled = await fakeDeps([sampleBook("b1"), sampleBook("b2")]);
const OPERATION_PENDING = expect.objectContaining({
  name: expect.stringMatching(/^operations\//),
  done: false,
});

unit(reindexBooks, {
  positive: [
    positive(
      "a pending operation is returned",
      [indexing, operations],
      OPERATION_PENDING,
      run({ parent: PUBLISHER_NAME }),
    ),
    positive(
      "the operation completes with the number of books",
      [settled, operations],
      seen(
        async (operation: Operation) => {
          await waitUntil(async () => (await operations.get(operation.name)).done);
          return (await operations.get(operation.name)).response;
        },
        { count: 2 },
      ),
      run({ parent: PUBLISHER_NAME }),
    ),
  ],
  negative: [
    negative(
      "a parent that is not a publisher name is invalid",
      [indexing, operations],
      INVALID_NAME,
      run({ parent: "x" }),
    ),
    negative(
      "a book name is not a parent",
      [indexing, operations],
      INVALID_NAME,
      run({ parent: "publishers/p/books/b" }),
    ),
  ],
});

const eventsDeps = await fakeDeps([], { observability: await observing([]) });

unit(getEvents, {
  positive: [
    positive(
      "the recent events are the state",
      [eventsDeps],
      { events: [EVENT] },
      run({ name: "events" }),
    ),
    positive(
      "the idle observer has no recent events",
      [await fakeDeps()],
      { events: [] },
      run({ name: "events" }),
    ),
  ],
  negative: [
    negative(
      "a name other than events is invalid",
      [eventsDeps],
      INVALID_NAME,
      run({ name: "stats" }),
    ),
    negative("an empty name is invalid", [eventsDeps], INVALID_NAME, run({ name: "" })),
  ],
});

describe("the events capability streams what the observer streams", () => {
  test("the source yields the events of the observer", async () => {
    const capability = await getEvents(eventsDeps);
    const source = await capability.events?.source({ name: "events" }, {} as never);
    expect(await Array.fromAsync(source ?? [])).toEqual([EVENT]);
  });

  test("the stream item is the event schema, not the state", async () => {
    const capability = await getEvents(eventsDeps);
    expect(capability.events?.item?.safeParse(EVENT).success).toBe(true);
  });
});
