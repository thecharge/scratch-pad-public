import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  API_EVENT_NAME,
  ASSET_CHECKSUM_HEADER,
  ASSET_UPLOAD_PATH,
  CanonicalCode,
  EndpointPath,
  ErrorReason,
} from "@platform/constants";
import { ADMIN_SCOPES, READER_SCOPES, WRITER_SCOPES } from "@platform/test-framework";
import type { JsonObject } from "@platform/types";
import { bootHttpApi, recordHttpApi } from "./http-api-client.ts";

const BOOKS = "/v1/publishers/acme/books";
afterAll(recordHttpApi);

describe("API over HTTP: book lifecycle", () => {
  test("a book is created, read, changed, archived, deleted and restored", async () => {
    const { call } = await bootHttpApi();
    const created = await call("POST", `${BOOKS}?bookId=dune`, WRITER_SCOPES, { title: "Dune" });
    const read = await call("GET", `${BOOKS}/dune`, READER_SCOPES);
    const changed = await call("PATCH", `${BOOKS}/dune?updateMask=title`, WRITER_SCOPES, {
      title: "Dune Messiah",
    });
    const archived = await call("POST", `${BOOKS}/dune:archive`, WRITER_SCOPES, {});
    const deleted = await call("DELETE", `${BOOKS}/dune`, WRITER_SCOPES);
    const restored = await call("POST", `${BOOKS}/dune:undelete`, WRITER_SCOPES, {});
    expect([created, read, changed, archived, deleted, restored].map((r) => r.status)).toEqual([
      200, 200, 200, 200, 200, 200,
    ]);
    expect([created.body.state, changed.body.title, archived.body.state]).toEqual([
      "ACTIVE",
      "Dune Messiah",
      "ARCHIVED",
    ]);
  });

  test("a list is ordered as asked", async () => {
    const { call } = await bootHttpApi();
    await call("POST", `${BOOKS}?bookId=a`, WRITER_SCOPES, { title: "A" });
    await call("POST", `${BOOKS}?bookId=b`, WRITER_SCOPES, { title: "B" });
    const listed = await call(
      "GET",
      `${BOOKS}?orderBy=${encodeURIComponent("title desc")}`,
      READER_SCOPES,
    );
    expect(listed.body.books.map((book: JsonObject) => book.title)).toEqual(["B", "A"]);
  });
});

describe("API over HTTP: errors follow AIP-193", () => {
  test.each([
    [
      "a missing book",
      "GET",
      `${BOOKS}/none`,
      READER_SCOPES,
      404,
      CanonicalCode.NotFound,
      ErrorReason.ResourceNotFound,
    ],
    [
      "a reader creating",
      "POST",
      `${BOOKS}?bookId=x`,
      READER_SCOPES,
      403,
      CanonicalCode.PermissionDenied,
      ErrorReason.PolicyDenied,
    ],
    [
      "a call without scopes",
      "GET",
      BOOKS,
      [] as string[],
      401,
      CanonicalCode.Unauthenticated,
      ErrorReason.TokenMissing,
    ],
    [
      "a reader reading statistics",
      "GET",
      "/v1/stats",
      READER_SCOPES,
      403,
      CanonicalCode.PermissionDenied,
      ErrorReason.PolicyDenied,
    ],
  ])("%s", async (_name, method, path, scopes, http, status, reason) => {
    const { call } = await bootHttpApi();
    const result = await call(
      method,
      path,
      scopes,
      method === "POST" ? { title: "X" } : undefined,
      http,
    );
    expect([result.status, result.body.error.status, result.body.error.details[0].reason]).toEqual([
      http,
      status,
      reason,
    ]);
  });
});

describe("API over HTTP: versions and documents", () => {
  test.each([
    ["the stable version", "GET", "/v1/config", 200],
    ["the beta version", "POST", "/v1beta/publishers/acme/books:count", 200],
    [
      "the alpha version while its flag is off",
      "POST",
      "/v1alpha/publishers/acme/books:suggest",
      404,
    ],
  ])("%s answers", async (_name, method, path, http) => {
    const { call } = await bootHttpApi();
    const result = await call(method, path, ADMIN_SCOPES, method === "POST" ? {} : undefined, http);
    expect(result.status).toBe(http);
  });

  test("a switched-off alpha capability says so with the reason CAPABILITY_DISABLED", async () => {
    const { call } = await bootHttpApi();
    const result = await call(
      "POST",
      "/v1alpha/publishers/acme/books:suggest",
      ADMIN_SCOPES,
      {},
      404,
    );
    expect(result.body.error.details[0].reason).toBe(ErrorReason.CapabilityDisabled);
  });

  test("the OpenAPI document is served and lists the books path", async () => {
    const { call: request } = await bootHttpApi();
    const { body: document } = await request("GET", EndpointPath.OpenApi, ADMIN_SCOPES);
    expect(Object.keys(document.paths)).toContain("/v1/publishers/{publisher}/books");
  });
});

describe("API over HTTP: batches and parent deletion", () => {
  test("batch creation and retrieval preserve the resources before forced parent deletion", async () => {
    const { call } = await bootHttpApi();
    const created = await call("POST", `${BOOKS}:batchCreate`, WRITER_SCOPES, {
      requests: [
        { bookId: "a", title: "A" },
        { bookId: "b", title: "B" },
      ],
    });
    const batch = await call(
      "GET",
      `${BOOKS}:batchGet?names=publishers/acme/books/a&names=publishers/acme/books/b`,
      READER_SCOPES,
    );
    const removed = await call("DELETE", "/v1/publishers/acme?force=true", WRITER_SCOPES);
    expect([created.body.books.length, batch.body.books.length, removed.body.deletedBooks]).toEqual(
      [2, 2, 2],
    );
  });

  test("NDJSON collection input is validated by line", async () => {
    const { call } = await bootHttpApi();
    const headers = { "content-type": "application/x-ndjson" };
    const created = await call(
      "POST",
      `${BOOKS}:batchCreate`,
      WRITER_SCOPES,
      '{"bookId":"a","title":"A"}\n{"bookId":"b","title":"B"}\n',
      200,
      headers,
      true,
    );
    const invalid = await call(
      "POST",
      `${BOOKS}:batchCreate`,
      WRITER_SCOPES,
      '{"bookId":"c","title":"C"}\n{"title":42}\n',
      400,
      headers,
      true,
    );
    expect([
      created.body.books.length,
      invalid.body.error.message,
      invalid.body.error.details[0].reason,
    ]).toEqual([2, expect.stringContaining("Line 2"), ErrorReason.ValidationFailed]);
  });
});

describe("API over HTTP: administration and operation lifecycle", () => {
  test("configuration, statistics, events, logs and skills are readable by the intended caller", async () => {
    const { call } = await bootHttpApi();
    await call("PATCH", "/v1/config", ADMIN_SCOPES, { bannerText: "Protocol acceptance" });
    const configuration = await call("GET", "/v1/config", []);
    const stats = await call("GET", "/v1/stats", ADMIN_SCOPES);
    const events = await call("GET", "/v1/events", ADMIN_SCOPES);
    const logs = await call("GET", "/v1/logs?pageSize=2", ADMIN_SCOPES);
    const skills = await call("GET", "/v1/skills", ADMIN_SCOPES);
    const skill = await call("GET", "/v1/skills/working-with-books", ADMIN_SCOPES);
    expect([
      configuration.body.bannerText,
      stats.body.total > 0,
      Array.isArray(events.body.events),
      Array.isArray(logs.body.events),
      skills.body.skills.length > 0,
      skill.body.files.length > 0,
    ]).toEqual(["Protocol acceptance", true, true, true, true, true]);
  });

  test("a reindex can be read, listed, awaited, deleted and then reported missing", async () => {
    const { call } = await bootHttpApi();
    await call("POST", `${BOOKS}?bookId=a`, WRITER_SCOPES, { title: "A" });
    const started = await call("POST", `${BOOKS}:reindex`, ADMIN_SCOPES, {});
    const path = `/v1/${started.body.name}`;
    const read = await call("GET", path, ADMIN_SCOPES);
    const listed = await call("GET", "/v1/operations?pageSize=100", ADMIN_SCOPES);
    const waited = await call("POST", `${path}:wait`, ADMIN_SCOPES, { timeout: "5s" });
    await call("DELETE", path, ADMIN_SCOPES);
    const missing = await call("GET", path, ADMIN_SCOPES, undefined, 404);
    expect([
      read.body.name,
      listed.body.operations.some((operation: JsonObject) => operation.name === started.body.name),
      waited.body.done,
      waited.body.response.count,
      missing.body.error.details[0].reason,
    ]).toEqual([started.body.name, true, true, 1, ErrorReason.OperationNotFound]);
  });

  test("cancellation remains the operation error after the worker would have completed", async () => {
    const { call } = await bootHttpApi();
    await call("POST", `${BOOKS}?bookId=a`, WRITER_SCOPES, { title: "A" });
    const started = await call("POST", `${BOOKS}:reindex`, ADMIN_SCOPES, {});
    const path = `/v1/${started.body.name}`;
    await call("POST", `${path}:cancel`, ADMIN_SCOPES, {});
    await Bun.sleep(400);
    const cancelled = await call("GET", path, ADMIN_SCOPES);
    expect([cancelled.body.done, cancelled.body.error.status, cancelled.body.response]).toEqual([
      true,
      CanonicalCode.Cancelled,
      undefined,
    ]);
  });
});

describe("API over HTTP: required-header refusals", () => {
  test.each([
    ["missing Accept", "GET", undefined, { accept: "" }, 400, ErrorReason.AcceptRequired],
    [
      "unsupported Accept",
      "GET",
      undefined,
      { accept: "text/html" },
      406,
      ErrorReason.AcceptUnsupported,
    ],
    [
      "missing Content-Type",
      "POST",
      {},
      { "content-type": "" },
      400,
      ErrorReason.ContentTypeRequired,
    ],
    [
      "unsupported Content-Type",
      "POST",
      {},
      { "content-type": "text/plain" },
      415,
      ErrorReason.ContentTypeUnsupported,
    ],
  ] as const)("%s", async (_name, method, body, headers, status, reason) => {
    const { call } = await bootHttpApi();
    const response = await call(method, `${BOOKS}?bookId=x`, WRITER_SCOPES, body, status, headers);
    expect(response.body.error.details[0].reason).toBe(reason);
  });
});

describe("API over HTTP: event responses and assets", () => {
  test("operation events retain order, resume numbering and the completed result", async () => {
    const { call } = await bootHttpApi();
    await call("POST", `${BOOKS}?bookId=a`, WRITER_SCOPES, { title: "A" });
    const started = await call("POST", `${BOOKS}:reindex`, ADMIN_SCOPES, {});
    const events = await call("GET", `/v1/${started.body.name}`, ADMIN_SCOPES, undefined, 200, {
      accept: "text/event-stream",
      "last-event-id": "40",
    });
    expect(events.body.length).toBeGreaterThan(1);
    expect(events.body.map((event: JsonObject) => event.id)).toEqual(
      events.body.map((_event: JsonObject, index: number) => String(41 + index)),
    );
    expect(events.body.at(-1).data).toMatchObject({ done: true, response: { count: 1 } });
    expect(events.body[0].data.done).toBe(false);
  });

  test("a cancelled operation is an error in its event response", async () => {
    const { call } = await bootHttpApi();
    await call("POST", `${BOOKS}?bookId=a`, WRITER_SCOPES, { title: "A" });
    const started = await call("POST", `${BOOKS}:reindex`, ADMIN_SCOPES, {});
    const path = `/v1/${started.body.name}`;
    await call("POST", `${path}:cancel`, ADMIN_SCOPES, {});
    const events = await call("GET", path, ADMIN_SCOPES, undefined, 200, {
      accept: "text/event-stream",
    });
    expect(events.body.at(-1).data).toMatchObject({
      done: true,
      error: { status: CanonicalCode.Cancelled },
    });
    expect(events.body.at(-1).data.response).toBeUndefined();
  });

  test("streamed asset input preserves its checksum and ownership metadata", async () => {
    const { call } = await bootHttpApi();
    const content = "Protocol acceptance asset\n";
    const checksum = createHash("sha256").update(content).digest("hex");
    const created = await call("POST", ASSET_UPLOAD_PATH, ADMIN_SCOPES, content, 200, {
      "content-type": "application/octet-stream",
      [ASSET_CHECKSUM_HEADER]: checksum,
    });
    const listed = await call("GET", ASSET_UPLOAD_PATH, ADMIN_SCOPES);
    const read = await call("GET", `/v1/${created.body.name}`, ADMIN_SCOPES);
    expect([created.body.sha256, read.body.sha256, read.body.sizeBytes]).toEqual([
      checksum,
      checksum,
      new TextEncoder().encode(content).length,
    ]);
    expect(listed.body.assets.some((asset: JsonObject) => asset.name === created.body.name)).toBe(
      true,
    );
    expect(read.body.downloadUrl).toContain("/assets/");
  });
});

describe("API over HTTP: streamed JSON input", () => {
  test("a JSON document split across upload writes produces one validated resource", async () => {
    const { call } = await bootHttpApi();
    const created = await call(
      "POST",
      `${BOOKS}?bookId=streamed`,
      WRITER_SCOPES,
      '{"title":"Streamed JSON"}',
      200,
      {},
      true,
    );
    const read = await call("GET", `${BOOKS}/streamed`, READER_SCOPES);
    expect([created.body.title, read.body.title]).toEqual(["Streamed JSON", "Streamed JSON"]);
  });
});

describe("API over HTTP: administrator event stream", () => {
  test("a bounded client observes the administrator events in numbered order", async () => {
    const { call } = await bootHttpApi();
    const capture = call(
      "GET",
      "/v1/events",
      ADMIN_SCOPES,
      undefined,
      200,
      { accept: "text/event-stream", "last-event-id": "70" },
      false,
      1,
    );
    await Bun.sleep(100);
    await call("GET", "/v1/config", ADMIN_SCOPES);
    const events = await capture;
    expect(events.body.length).toBeGreaterThan(0);
    expect(events.body.map((event: JsonObject) => event.id)).toEqual(
      events.body.map((_event: JsonObject, index: number) => String(71 + index)),
    );
    expect(events.body[0].event).toBe(API_EVENT_NAME);
  });
});
