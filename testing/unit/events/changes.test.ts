import { describe, expect, test } from "bun:test";
import { OperationStore } from "@platform/aip";
import { MAX_SUBSCRIBERS, STATE_URI_SCHEME } from "@platform/constants";
import { ChangeFeed, EventBus } from "@platform/events";
import { all } from "@platform/util";
import { IDLE_OBSERVABILITY } from "../../../apps/api/src/idle.ts";

describe("the change feed", () => {
  test("tells every listener the uri that changed", async () => {
    const feed = new ChangeFeed();
    const first: string[] = [];
    const second: string[] = [];
    await feed.subscribe((uri) => first.push(uri));
    await feed.subscribe((uri) => second.push(uri));
    await feed.publish("state://operations/op-1");
    expect([first, second]).toEqual([["state://operations/op-1"], ["state://operations/op-1"]]);
  });

  test("a listener that unsubscribed hears nothing more", async () => {
    const feed = new ChangeFeed();
    const heard: string[] = [];
    const unsubscribe = await feed.subscribe((uri) => heard.push(uri));
    await feed.publish("a");
    await unsubscribe();
    await feed.publish("b");
    expect(heard).toEqual(["a"]);
  });

  test("a listener over the limit is not kept", async () => {
    const feed = new ChangeFeed();
    const heard: string[] = [];
    await all(
      Array.from({ length: MAX_SUBSCRIBERS }, () => async () => feed.subscribe(() => undefined)),
    );
    await (await feed.subscribe((uri) => heard.push(uri)))();
    await feed.publish("a");
    expect(heard).toEqual([]);
  });
});

describe("the operation store tells the feed about every change", () => {
  test("a start, a progress and a result each publish the operation uri", async () => {
    const heard: string[] = [];
    const store = new OperationStore("api.example.com", Date.now, (uri) => heard.push(uri));
    const started = await store.start();
    await store.progress(started.name, { processed: 1 });
    await store.complete(started.name, { count: 1 });
    expect(heard).toEqual(Array.from({ length: 3 }, () => STATE_URI_SCHEME + started.name));
  });
});

describe("the event bus stream", () => {
  const SAMPLE = {
    kind: "request",
    time: "2026-01-02T03:04:05.000Z",
    requestId: "r1",
    capability: "books.get",
    transport: "http",
    principalKind: "user",
    status: 200,
    latencyMs: 1,
    cacheHit: false,
  } as never;

  test("delivers what is published after it opened", async () => {
    const bus = new EventBus();
    const reader = (await bus.stream()).getReader();
    await bus.publish(SAMPLE);
    expect((await reader.read()).value).toEqual(SAMPLE);
  });

  test("stops listening when the reader cancels", async () => {
    const bus = new EventBus();
    const stream = await bus.stream();
    const reader = stream.getReader();
    await reader.cancel();
    await bus.publish(SAMPLE);
    expect((await reader.read()).done).toBe(true);
  });
});

describe("the idle observer", () => {
  test("streams nothing and ends at once", async () => {
    const reader = (await IDLE_OBSERVABILITY.stream()).getReader();
    expect((await reader.read()).done).toBe(true);
  });
});
