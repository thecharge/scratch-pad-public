import { describe, expect, test } from "bun:test";
import { createJwksProvider } from "@platform/auth";
import { CapabilityRegistry, defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CanonicalCode,
  ErrorReason,
  HttpHeader,
  HttpMethod,
  MaskStrategy,
  MethodKind,
} from "@platform/constants";
import { createHttpApp } from "@platform/http-adapter";
import { PathMasker } from "@platform/masking";
import { createPipeline } from "@platform/pipeline";
import { DeclarativePolicyEngine } from "@platform/policy";
import { FixedWindowRateLimiter } from "@platform/ratelimit";
import { createTestIssuer, REPO_ROOT } from "@platform/test-framework";
import type { ApiErrorBody, CapabilityDefinition, HttpApp, JsonObject } from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";

const ORIGIN = "https://api.test";
const BOOK = "publishers/{publisher}/books/{book}";
const COLLECTION = "publishers/{publisher}/books";
const calls: unknown[] = [];
const MASK_EMAIL = { path: "email", strategy: MaskStrategy.Remove };

async function define(overrides: Partial<CapabilityDefinition<z.ZodType, z.ZodType>>) {
  return defineCapability({
    id: "books.x",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: BOOK,
    summary: "s",
    description: "d",
    auth: AuthMode.None,
    input: z.looseObject({}),
    output: z.looseObject({}),
    handler: (input: unknown) => {
      calls.push(input);
      return { echoed: input, email: "a@example.com" };
    },
    ...overrides,
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

const CAPABILITIES = [
  await define({ id: "books.get" }),
  await define({
    id: "books.list",
    method: MethodKind.List,
    input: z.strictObject({ parent: z.string().optional(), pageSize: z.number().optional() }),
  }),
  await define({
    id: "books.create",
    method: MethodKind.Create,
    input: z.strictObject({ parent: z.string(), bookId: z.string(), title: z.string() }),
  }),
  await define({ id: "books.archive", method: MethodKind.Custom, customVerb: "archive" }),
  await define({ id: "books.batchCreate", method: MethodKind.BatchCreate, resource: COLLECTION }),
  await define({
    id: "books.check",
    method: MethodKind.Custom,
    customVerb: "check",
    httpMethod: HttpMethod.Get,
  }),
  await define({
    id: "books.secret",
    method: MethodKind.Custom,
    customVerb: "secret",
    auth: AuthMode.Required,
  }),
  await define({
    id: "books.denied",
    method: MethodKind.Custom,
    customVerb: "denied",
    policy: { requiredScopes: ["write"] },
  }),
  await define({
    id: "books.masked",
    method: MethodKind.Custom,
    customVerb: "masked",
    mask: { rules: [MASK_EMAIL] },
  }),
  await define({
    id: "books.limited",
    method: MethodKind.Custom,
    customVerb: "limited",
    rateLimit: { limit: 1, windowMs: 60000 },
  }),
];

async function serve(authEnabled = false) {
  const registry = new CapabilityRegistry();
  await all(
    CAPABILITIES.map(
      (capability) => async () => registry.register(capability.id, () => capability),
    ),
  );
  const issuer = await createTestIssuer(`${ORIGIN}/api/auth`, ORIGIN);
  const provider = await createJwksProvider({
    issuer: issuer.issuer,
    audience: ORIGIN,
    resource: ORIGIN,
    keys: issuer.keys,
  });
  const invoke = await createPipeline({
    policy: new DeclarativePolicyEngine(),
    masker: new PathMasker(),
    rateLimiter: new FixedWindowRateLimiter(),
  });
  const app = await createHttpApp({
    source: registry,
    invoke,
    auth: { enabled: authEnabled, provider },
    domain: "api.test",
    resource: ORIGIN,
  });
  return { app, issuer };
}

function send(app: HttpApp, method: string, path: string, init: RequestInit = {}) {
  return app.fetch(
    new Request(`${ORIGIN}${path}`, {
      method,
      ...init,
      headers: {
        [HttpHeader.Accept]: "application/json",
        ...Object.fromEntries(new Headers(init.headers)),
      },
    }),
  );
}

const json = (body: unknown): RequestInit => ({
  body: JSON.stringify(body),
  headers: { [HttpHeader.ContentType]: "application/json" },
});

describe("route projection", () => {
  test.each<[string, string, string, RequestInit, unknown]>([
    [
      "get names the resource",
      "GET",
      "/v1/publishers/p1/books/b1",
      {},
      { name: "publishers/p1/books/b1" },
    ],
    [
      "list names the parent and coerces the query",
      "GET",
      "/v1/publishers/p1/books?pageSize=5",
      {},
      { parent: "publishers/p1", pageSize: 5 },
    ],
    [
      "create reads the id from the query-style field and the body",
      "POST",
      "/v1/publishers/p1/books",
      json({ book_id: "b2", title: "T" }),
      { parent: "publishers/p1", bookId: "b2", title: "T" },
    ],
    [
      "an item verb names the resource",
      "POST",
      "/v1/publishers/p1/books/b1:archive",
      {},
      { name: "publishers/p1/books/b1" },
    ],
    [
      "a collection verb names the parent",
      "POST",
      "/v1/publishers/p1/books:batchCreate",
      {},
      { parent: "publishers/p1" },
    ],
    [
      "a read-only verb answers GET",
      "GET",
      "/v1/publishers/p1/books/b1:check",
      {},
      { name: "publishers/p1/books/b1" },
    ],
  ])("%s", async (_name, method, path, init, expected) => {
    const { app } = await serve();
    const response = await send(app, method, path, init);
    expect([response.status, ((await response.json()) as JsonObject).echoed]).toEqual([
      200,
      expected,
    ]);
  });
});

describe("routing failures", () => {
  test.each<[string, string, string, number, ErrorReason]>([
    [
      "an undeclared verb",
      "POST",
      "/v1/publishers/p1/books/b1:nothing",
      404,
      ErrorReason.UnknownVerb,
    ],
    [
      "a declared verb on the wrong resource shape",
      "POST",
      "/v1/publishers/p1:archive",
      404,
      ErrorReason.ResourceNotFound,
    ],
    [
      "an encoded colon in an id",
      "GET",
      "/v1/publishers/p1/books/b%3A1",
      404,
      ErrorReason.ResourceNotFound,
    ],
    [
      "an encoded slash in an id",
      "GET",
      "/v1/publishers/p1/books/b%2F1",
      404,
      ErrorReason.ResourceNotFound,
    ],
    ["an unknown path", "GET", "/v1/nowhere", 404, ErrorReason.ResourceNotFound],
    ["another version", "GET", "/v2/publishers/p1/books/b1", 404, ErrorReason.ResourceNotFound],
    [
      "a GET to a POST-only verb",
      "GET",
      "/v1/publishers/p1/books/b1:archive",
      405,
      ErrorReason.MethodNotAllowed,
    ],
    [
      "a POST to a GET-only verb",
      "POST",
      "/v1/publishers/p1/books/b1:check",
      405,
      ErrorReason.MethodNotAllowed,
    ],
    [
      "a DELETE to a get route",
      "DELETE",
      "/v1/publishers/p1/books/b1",
      405,
      ErrorReason.MethodNotAllowed,
    ],
  ])("%s", async (_name, method, path, status, reason) => {
    const { app } = await serve();
    const response = await send(app, method, path);
    const body = (await response.json()) as ApiErrorBody;
    expect([response.status, body.error.code, body.error.details[0]?.reason]).toEqual([
      status,
      status,
      reason,
    ]);
  });

  test("a 405 names the methods that are allowed", async () => {
    const { app } = await serve();
    const response = await send(app, "GET", "/v1/publishers/p1/books/b1:archive");
    expect(response.headers.get(HttpHeader.Allow)).toBe("POST");
  });
});

describe("request handling", () => {
  test.each<[string, RequestInit, number]>([
    ["unknown body fields are rejected", json({ title: "T", book_id: "x", extra: 1 }), 400],
    ["a body that is not JSON is rejected", { body: "{oops" }, 400],
    ["a body that is not an object is rejected", { body: "[1]" }, 400],
  ])("%s", async (_name, init, status) => {
    const { app } = await serve();
    const response = await send(app, "POST", "/v1/publishers/p1/books", init);
    expect(response.status).toBe(status);
  });
});

describe("security stays in the pipeline", () => {
  test("a policy denial is 403 PERMISSION_DENIED", async () => {
    const { app } = await serve();
    const response = await send(app, "POST", "/v1/publishers/p1/books/b1:denied");
    expect([response.status, ((await response.json()) as ApiErrorBody).error.status]).toEqual([
      403,
      CanonicalCode.PermissionDenied,
    ]);
  });

  test("a masked field is absent from the response", async () => {
    const { app } = await serve();
    const response = await send(app, "POST", "/v1/publishers/p1/books/b1:masked");
    expect(await response.json()).not.toHaveProperty("email");
  });

  test("a rate limit is 429 with Retry-After", async () => {
    const { app } = await serve();
    await send(app, "POST", "/v1/publishers/p1/books/b1:limited");
    const response = await send(app, "POST", "/v1/publishers/p1/books/b1:limited");
    expect([response.status, Number(response.headers.get(HttpHeader.RetryAfter)) > 0]).toEqual([
      429,
      true,
    ]);
  });

  test("a required capability without a token is 401 with a challenge", async () => {
    const { app } = await serve(true);
    const response = await send(app, "POST", "/v1/publishers/p1/books/b1:secret");
    expect([response.status, response.headers.get(HttpHeader.WwwAuthenticate)]).toEqual([
      401,
      expect.stringContaining("resource_metadata"),
    ]);
  });

  test("a required capability with auth disabled is 401 AUTH_NOT_ENABLED", async () => {
    const { app } = await serve(false);
    const response = await send(app, "POST", "/v1/publishers/p1/books/b1:secret");
    expect(((await response.json()) as ApiErrorBody).error.details[0]?.reason).toBe(
      ErrorReason.AuthNotEnabled,
    );
  });

  test("a valid token reaches a required capability", async () => {
    const { app, issuer } = await serve(true);
    const token = await issuer.issue({ scopes: ["read"] });
    const response = await send(app, "POST", "/v1/publishers/p1/books/b1:secret", {
      headers: { [HttpHeader.Authorization]: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
  });

  test("an invalid token is 401 even on an optional or authless route's auth-aware sibling", async () => {
    const { app } = await serve(true);
    const response = await send(app, "POST", "/v1/publishers/p1/books/b1:secret", {
      headers: { [HttpHeader.Authorization]: "Bearer garbage" },
    });
    expect([response.status, response.headers.get(HttpHeader.WwwAuthenticate)]).toEqual([
      401,
      expect.stringContaining("invalid_token"),
    ]);
  });
});

describe("lazy startup", () => {
  test("no capability loads until the first request", async () => {
    const loaded: string[] = [];
    const registry = new CapabilityRegistry();
    await registry.register("books.get", () => {
      loaded.push("books.get");
      return CAPABILITIES[0] as (typeof CAPABILITIES)[number];
    });
    const app = await createHttpApp({
      source: registry,
      invoke: await createPipeline(),
      auth: { enabled: false },
      domain: "d",
      resource: ORIGIN,
    });
    const before = loaded.length;
    await send(app, "GET", "/v1/publishers/p1/books/b1");
    expect([before, loaded]).toEqual([0, ["books.get"]]);
  });
});

describe("the adapter holds no security logic", () => {
  test("its source imports no policy, masking, rate limit or cache implementation", async () => {
    const files = await Array.fromAsync(
      new Bun.Glob("*.ts").scan({ cwd: `${REPO_ROOT}/packages/http-adapter/src` }),
    );
    const sources = await all(
      files
        .filter((file) => !file.endsWith(".test.ts"))
        .map(
          (file) => async () => Bun.file(`${REPO_ROOT}/packages/http-adapter/src/${file}`).text(),
        ),
    );
    expect(sources.join("\n")).not.toMatch(/@platform\/(policy|masking|ratelimit|cache)/);
  });
});
