import { afterAll, describe, expect, test } from "bun:test";
import { ErrorReason, HttpHeader, MediaType, MethodKind } from "@platform/constants";
import { waitUntil } from "@platform/test-framework";
import { everything, loggedReads, removeAll, withQuery } from "@platform/test-scenarios";
import { OperationListSchema } from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";
import { createRegistry } from "../../../apps/api/src/registry.ts";
import { assetChecksum } from "../../packages/scenarios/src/asset-fixtures.ts";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const TokenSchema = z.looseObject({ nextPageToken: z.string() });
const DetailSchema = z.looseObject({ reason: z.string() });
const ErrorBodySchema = z.object({ error: z.object({ details: z.array(DetailSchema) }) });
const ContentSchema = z.looseObject({ content: z.record(z.string(), z.unknown()).optional() });
const OperationSchema = z.looseObject({
  operationId: z.string(),
  responses: z.record(z.string(), ContentSchema),
});
const RawDocumentSchema = z.object({
  paths: z.record(z.string(), z.record(z.string(), OperationSchema)),
});

const PARENT = "publishers/acme";
const LISTS: Readonly<Record<string, string>> = {
  "assets.list": "/v1/assets",
  "books.list": `/v1/${PARENT}/books`,
  "skills.list": "/v1/skills",
  "logs.list": "/v1/logs?capability=config.get",
  "operations.list": "/v1/operations",
};
const fixture = await proxyFixture({ enabled: true, assets: true, domain: "api.test" });
const ORIGIN = fixture.origin;
const issuer = fixture.issuer;
const api = { fetch: (request: Request) => fetch(request) };
const admin = await issuer.issue({ scopes: ["read", "write", "admin"] });
const headers = {
  [HttpHeader.Authorization]: `Bearer ${admin}`,
  [HttpHeader.Accept]: MediaType.Json,
  [HttpHeader.ContentType]: MediaType.Json,
};

async function call(method: string, path: string, body?: object) {
  return api.fetch(
    new Request(`${ORIGIN}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
}

await all(
  [1, 2, 3].map((value) => async () => {
    const bytes = new Uint8Array([value]);
    const response = await fetch(`${ORIGIN}/v1/assets`, {
      method: "POST",
      headers: {
        ...headers,
        "content-type": "application/octet-stream",
        "x-content-sha256": assetChecksum(bytes),
      },
      body: bytes,
    });
    if (!response.ok) throw new Error(await response.text());
  }),
);

await call("POST", `/v1/${PARENT}/books`, {
  parent: PARENT,
  bookId: "a",
  title: "A",
  author: "X",
  authorEmail: "x@example.com",
});
await call("POST", `/v1/${PARENT}/books`, {
  parent: PARENT,
  bookId: "b",
  title: "B",
  author: "X",
  authorEmail: "x@example.com",
});
await call("POST", `/v1/${PARENT}/books`, {
  parent: PARENT,
  bookId: "c",
  title: "C",
  author: "X",
  authorEmail: "x@example.com",
});
await call("POST", `/v1/${PARENT}/books:reindex`, {});
await call("POST", `/v1/${PARENT}/books:reindex`, {});
await waitUntil(async () => {
  const page = OperationListSchema.parse(await (await call("GET", "/v1/operations")).json());
  return page.operations.every((operation) => operation.done);
});

const registered = (await (await createRegistry()).list()).filter(
  (capability) => capability.method === MethodKind.List,
);
const raw = RawDocumentSchema.parse(await (await call("GET", "/openapi.json")).json());

async function seedLogs(path: string): Promise<void> {
  const wanted = path.startsWith("/v1/logs") ? [1, 2, 3] : [];
  await all(wanted.map(() => async () => call("GET", "/v1/config")));
  await waitUntil(async () => wanted.length === 0 || (await loggedReads(call)) >= wanted.length);
}

const shapeOf = (schema: z.ZodType | undefined): Record<string, unknown> =>
  schema instanceof z.ZodObject ? schema.shape : {};

afterAll(async () => {
  await finishProxyIntegration();
  await removeAll();
});

describe("every list operation follows AIP-158", () => {
  test("the test knows every list operation of the registry", () => {
    expect(registered.map((capability) => capability.id).sort()).toEqual(Object.keys(LISTS).sort());
  });

  test.each(Object.keys(LISTS))("%s takes a page size and a page token", async (id) => {
    const shape = shapeOf(registered.find((item) => item.id === id)?.input);
    expect([Object.hasOwn(shape, "pageSize"), Object.hasOwn(shape, "pageToken")]).toEqual([
      true,
      true,
    ]);
  });

  test.each(Object.keys(LISTS))("%s answers a next page token", async (id) => {
    const shape = shapeOf(registered.find((item) => item.id === id)?.output);
    expect(Object.hasOwn(shape, "nextPageToken")).toBe(true);
  });

  test.each(Object.entries(LISTS))("%s refuses a negative page size", async (_id, path) => {
    const response = await call("GET", withQuery(path, { pageSize: "-1" }));
    const body = ErrorBodySchema.parse(await response.json());
    expect([response.status, body.error.details[0]?.reason]).toEqual([
      400,
      ErrorReason.InvalidPageSize,
    ]);
  });

  test.each(Object.entries(LISTS))(
    "%s refuses a page token it did not issue",
    async (_id, path) => {
      const response = await call("GET", withQuery(path, { pageToken: "nonsense" }));
      const body = ErrorBodySchema.parse(await response.json());
      expect([response.status, body.error.details[0]?.reason]).toEqual([
        400,
        ErrorReason.InvalidPageToken,
      ]);
    },
  );

  test.each(Object.entries(LISTS))(
    "%s gives the same items page by page as in one page",
    async (_id, path) => {
      await seedLogs(path);
      const whole = (await (await call("GET", path)).json()) as Record<string, unknown>;
      const key = Object.keys(whole).find((name) => Array.isArray(whole[name])) ?? "";
      expect(await everything(call, path)).toEqual(whole[key] as unknown[]);
    },
  );

  test.each(Object.entries(LISTS))(
    "%s has more than one item to page through",
    async (_id, path) => {
      await seedLogs(path);
      expect((await everything(call, path)).length).toBeGreaterThan(1);
    },
  );

  test.each(Object.entries(LISTS))(
    "%s answers one document that is a valid page",
    async (id, path) => {
      await seedLogs(path);
      const output = registered.find((item) => item.id === id)?.output;
      const page = await (await call("GET", path)).json();
      expect(output?.safeParse(page).success).toBe(true);
    },
  );

  test.each(Object.entries(LISTS))("%s ends with an empty next page token", async (_id, path) => {
    const last = TokenSchema.parse(
      await (await call("GET", withQuery(path, { pageSize: "1000" }))).json(),
    );
    expect(last.nextPageToken).toBe("");
  });

  test.each(Object.keys(LISTS))("%s is described as one JSON document, never a stream", (id) => {
    const media = Object.values(raw.paths)
      .flatMap((methods) => Object.values(methods))
      .filter((operation) => operation.operationId === id)
      .flatMap((operation) => Object.keys(operation.responses["200"]?.content ?? {}));
    expect(media).toEqual([MediaType.Json]);
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
