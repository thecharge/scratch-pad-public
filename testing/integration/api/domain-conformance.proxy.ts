import { afterAll, describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KB_CLIENT_REDIRECT, TEST_PROXY_ORIGIN } from "@platform/config/urls";
import {
  BookCapabilityId,
  CANONICAL_CODE_HTTP_STATUS,
  CanonicalCode,
  ErrorReason,
  HttpHeader,
  LogLevel,
  MASK_REPLACEMENT,
  PrincipalKind,
  RATE_LIMIT_PROBE_CALLS,
  TransportKind,
} from "@platform/constants";
import { createDatabase } from "@platform/db";
import { ApiError } from "@platform/errors";
import { createLogger } from "@platform/logger";
import { PathMasker, sensitivePaths } from "@platform/masking";
import { createPipeline } from "@platform/pipeline";
import { DeclarativePolicyEngine } from "@platform/policy";
import { FixedWindowRateLimiter } from "@platform/ratelimit";
import { REPO_ROOT, thrownBy } from "@platform/test-framework";
import {
  ApiErrorBodySchema,
  type CapabilityContext,
  type JsonObject,
  JsonObjectSchema,
  OAuthClientCredentialsSchema,
  type Principal,
  TokenResponseSchema,
} from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";
import { createDeps } from "../../../apps/api/src/deps.ts";
import { IDLE_OBSERVABILITY } from "../../../apps/api/src/idle.ts";
import { createRegistry } from "../../../apps/api/src/registry.ts";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const PARENT = "publishers/p1";
const BOOKS = `/v1/${PARENT}/books`;
const files: string[] = [];

afterAll(async () => {
  await finishProxyIntegration();
  await all(files.map((file) => async () => Bun.file(file).delete()));
});

async function start(enabled = true, databasePath = ":memory:") {
  const fixture = await proxyFixture({ enabled, databasePath, domain: "api.test" });
  const issuer = fixture.issuer;
  const writer = await issuer.issue({ scopes: ["read", "write"] });
  const reader = await issuer.issue({ scopes: ["read"] });
  const admin = await issuer.issue({ scopes: ["read", "write", "admin"] });
  return { base: fixture.origin, issuer, writer, reader, admin };
}

async function send(
  base: string,
  token: string | undefined,
  method: string,
  path: string,
  body?: JsonObject,
) {
  const headers: Record<string, string> = { [HttpHeader.ContentType]: "application/json" };
  const authorization =
    token === undefined ? {} : { [HttpHeader.Authorization]: `Bearer ${token}` };
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...headers, ...authorization },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, json: JsonObjectSchema.parse(await response.json()) };
}

function errorOf(json: JsonObject) {
  return ApiErrorBodySchema.parse(json).error;
}

function reasonOf(json: JsonObject) {
  return errorOf(json).details[0]?.reason;
}

async function createBook(base: string, token: string, bookId: string, extra: JsonObject = {}) {
  return send(base, token, "POST", BOOKS, { bookId, title: `Title ${bookId}`, ...extra });
}

async function listBooks(base: string, token: string, query = "") {
  return send(base, token, "GET", `${BOOKS}${query}`);
}

const REGISTRY = await createRegistry();

async function pipelineFor() {
  return createPipeline({
    policy: new DeclarativePolicyEngine(),
    masker: new PathMasker(),
    rateLimiter: new FixedWindowRateLimiter(),
  });
}
const READER: Principal = { kind: PrincipalKind.User, subject: "u1", scopes: ["read"], roles: [] };
const ADMIN: Principal = { ...READER, scopes: ["read", "write", "admin"] };

function contextFor(principal: Principal): CapabilityContext {
  return { principal, requestId: "r1", transport: TransportKind.Http, authEnabled: true };
}

describe("unknown field", () => {
  test("the HTTP error names the offending field", async () => {
    const { base, writer } = await start();
    const { status, json } = await createBook(base, writer, "b1", { bogusField: 1 });
    expect([status, reasonOf(json), errorOf(json).message]).toEqual([
      400,
      ErrorReason.UnknownField,
      expect.stringContaining("bogusField"),
    ]);
  });

  test("the pipeline error carries the field as a parameter", async () => {
    const pipeline = await pipelineFor();
    const capability = await REGISTRY.get(BookCapabilityId.Create);
    const input = { parent: PARENT, bookId: "b1", title: "t", bogusField: 1 };
    const error = await thrownBy(() => pipeline(capability, input, contextFor(ADMIN)));
    expect(error).toMatchObject({
      reason: ErrorReason.UnknownField,
      params: { field: "bogusField" },
    });
  });
});

describe("create", () => {
  test("a name in the body does not set the resource name", async () => {
    const { base, writer } = await start();
    const { status, json } = await createBook(base, writer, "b1", {
      name: "publishers/p1/books/evil",
    });
    expect([status, json.name]).toEqual([200, `${PARENT}/books/b1`]);
  });

  test.each([
    ["title", { bookId: "b1" }],
    ["bookId", { title: "t" }],
  ])("a missing required %s is REQUIRED_FIELD_MISSING", async (field, body) => {
    const { base, writer } = await start();
    const { status, json } = await send(base, writer, "POST", BOOKS, body);
    expect([status, reasonOf(json), errorOf(json).message]).toEqual([
      400,
      ErrorReason.RequiredFieldMissing,
      expect.stringContaining(field),
    ]);
  });

  test("a batch item missing a required field is REQUIRED_FIELD_MISSING", async () => {
    const { base, writer } = await start();
    const { json } = await send(base, writer, "POST", `${BOOKS}:batchCreate`, {
      requests: [{ bookId: "b1" }],
    });
    expect(reasonOf(json)).toBe(ErrorReason.RequiredFieldMissing);
  });

  test("repeating a request id returns the original and creates one book", async () => {
    const { base, writer } = await start();
    const requestId = crypto.randomUUID();
    const first = await createBook(base, writer, "b1", { requestId });
    const second = await createBook(base, writer, "b1", { requestId });
    const listed = await listBooks(base, writer);
    expect([second.status, second.json, (listed.json.books as unknown[]).length]).toEqual([
      first.status,
      first.json,
      1,
    ]);
  });

  test.each([
    ["an invalid id", { bookId: "BAD:ID", title: "t" }],
    ["a missing title", { bookId: "b1" }],
    ["an unknown field", { bookId: "b1", title: "t", extra: 1 }],
  ])("validateOnly with %s returns the same error as a live request", async (_name, body) => {
    const { base, writer } = await start();
    const preview = await send(base, writer, "POST", BOOKS, { ...body, validateOnly: true });
    const live = await send(base, writer, "POST", BOOKS, body);
    expect([preview.status, preview.json]).toEqual([live.status, live.json]);
  });
});

describe("filters", () => {
  test.each([
    "title = 1; DROP TABLE books",
    "title = 'x' OR 1=1 --",
    "unknownField = 'x'",
    "title = (SELECT 1)",
  ])("the rejected filter %s never reaches the repository", async (filter) => {
    const deps = await createDeps(IDLE_OBSERVABILITY);
    const calls: string[] = [];
    const spied = {
      ...deps,
      books: {
        ...deps.books,
        list: async (parent: string) => {
          calls.push(parent);
          return deps.books.list(parent);
        },
      },
    };
    const capability = await (await createRegistry(spied)).get(BookCapabilityId.List);
    const pipeline = await pipelineFor();
    const error = await thrownBy(() =>
      pipeline(capability, { parent: PARENT, filter }, contextFor(READER)),
    );
    expect([error instanceof ApiError, (error as ApiError).reason, calls]).toEqual([
      true,
      ErrorReason.InvalidFilter,
      [],
    ]);
  });

  test("an accepted filter does reach the repository", async () => {
    const deps = await createDeps(IDLE_OBSERVABILITY);
    const calls: string[] = [];
    const spied = {
      ...deps,
      books: {
        ...deps.books,
        list: async (parent: string) => {
          calls.push(parent);
          return deps.books.list(parent);
        },
      },
    };
    const capability = await (await createRegistry(spied)).get(BookCapabilityId.List);
    const pipeline = await pipelineFor();
    await pipeline(capability, { parent: PARENT, filter: "title = 'x'" }, contextFor(READER));
    expect(calls).toEqual([PARENT]);
  });
});

describe("batchCreate", () => {
  test("a successful batch creates every item", async () => {
    const { base, writer } = await start();
    const batch = await send(base, writer, "POST", `${BOOKS}:batchCreate`, {
      requests: [
        { bookId: "a1", title: "A" },
        { bookId: "a2", title: "B" },
      ],
    });
    const listed = await listBooks(base, writer);
    expect([
      batch.status,
      (batch.json.books as unknown[]).length,
      (listed.json.books as unknown[]).length,
    ]).toEqual([200, 2, 2]);
  });

  test.each([
    [
      "an invalid id",
      [
        { bookId: "n1", title: "A" },
        { bookId: "BAD:ID", title: "B" },
      ],
      ErrorReason.InvalidResourceId,
    ],
    [
      "a duplicate of an existing book",
      [
        { bookId: "n1", title: "A" },
        { bookId: "x1", title: "B" },
      ],
      ErrorReason.ResourceExists,
    ],
    [
      "a duplicate inside the batch",
      [
        { bookId: "n1", title: "A" },
        { bookId: "n1", title: "B" },
      ],
      ErrorReason.ResourceExists,
    ],
  ])("one failing item (%s) leaves nothing created", async (_name, requests, reason) => {
    const { base, writer } = await start();
    await createBook(base, writer, "x1");
    const batch = await send(base, writer, "POST", `${BOOKS}:batchCreate`, { requests });
    const listed = await listBooks(base, writer);
    const names = (listed.json.books as JsonObject[]).map((book) => book.name);
    expect([reasonOf(batch.json), names]).toEqual([reason, [`${PARENT}/books/x1`]]);
  });
});

describe("deleting a parent with children", () => {
  test("without force it fails with a failed precondition and keeps the books", async () => {
    const { base, writer } = await start();
    await createBook(base, writer, "b1");
    const denied = await send(base, writer, "DELETE", `/v1/${PARENT}`);
    const listed = await listBooks(base, writer);
    expect([
      denied.status,
      errorOf(denied.json).status,
      reasonOf(denied.json),
      (listed.json.books as unknown[]).length,
    ]).toEqual([
      CANONICAL_CODE_HTTP_STATUS[CanonicalCode.FailedPrecondition],
      CanonicalCode.FailedPrecondition,
      ErrorReason.HasChildren,
      1,
    ]);
  });

  test("with force the children are soft deleted too", async () => {
    const { base, writer } = await start();
    await createBook(base, writer, "b1");
    await createBook(base, writer, "b2");
    const deleted = await send(base, writer, "DELETE", `/v1/${PARENT}?force=true`);
    const visible = await listBooks(base, writer);
    const all = await listBooks(base, writer, "?showDeleted=true");
    const states = (all.json.books as JsonObject[]).map((book) => typeof book.deleteTime);
    expect([deleted.status, deleted.json, visible.json.books, states]).toEqual([
      200,
      { name: PARENT, deletedBooks: 2 },
      [],
      ["string", "string"],
    ]);
  });

  test("a publisher without books is not found", async () => {
    const { base, writer } = await start();
    const missing = await send(base, writer, "DELETE", "/v1/publishers/none?force=true");
    expect(missing.status).toBe(404);
  });
});

describe("operations that fail to start", () => {
  test("an invalid parent is a normal error, not an operation", async () => {
    const pipeline = await pipelineFor();
    const capability = await REGISTRY.get(BookCapabilityId.Reindex);
    const error = await thrownBy(() =>
      pipeline(capability, { parent: "bogus" }, contextFor(ADMIN)),
    );
    expect(error).toMatchObject({ code: CanonicalCode.InvalidArgument });
  });

  test("a rate limited start is an AIP-193 error without operation fields", async () => {
    const { base, admin } = await start();
    const calls = Array.from(
      { length: RATE_LIMIT_PROBE_CALLS },
      () => async () => send(base, admin, "POST", `${BOOKS}:reindex`),
    );
    const results = await all(calls);
    const refused = results.filter((result) => result.status === 429);
    expect([
      results.length - refused.length,
      refused.length,
      "done" in (refused[0]?.json ?? {}),
    ]).toEqual([RATE_LIMIT_PROBE_CALLS - 1, 1, false]);
    expect(reasonOf(refused[0]?.json ?? {})).toBe(ErrorReason.RateLimited);
  });
});

describe("a denied caller and a missing resource", () => {
  test.each([
    ["a reader", (tokens: Awaited<ReturnType<typeof start>>) => tokens.reader, 403],
    ["a writer", (tokens: Awaited<ReturnType<typeof start>>) => tokens.writer, 404],
  ])("%s archiving a missing book gets %d", async (_name, pick, status) => {
    const tokens = await start();
    const token = pick(tokens);
    const response = await send(tokens.base, token, "POST", `${BOOKS}/missing:archive`);
    expect(response.status).toBe(status);
  });

  test("an anonymous caller gets 401 before the lookup", async () => {
    const { base } = await start();
    const response = await send(base, undefined, "POST", `${BOOKS}/missing:archive`);
    expect(response.status).toBe(401);
  });
});

describe("authentication switch", () => {
  test("with auth off the Better Auth routes are absent and no token is verified", async () => {
    const fixture = await proxyFixture({ enabled: false, authDisabledProbe: true });
    const token = await fixture.issuer.issue();
    const auth = await send(fixture.origin, token, "GET", "/api/auth/ok");
    const config = await send(fixture.origin, token, "GET", "/v1/config");
    const verified = z
      .array(z.string())
      .parse(await (await fetch(`${fixture.origin}/__verified`)).json());
    expect([auth.status, config.status, verified]).toEqual([404, 200, []]);
  });
});

const PASSWORD = "correct-horse-battery-staple";
const ADMIN_EMAIL = "admin@example.com";

async function jwksScenario() {
  const first = await proxyFixture({ enabled: true, domain: "api.test" });
  const second = await proxyFixture({
    enabled: true,
    domain: "api.test",
    issuerId: first.id,
    rejectAudience: true,
  });
  return {
    accepting: first.origin,
    rejecting: second.origin,
    token: await first.issuer.issue({ scopes: ["read"] }),
  };
}

async function betterAuthScenario() {
  const fixture = await proxyFixture({ enabled: true, betterAuth: true });
  const origin = TEST_PROXY_ORIGIN;
  const signUp = await fetch(`${origin}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD, name: ADMIN_EMAIL }),
  });
  const cookie = signUp.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const control = (action: string, input: JsonObject) =>
    fetch(`${fixture.origin}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  const promoted = await control("__admin", { email: ADMIN_EMAIL });
  if (!promoted.ok) throw new Error(await promoted.text());
  const clientOptions = {
    client_name: "machine",
    grant_types: ["client_credentials"],
    redirect_uris: [KB_CLIENT_REDIRECT],
    token_endpoint_auth_method: "client_secret_basic",
    scope: "read",
    client_credentials_scopes: ["read"],
    skip_consent: true,
  };
  const created = await control("__client", { cookie, client: clientOptions });
  const client = OAuthClientCredentialsSchema.parse(await created.json());
  const basic = Buffer.from(`${client.client_id}:${client.client_secret}`).toString("base64");
  const issued = await fetch(`${origin}/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "read",
      resource: origin,
    }),
  });
  const token = TokenResponseSchema.parse(await issued.json()).access_token;
  const accepting = await proxyFixture({
    enabled: true,
    domain: "api.test",
    authFixtureId: fixture.id,
  });
  const rejecting = await proxyFixture({
    enabled: true,
    domain: "api.test",
    authFixtureId: fixture.id,
    rejectAudience: true,
  });
  return { accepting: accepting.origin, rejecting: rejecting.origin, token };
}

describe("provider swap", () => {
  test.each([
    ["jwks", jwksScenario],
    ["better auth", betterAuthScenario],
  ])(
    "the %s provider accepts a valid token and rejects a wrong audience",
    async (_name, scenario) => {
      const { accepting, rejecting, token } = await scenario();
      const accepted = await send(accepting, token, "GET", BOOKS);
      const refused = await send(rejecting, token, "GET", BOOKS);
      expect([accepted.status, refused.status]).toEqual([200, 401]);
    },
  );
});

describe("log redaction", () => {
  test("the logger redacts every path derived from the registry masks", async () => {
    const lines: string[] = [];
    const redact = await sensitivePaths(await REGISTRY.list());
    const logger = await createLogger({
      level: LogLevel.Info,
      redact,
      sink: { write: (line: string) => lines.push(line) },
    });
    logger.info({ authorEmail: "a@example.com", payload: { authorEmail: "b@example.com" } }, "x");
    const logged = JSON.parse(lines[0] ?? "{}");
    expect([
      redact.includes("authorEmail"),
      logged.authorEmail,
      logged.payload.authorEmail,
    ]).toEqual([true, MASK_REPLACEMENT, MASK_REPLACEMENT]);
  });
});

describe("persistence", () => {
  test("no capability imports a driver, the ORM or the db package", async () => {
    const directory = join(REPO_ROOT, "apps/api/src/capabilities");
    const names = await readdir(directory);
    const sources = await all(
      names.map((name) => async () => Bun.file(join(directory, name)).text()),
    );
    const offending = sources.filter((source) =>
      /bun:sqlite|drizzle-orm|@platform\/db/.test(source),
    );
    expect([names.length > 0, offending]).toEqual([true, []]);
  });

  test("with auth off the app runs on a database that has only the application tables", async () => {
    const path = join(tmpdir(), `${crypto.randomUUID()}.sqlite`);
    files.push(path);
    const { sqlite } = await createDatabase(path);
    sqlite.exec(
      "PRAGMA foreign_keys = OFF; DROP TABLE account; DROP TABLE jwks; DROP TABLE oauth_access_token; DROP TABLE oauth_client; DROP TABLE oauth_client_assertion; DROP TABLE oauth_client_resource; DROP TABLE oauth_consent; DROP TABLE oauth_refresh_token; DROP TABLE oauth_resource; DROP TABLE session; DROP TABLE user; DROP TABLE verification;",
    );
    const tables = sqlite
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\'",
      )
      .values()
      .flat()
      .sort();
    sqlite.close();
    const { base } = await start(false, path);
    const config = await send(base, undefined, "GET", "/v1/config");
    const missing = await send(base, undefined, "GET", `${BOOKS}/b1`);
    expect([tables, config.status, missing.status]).toEqual([["app_settings", "books"], 200, 404]);
  });

  test("two in-memory databases are independent and start empty", async () => {
    const first = await createDatabase(":memory:");
    const second = await createDatabase(":memory:");
    first.sqlite
      .query(
        "INSERT INTO books (name, parent, title, state, create_time, update_time, etag) VALUES ('n', 'p', 't', 'ACTIVE', 'c', 'u', 'e')",
      )
      .run();
    const count = (database: typeof first, table: string) =>
      Number(database.sqlite.query(`SELECT count(*) FROM ${table}`).values().flat()[0]);
    const fresh = await createDatabase(":memory:");
    expect([
      count(first, "books"),
      count(second, "books"),
      count(fresh, "books"),
      count(fresh, "app_settings"),
    ]).toEqual([1, 0, 0, 0]);
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
