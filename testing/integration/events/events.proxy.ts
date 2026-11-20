import { afterAll, describe, expect, test } from "bun:test";
import {
  EndpointPath,
  EventKind,
  EXPOSITION_CONTENT_TYPE,
  HttpHeader,
  MediaType,
  PrincipalKind,
  RECENT_EVENTS_MAX,
  TransportKind,
} from "@platform/constants";
import { EventBus, observerFor, StatsCollector } from "@platform/events";
import { readUntil } from "@platform/test-scenarios";
import type { ApiEvent, StatsSnapshot } from "@platform/types";
import { all } from "@platform/util";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const BASE = {
  time: "2026-10-31T00:00:00Z",
  requestId: "r",
  transport: TransportKind.Http,
  principalKind: PrincipalKind.User,
};

function request(capability: string, status = 200, cacheHit = false): ApiEvent {
  return { ...BASE, capability, kind: EventKind.Request, status, latencyMs: 10, cacheHit };
}

afterAll(async () => {
  await finishProxyIntegration();
});

describe("EventBus", () => {
  test("keeps only the most recent events", async () => {
    const bus = new EventBus();
    Array.from({ length: RECENT_EVENTS_MAX + 10 }, async (_, index) =>
      bus.publish(request(`c${index}`)),
    );
    expect((await bus.recent({ limit: 500 })).length).toBe(RECENT_EVENTS_MAX);
  });

  test("recent filters by kind and capability and returns the newest", async () => {
    const bus = new EventBus();
    await bus.publish(request("a"));
    await bus.publish(request("b"));
    await bus.publish({ ...BASE, capability: "a", kind: EventKind.Cache, hit: true });
    expect(await bus.recent({ capability: "a", kind: EventKind.Request })).toMatchObject([
      { capability: "a", kind: EventKind.Request },
    ]);
  });

  test("a subscriber hears events until it unsubscribes", async () => {
    const bus = new EventBus();
    const heard: string[] = [];
    const stop = bus.subscribe((event) => heard.push(event.capability));
    await bus.publish(request("a"));
    stop();
    await bus.publish(request("b"));
    expect(heard).toEqual(["a"]);
  });

  test("the observer publishes a request event without any payload", async () => {
    const bus = new EventBus();
    await (await observerFor(bus)).record({
      capabilityId: "books.get",
      requestId: "r1",
      transport: TransportKind.Mcp,
      principalKind: PrincipalKind.Agent,
      status: "NOT_FOUND" as never,
      latencyMs: 3,
      cacheHit: false,
    });
    expect(await bus.recent({})).toMatchObject([
      {
        kind: EventKind.Request,
        capability: "books.get",
        status: 404,
        transport: TransportKind.Mcp,
      },
    ]);
  });
});

describe("StatsCollector", () => {
  test("aggregates counts, errors, cache hits and latency per capability", async () => {
    const bus = new EventBus();
    const stats = new StatsCollector(bus);
    await bus.publish(request("a"));
    await bus.publish(request("a", 500, true));
    await bus.publish(request("b"));
    await Bun.sleep(5);
    const snapshot = await stats.stats();
    expect([
      snapshot.total,
      snapshot.errors,
      snapshot.cacheHits,
      snapshot.byCapability.a?.count,
    ]).toEqual([3, 1, 1, 2]);
  });
});

describe("event stream", () => {
  async function serve() {
    return proxyFixture({ enabled: true, domain: "events.test" });
  }

  const STREAM = { [HttpHeader.Accept]: MediaType.EventStream };

  test("a caller without a token is asked to sign in", async () => {
    const { origin } = await serve();
    const response = await fetch(`${origin}${EndpointPath.Events}`, { headers: STREAM });
    expect(response.status).toBe(401);
  });

  test("a token without the admin scope gets no stream", async () => {
    const { issuer, origin } = await serve();
    const token = await issuer.issue({ scopes: ["read"] });
    const response = await fetch(`${origin}${EndpointPath.Events}`, {
      headers: { ...STREAM, [HttpHeader.Authorization]: `Bearer ${token}` },
    });
    expect(response.status).toBe(403);
  });

  test("an admin receives the request events as they happen", async () => {
    const { issuer, origin } = await serve();
    const token = await issuer.issue({ scopes: ["admin"] });
    const authorization = { [HttpHeader.Authorization]: `Bearer ${token}` };
    const controller = new AbortController();
    const response = await fetch(`${origin}${EndpointPath.Events}`, {
      headers: { ...STREAM, ...authorization },
      signal: controller.signal,
    });
    const reader = response.body?.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    await fetch(`${origin}/v1/config`, { headers: { [HttpHeader.Accept]: MediaType.Json } });
    const heard = await readUntil(reader, "config.get");
    controller.abort();
    expect([response.headers.get(HttpHeader.ContentType), heard]).toEqual([
      MediaType.EventStream,
      expect.stringContaining("config.get"),
    ]);
  });

  test("an admin reads the stages, the memory and the requests in flight after a load", async () => {
    const { issuer, origin } = await serve();
    const token = await issuer.issue({ scopes: ["admin"] });
    await all(
      Array.from(
        { length: 20 },
        () => async () =>
          fetch(`${origin}/v1/config`, { headers: { [HttpHeader.Accept]: MediaType.Json } }),
      ),
    );
    const response = await fetch(`${origin}${EndpointPath.Stats}`, {
      headers: {
        [HttpHeader.Accept]: MediaType.Json,
        [HttpHeader.Authorization]: `Bearer ${token}`,
      },
    });
    const snapshot = (await response.json()) as StatsSnapshot;
    expect([
      snapshot.stages.route?.count ?? 0,
      snapshot.stages.invoke?.count ?? 0,
      snapshot.process.rssBytes > 0,
      snapshot.process.heapUsedBytes > 0,
      snapshot.process.requestsInFlight,
    ]).toEqual([expect.any(Number), expect.any(Number), true, true, 1]);
    expect(snapshot.stages.route?.count).toBeGreaterThanOrEqual(20);
    expect(snapshot.stages.invoke?.count).toBeGreaterThanOrEqual(20);
  });

  test("an open stream is counted while it is open and not after it is closed", async () => {
    const { issuer, origin } = await serve();
    const token = await issuer.issue({ scopes: ["admin"] });
    const authorization = { [HttpHeader.Authorization]: `Bearer ${token}` };
    const statsOf = async () =>
      (await (
        await fetch(`${origin}${EndpointPath.Stats}`, {
          headers: { [HttpHeader.Accept]: MediaType.Json, ...authorization },
        })
      ).json()) as StatsSnapshot;
    const controller = new AbortController();
    const response = await fetch(`${origin}${EndpointPath.Events}`, {
      headers: { ...STREAM, ...authorization },
      signal: controller.signal,
    });
    const reader = response.body?.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    await fetch(`${origin}/v1/config`, { headers: { [HttpHeader.Accept]: MediaType.Json } });
    await readUntil(reader, "config.get");
    const open = (await statsOf()).process.openStreams;
    controller.abort();
    await Bun.sleep(200);
    const closed = await statsOf();
    const stream = Object.entries(closed.operations).find(([key]) =>
      key.includes(MediaType.EventStream),
    );
    expect([open, closed.process.openStreams, (stream?.[1].count ?? 0) > 0]).toEqual([1, 0, true]);
  });

  test("the first byte of a request is measured and never later than the whole response", async () => {
    const { issuer, origin } = await serve();
    const token = await issuer.issue({ scopes: ["admin"] });
    await fetch(`${origin}/v1/config`, { headers: { [HttpHeader.Accept]: MediaType.Json } });
    const snapshot = (await (
      await fetch(`${origin}${EndpointPath.Stats}`, {
        headers: {
          [HttpHeader.Accept]: MediaType.Json,
          [HttpHeader.Authorization]: `Bearer ${token}`,
        },
      })
    ).json()) as StatsSnapshot;
    const config = Object.entries(snapshot.operations).find(([key]) =>
      key.startsWith("config.get"),
    );
    expect([
      (config?.[1].firstByteTotalMs ?? -1) >= 0,
      (config?.[1].firstByteTotalMs ?? 1) <= (config?.[1].totalMs ?? 0),
      config?.[1].firstByteBuckets.reduce((sum, count) => sum + count, 0),
    ]).toEqual([true, true, 1]);
  });

  test("an admin reads the metrics in the text exposition format", async () => {
    const { issuer, origin } = await serve();
    const token = await issuer.issue({ scopes: ["admin"] });
    await fetch(`${origin}/v1/config`, { headers: { [HttpHeader.Accept]: MediaType.Json } });
    const response = await fetch(`${origin}${EndpointPath.Metrics}`, {
      headers: { [HttpHeader.Authorization]: `Bearer ${token}` },
    });
    const text = await response.text();
    expect([response.status, response.headers.get(HttpHeader.ContentType)]).toEqual([
      200,
      EXPOSITION_CONTENT_TYPE,
    ]);
    expect(text).toContain("# TYPE platform_process_resident_memory_bytes gauge");
    expect(text).toContain('platform_http_stage_count_total{stage="route"}');
    expect(text).toContain('platform_capability_calls_total{capability="config.get"} 1');
    expect(text).toContain("platform_http_open_streams");
    expect(text).toContain("platform_operations_running");
    expect(text).toContain("platform_process_heap_collections_inferred_total");
    expect(text).toContain("platform_http_operation_first_byte_seconds_total");
  });

  test("the metrics are refused without a token and without the admin scope", async () => {
    const { issuer, origin } = await serve();
    const token = await issuer.issue({ scopes: ["read"] });
    const anonymous = await fetch(`${origin}${EndpointPath.Metrics}`);
    const reader = await fetch(`${origin}${EndpointPath.Metrics}`, {
      headers: { [HttpHeader.Authorization]: `Bearer ${token}` },
    });
    expect([anonymous.status, reader.status]).toEqual([401, 403]);
  });

  test("without the stream form the same address answers one JSON document", async () => {
    const { issuer, origin } = await serve();
    const token = await issuer.issue({ scopes: ["admin"] });
    const response = await fetch(`${origin}${EndpointPath.Events}`, {
      headers: {
        [HttpHeader.Accept]: MediaType.Json,
        [HttpHeader.Authorization]: `Bearer ${token}`,
      },
    });
    expect([response.status, Object.keys(await response.json())]).toEqual([200, ["events"]]);
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
