import { afterAll, describe, expect, test } from "bun:test";
import {
  CanonicalCode,
  CUSTOM_VERB_SEPARATOR,
  ErrorReason,
  HttpHeader,
  MediaType,
  OPERATION_EVENT_NAME,
} from "@platform/constants";
import { readEvents } from "@platform/streams";
import { ADMIN_SCOPES, READER_SCOPES, tokenFor } from "@platform/test-framework";
import {
  ApiErrorBodySchema,
  type Operation,
  OperationListSchema,
  OperationSchema,
} from "@platform/types";
import { z } from "zod";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const ProgressSchema = z.object({ processed: z.number() });
const PARENT = "publishers/p1";
const STEP_MS = 300;
const shared = await proxyFixture({ enabled: true, domain: "api.test" });
const issuer = shared.issuer;
const admin = (await tokenFor(issuer, ADMIN_SCOPES)) as string;
const reader = (await tokenFor(issuer, READER_SCOPES)) as string;

afterAll(async () => {
  await finishProxyIntegration();
});

async function boot() {
  const server = await proxyFixture({
    enabled: true,
    issuerId: shared.id,
    domain: "api.test",
    reindexStepMs: STEP_MS,
  });
  const call = (
    method: string,
    path: string,
    token: string,
    body: object = {},
    extra: Record<string, string> = {},
  ) =>
    fetch(`${server.origin}${path}`, {
      method,
      headers: {
        [HttpHeader.Authorization]: `Bearer ${token}`,
        [HttpHeader.ContentType]: MediaType.Json,
        ...extra,
      },
      ...(method === "GET" || method === "DELETE" ? {} : { body: JSON.stringify(body) }),
    });
  await call("POST", `/v1/${PARENT}/books?bookId=b1`, admin, { title: "T" });
  const startReindex = async (): Promise<Operation> =>
    OperationSchema.parse(await (await call("POST", `/v1/${PARENT}/books:reindex`, admin)).json());
  return { call, startReindex };
}

const verbPath = (name: string, verb: string) => `/v1/${name}${CUSTOM_VERB_SEPARATOR}${verb}`;
const startGroup = await boot();
const waitGroup = await boot();
const listGroup = await boot();
const lifeGroup = await boot();
const refuseGroup = await boot();
const eventGroup = await boot();
const EVENTS = { [HttpHeader.Accept]: MediaType.EventStream };

describe("the starting call and the get call return one Operation document", () => {
  test("a started operation is not done and has a name under operations", async () => {
    const started = await startGroup.startReindex();
    expect([started.done, started.name.startsWith("operations/op-")]).toEqual([false, true]);
  });

  test("get reports the progress in the metadata", async () => {
    const started = await startGroup.startReindex();
    const read = OperationSchema.parse(
      await (await startGroup.call("GET", `/v1/${started.name}`, admin)).json(),
    );
    expect(read.metadata).toEqual({ parent: PARENT, processed: 0, total: 1 });
  });
});

describe("wait", () => {
  test("returns the finished operation with its response", async () => {
    const started = await waitGroup.startReindex();
    const response = await waitGroup.call("POST", verbPath(started.name, "wait"), admin, {
      timeout: "10s",
    });
    const waited = OperationSchema.parse(await response.json());
    expect([response.status, waited.done, waited.response]).toEqual([200, true, { count: 1 }]);
  });

  test("returns the unfinished operation when the timeout passes first", async () => {
    const started = await waitGroup.startReindex();
    const waited = OperationSchema.parse(
      await (
        await waitGroup.call("POST", verbPath(started.name, "wait"), admin, { timeout: "0.05s" })
      ).json(),
    );
    expect(waited.done).toBe(false);
  });

  test("a timeout that is not a duration is refused", async () => {
    const started = await waitGroup.startReindex();
    const response = await waitGroup.call("POST", verbPath(started.name, "wait"), admin, {
      timeout: "soon",
    });
    expect(response.status).toBe(400);
  });
});

describe("list follows AIP-158", () => {
  test("a page holds the operations and a token, and the token leads to the next page", async () => {
    await listGroup.startReindex();
    await listGroup.startReindex();
    const first = OperationListSchema.parse(
      await (await listGroup.call("GET", "/v1/operations?pageSize=1", admin)).json(),
    );
    const second = OperationListSchema.parse(
      await (
        await listGroup.call(
          "GET",
          `/v1/operations?pageSize=1&pageToken=${first.nextPageToken}`,
          admin,
        )
      ).json(),
    );
    expect([
      first.operations.length,
      first.nextPageToken.length > 0,
      second.operations.length,
    ]).toEqual([1, true, 1]);
  });

  test("the filter keeps only finished operations", async () => {
    const finished = await listGroup.startReindex();
    await listGroup.call("POST", verbPath(finished.name, "wait"), admin, { timeout: "10s" });
    const page = OperationListSchema.parse(
      await (
        await listGroup.call(
          "GET",
          `/v1/operations?filter=${encodeURIComponent("done = true")}`,
          admin,
        )
      ).json(),
    );
    expect(page.operations.every((operation) => operation.done)).toBe(true);
  });

  test("a negative page size is INVALID_PAGE_SIZE", async () => {
    const response = await listGroup.call("GET", "/v1/operations?pageSize=-1", admin);
    const body = ApiErrorBodySchema.parse(await response.json());
    expect([response.status, JSON.stringify(body.error.details)]).toEqual([
      400,
      expect.stringContaining(ErrorReason.InvalidPageSize),
    ]);
  });
});

describe("cancel and delete", () => {
  test("cancel ends a running operation with the CANCELLED error", async () => {
    const started = await lifeGroup.startReindex();
    const cancelled = await lifeGroup.call("POST", verbPath(started.name, "cancel"), admin);
    const read = OperationSchema.parse(
      await (await lifeGroup.call("GET", `/v1/${started.name}`, admin)).json(),
    );
    expect([cancelled.status, read.done, read.error?.status]).toEqual([
      200,
      true,
      CanonicalCode.Cancelled,
    ]);
    expect(JSON.stringify(read.error?.details)).toContain(ErrorReason.OperationCancelled);
  });

  test("the work that was running does not overwrite the cancellation", async () => {
    const started = await lifeGroup.startReindex();
    await lifeGroup.call("POST", verbPath(started.name, "cancel"), admin);
    await Bun.sleep(STEP_MS * 2);
    const read = OperationSchema.parse(
      await (await lifeGroup.call("GET", `/v1/${started.name}`, admin)).json(),
    );
    expect([read.error?.status, read.response]).toEqual([CanonicalCode.Cancelled, undefined]);
  });

  test("delete removes the operation and a later get is OPERATION_NOT_FOUND", async () => {
    const started = await lifeGroup.startReindex();
    const deleted = await lifeGroup.call("DELETE", `/v1/${started.name}`, admin);
    const after = await lifeGroup.call("GET", `/v1/${started.name}`, admin);
    const body = ApiErrorBodySchema.parse(await after.json());
    expect([deleted.status, after.status, JSON.stringify(body.error.details)]).toEqual([
      200,
      404,
      expect.stringContaining(ErrorReason.OperationNotFound),
    ]);
  });

  test("a reader may not cancel or delete", async () => {
    const started = await lifeGroup.startReindex();
    const cancel = await lifeGroup.call("POST", verbPath(started.name, "cancel"), reader);
    const remove = await lifeGroup.call("DELETE", `/v1/${started.name}`, reader);
    expect([cancel.status, remove.status]).toEqual([403, 403]);
  });
});

describe("an error that stops the operation from starting is an AIP-193 response", () => {
  test("a reindex of a parent that is not a publisher creates no operation", async () => {
    const before = OperationListSchema.parse(
      await (await refuseGroup.call("GET", "/v1/operations?pageSize=1000", admin)).json(),
    );
    const response = await refuseGroup.call("POST", "/v1/publishers/Bad%20Id/books:reindex", admin);
    const body = ApiErrorBodySchema.parse(await response.json());
    const after = OperationListSchema.parse(
      await (await refuseGroup.call("GET", "/v1/operations?pageSize=1000", admin)).json(),
    );
    expect([response.status >= 400, body.error.status.length > 0, after.operations.length]).toEqual(
      [true, true, before.operations.length],
    );
  });
});

describe("an operation as an event stream (Accept: text/event-stream)", () => {
  test("the stream carries the operation states until it is done", async () => {
    const operation = await eventGroup.startReindex();
    const response = await eventGroup.call("GET", `/v1/${operation.name}`, admin, {}, EVENTS);
    const events = await Array.fromAsync(readEvents(response.body as ReadableStream<Uint8Array>));
    const states = events.map((event) => OperationSchema.parse(event.data));
    expect([
      response.headers.get(HttpHeader.ContentType),
      events.every((event) => event.event === OPERATION_EVENT_NAME),
      states.at(0)?.done,
      states.at(-1)?.done,
      states.at(-1)?.response,
    ]).toEqual([MediaType.EventStream, true, false, true, { count: 1 }]);
  });

  test("the event ids count up from one and the progress never goes back", async () => {
    const operation = await eventGroup.startReindex();
    const response = await eventGroup.call("GET", `/v1/${operation.name}`, admin, {}, EVENTS);
    const events = await Array.fromAsync(readEvents(response.body as ReadableStream<Uint8Array>));
    const processed = events.map(
      (event) => ProgressSchema.parse(OperationSchema.parse(event.data).metadata).processed,
    );
    expect([
      events.map((event) => event.id),
      processed.every((value, index) => index === 0 || value >= (processed[index - 1] ?? 0)),
    ]).toEqual([events.map((_event, index) => String(index + 1)), true]);
  });

  test("Last-Event-ID continues the numbering", async () => {
    const operation = await eventGroup.startReindex();
    const response = await eventGroup.call(
      "GET",
      `/v1/${operation.name}`,
      admin,
      {},
      {
        ...EVENTS,
        [HttpHeader.LastEventId]: "5",
      },
    );
    const events = await Array.fromAsync(readEvents(response.body as ReadableStream<Uint8Array>));
    expect(events.at(0)?.id).toBe("6");
  });

  test("a missing operation is a JSON error before any stream opens", async () => {
    const response = await eventGroup.call("GET", "/v1/operations/op-missing", admin, {}, EVENTS);
    const body = ApiErrorBodySchema.parse(await response.json());
    expect([response.status, response.headers.get(HttpHeader.ContentType)]).toEqual([
      404,
      MediaType.Json,
    ]);
    expect(JSON.stringify(body.error.details)).toContain(ErrorReason.OperationNotFound);
  });

  test("a client that hangs up leaves the server working", async () => {
    const operation = await eventGroup.startReindex();
    const response = await eventGroup.call("GET", `/v1/${operation.name}`, admin, {}, EVENTS);
    await response.body?.cancel();
    const after = await eventGroup.call("GET", `/v1/${operation.name}`, admin);
    expect(after.status).toBe(200);
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
