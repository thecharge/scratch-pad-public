import { afterAll, describe, expect, test } from "bun:test";
import { ErrorReason, HttpHeader, MediaType } from "@platform/constants";
import { chunkedBody, removeAll } from "@platform/test-scenarios";
import { z } from "zod";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const PARENT = "publishers/acme";
const BOOKS = `/v1/${PARENT}/books`;
const NDJSON = "application/x-ndjson";
const DetailSchema = z.looseObject({ reason: z.string() });
const ErrorSchema = z.object({ message: z.string(), details: z.array(DetailSchema) });
const ErrorBodySchema = z.object({ error: ErrorSchema });
const BatchSchema = z.looseObject({ books: z.array(z.looseObject({ name: z.string() })) });
const fixture = await proxyFixture({
  enabled: true,
  domain: "api.test",
});
const token = await fixture.issuer.issue({ scopes: ["read", "write", "admin"] });
const base = fixture.origin;

afterAll(async () => {
  await removeAll();
  await finishProxyIntegration();
});

async function send(path: string, type: string, parts: string[]): Promise<Response> {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      [HttpHeader.Authorization]: `Bearer ${token}`,
      [HttpHeader.Accept]: MediaType.Json,
      [HttpHeader.ContentType]: type,
    },
    body: chunkedBody(parts),
    duplex: "half",
  } as RequestInit);
}

const created = await send(BOOKS, MediaType.Json, [
  '{"parent":"publishers/acme",',
  '"bookId":"chunked","title":"Chunked",',
  '"author":"X","authorEmail":"x@example.com"}',
]);
const createdBody = await created.json();
const batched = await send(`${BOOKS}:batchCreate`, NDJSON, [
  '{"bookId":"n1","title":"One"}\n{"book',
  'Id":"n2","title":"Two"}\n',
  '{"bookId":"n3","title":"Three"}',
]);
const batchedBody = BatchSchema.parse(await batched.json());
const badSchema = await send(`${BOOKS}:batchCreate`, NDJSON, [
  '{"bookId":"m1","title":"One"}\n',
  '{"bookId":"m2","title":"Two"}\n',
  '{"bookId":"m3","title":"Three","unknown":true}\n',
]);
const badSchemaBody = ErrorBodySchema.parse(await badSchema.json());
const badJson = await send(`${BOOKS}:batchCreate`, NDJSON, [
  '{"bookId":"j1","title":"One"}\n',
  "{nope}\n",
]);
const badJsonBody = ErrorBodySchema.parse(await badJson.json());
const wrongPlace = await send(BOOKS, NDJSON, ['{"bookId":"w1","title":"One"}\n']);
const wrongPlaceBody = ErrorBodySchema.parse(await wrongPlace.json());

const afterRefusal = await send(BOOKS, MediaType.Json, [
  '{"parent":"publishers/acme",',
  '"bookId":"after","title":"After","author":"X","authorEmail":"x@example.com"}',
]);
const afterRefusalBody = await afterRefusal.json();
const seen = z
  .array(z.string().nullable())
  .parse(await (await fetch(`${base}/__transferEncodings`)).json());

describe("a refused upload does not disturb the next request on the connection", () => {
  test("the request after a refusal is answered on its own", () => {
    expect([afterRefusal.status, afterRefusalBody]).toEqual([
      200,
      expect.objectContaining({ name: `${PARENT}/books/after` }),
    ]);
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});

describe("a chunked JSON upload", () => {
  test("was sent with Transfer-Encoding chunked", () => {
    expect(seen[0]).toBe("chunked");
  });

  test("is accepted and the operation receives the whole document", () => {
    expect([created.status, createdBody]).toEqual([
      200,
      expect.objectContaining({ name: `${PARENT}/books/chunked`, title: "Chunked" }),
    ]);
  });
});

describe("a newline-delimited collection", () => {
  test("is accepted line by line, even when a line is split across chunks", () => {
    expect([batched.status, batchedBody.books.length]).toEqual([200, 3]);
  });

  test("a line that does not match the schema fails the request and names the line", () => {
    expect([
      badSchema.status,
      badSchemaBody.error.message,
      badSchemaBody.error.details[0]?.reason,
    ]).toEqual([400, expect.stringContaining("Line 3"), ErrorReason.ValidationFailed]);
  });

  test("a line that is not JSON fails the request and names the line", () => {
    expect([badJson.status, badJsonBody.error.message]).toEqual([
      400,
      expect.stringContaining("Line 2"),
    ]);
  });

  test("an operation that takes no collection refuses the form", () => {
    expect([wrongPlace.status, wrongPlaceBody.error.details[0]?.reason]).toEqual([
      415,
      ErrorReason.ContentTypeUnsupported,
    ]);
  });
});
