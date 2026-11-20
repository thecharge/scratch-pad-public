import { expect } from "bun:test";
import { routeFor } from "@platform/aip";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CanonicalCode,
  ErrorMetadataKey,
  ErrorReason,
  HttpHeader,
  HttpMethod,
  MediaType,
  MessageId,
  MethodKind,
  RouteOutcome,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { createHttpApp } from "@platform/http-adapter";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import type { CapabilityDefinition, Invoke } from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";
import { buildInput } from "../../../packages/http-adapter/src/input.ts";
import { errorResponse, routingFailure } from "../../../packages/http-adapter/src/respond.ts";
import { matchRoute } from "../../../packages/http-adapter/src/table.ts";

const ORIGIN = "https://api.test";
const BOOK = "publishers/{publisher}/books/{book}";
const CHALLENGE = { domain: "api.test", resource: ORIGIN, tokenPresented: false };
const JSON_TYPE = { [HttpHeader.ContentType]: MediaType.Json };

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
    handler: () => ({}),
    ...overrides,
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

const GET = await define({ id: "books.get" });
const LIST = await define({
  id: "books.list",
  method: MethodKind.List,
  input: z.strictObject({
    parent: z.string().optional(),
    pageSize: z.number().optional(),
    showDeleted: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});
const CREATE = await define({
  id: "books.create",
  method: MethodKind.Create,
  input: z.strictObject({ parent: z.string(), bookId: z.string(), title: z.string() }),
});
const ARCHIVE = await define({
  id: "books.archive",
  method: MethodKind.Custom,
  customVerb: "archive",
});
const CHECK = await define({
  id: "books.check",
  method: MethodKind.Custom,
  customVerb: "check",
  httpMethod: HttpMethod.Get,
});
const SECRET = await define({
  id: "books.secret",
  method: MethodKind.Custom,
  customVerb: "secret",
  auth: AuthMode.Required,
});

const ALL = [GET, LIST, CREATE, ARCHIVE, CHECK, SECRET];
const ROUTES = await all(ALL.map((capability) => async () => routeFor(capability)));
const [GET_ROUTE, LIST_ROUTE, CREATE_ROUTE, ARCHIVE_ROUTE] = ROUTES;
const PARAMS = { publisher: "p1", book: "b1" };
const LINE_ITEM = z.strictObject({ bookId: z.string(), title: z.string() });
const BATCH_INPUT = z.strictObject({ parent: z.string(), requests: z.array(LINE_ITEM) });
const LINES_TYPE = { headers: { "content-type": "application/x-ndjson" } };
const lines = (...text: string[]) => ({ ...LINES_TYPE, body: text.join("") });
const A_LINE = '{"bookId":"a","title":"A"}\n';
const B_LINE = '{"bookId":"b","title":"B"}';
const TWO_BOOKS = [
  { bookId: "a", title: "A" },
  { bookId: "b", title: "B" },
];

const ok = (output: unknown) => expect.objectContaining({ status: 200, body: output });
const withHeaders = (status: number, headers: object) =>
  expect.objectContaining({ status, headers: expect.objectContaining(headers) });
const errorOf = (status: number, reason: ErrorReason) =>
  expect.objectContaining({ code: status, details: [expect.objectContaining({ reason })] });
const failure = (status: number, reason: ErrorReason) =>
  expect.objectContaining({
    status,
    body: expect.objectContaining({ error: errorOf(status, reason) }),
  });
const CHALLENGED = withHeaders(401, {
  [HttpHeader.WwwAuthenticate]: expect.stringContaining("resource_metadata"),
});
const REQUEST_ID = { headers: { [HttpHeader.RequestId]: "req-7" } };
const GET_POST = { outcome: RouteOutcome.WrongMethod, allowed: ["GET", "POST", "GET"] };

const echo: Invoke = async (capability, input, context) => ({
  output: { id: capability.id, input, requestId: context.requestId, principal: context.principal },
  cacheHit: false,
});
const unauthenticated = new ApiError(
  CanonicalCode.Unauthenticated,
  ErrorReason.TokenMissing,
  MessageId.TokenMissing,
);
const denying: Invoke = async () => {
  throw unauthenticated;
};

const options = (invoke: Invoke = echo, enabled = false) => ({
  source: { list: async () => ALL },
  invoke,
  auth: { enabled },
  domain: "api.test",
  resource: ORIGIN,
});
const call = (method: string, path: string, init: RequestInit = {}) =>
  new Request(`${ORIGIN}${path}`, {
    method,
    ...init,
    headers: { accept: "application/json", ...Object.fromEntries(new Headers(init.headers)) },
  });
const json = (body: unknown): RequestInit => ({
  body: JSON.stringify(body),
  headers: JSON_TYPE,
});
const rateLimited = new ApiError(
  CanonicalCode.ResourceExhausted,
  ErrorReason.RateLimited,
  MessageId.RateLimited,
  {},
  { [ErrorMetadataKey.RetryAfterSeconds]: "7" },
);
const missing = new ApiError(
  CanonicalCode.NotFound,
  ErrorReason.ResourceNotFound,
  MessageId.RouteNotFound,
  { path: "/x" },
);

unit(errorResponse, {
  positive: [
    positive(
      "an API error keeps its HTTP status and reason",
      [missing, CHALLENGE],
      failure(404, ErrorReason.ResourceNotFound),
    ),
    positive(
      "a rate limit carries Retry-After",
      [rateLimited, CHALLENGE],
      withHeaders(429, { [HttpHeader.RetryAfter]: "7" }),
    ),
  ],
  negative: [
    rejected(
      "an unauthenticated error carries the bearer challenge",
      [unauthenticated, CHALLENGE],
      CHALLENGED,
    ),
    rejected(
      "an error that is not an API error is an internal error",
      [new Error("boom"), CHALLENGE],
      expect.objectContaining({ status: 500 }),
    ),
  ],
});

const request = (path: string) =>
  new Request(`${ORIGIN}${path}`, { headers: { accept: "application/json" } });

unit(routingFailure, {
  positive: [
    positive(
      "a wrong method is 405 and lists each allowed method once",
      [GET_POST, request("/v1/x"), CHALLENGE],
      withHeaders(405, { [HttpHeader.Allow]: "GET, POST" }),
    ),
    positive(
      "an unknown verb is 404 UNKNOWN_VERB",
      [
        { outcome: RouteOutcome.UnknownVerb, allowed: [], verb: "nothing" },
        request("/v1/x:nothing"),
        CHALLENGE,
      ],
      failure(404, ErrorReason.UnknownVerb),
    ),
  ],
  negative: [
    rejected(
      "an unmatched path is 404 RESOURCE_NOT_FOUND",
      [{ outcome: RouteOutcome.NotFound, allowed: [] }, request("/v1/x"), CHALLENGE],
      failure(404, ErrorReason.ResourceNotFound),
    ),
    negative("a missing match throws", [undefined, request("/v1/x"), CHALLENGE], {
      name: "TypeError",
    }),
  ],
});

unit(matchRoute, {
  positive: [
    positive(
      "a GET names the item route",
      [ROUTES, HttpMethod.Get, ["publishers", "p1", "books", "b1"]],
      { outcome: RouteOutcome.Matched, index: 0, allowed: [HttpMethod.Get] },
    ),
    positive(
      "a custom verb matches its route and returns the verb",
      [ROUTES, HttpMethod.Post, ["publishers", "p1", "books", "b1:archive"]],
      { outcome: RouteOutcome.Matched, index: 3, allowed: [HttpMethod.Post], verb: "archive" },
    ),
  ],
  negative: [
    rejected(
      "a verb nobody declares is an unknown verb",
      [ROUTES, HttpMethod.Post, ["publishers", "p1", "books", "b1:nothing"]],
      { outcome: RouteOutcome.UnknownVerb, allowed: [], verb: "nothing" },
    ),
    rejected(
      "a declared verb with the wrong method is a wrong method",
      [ROUTES, HttpMethod.Get, ["publishers", "p1", "books", "b1:archive"]],
      { outcome: RouteOutcome.WrongMethod, allowed: [HttpMethod.Post] },
    ),
    rejected(
      "an id with an encoded slash is not found",
      [ROUTES, HttpMethod.Get, ["publishers", "p1", "books", "b%2F1"]],
      { outcome: RouteOutcome.NotFound, allowed: [] },
    ),
    rejected(
      "a malformed percent escape is not found",
      [ROUTES, HttpMethod.Get, ["publishers", "p1", "books", "%E0%A4%A"]],
      { outcome: RouteOutcome.NotFound, allowed: [] },
    ),
    rejected("no segments are not found", [ROUTES, HttpMethod.Get, []], {
      outcome: RouteOutcome.NotFound,
      allowed: [],
    }),
  ],
});

unit(buildInput, {
  positive: [
    positive(
      "a GET names the resource from the path and coerces the query",
      [
        call(HttpMethod.Get, "/v1/publishers/p1/books?pageSize=5&showDeleted=true"),
        LIST_ROUTE,
        LIST.input,
        PARAMS,
      ],
      { parent: "publishers/p1", pageSize: 5, showDeleted: true },
    ),
    positive(
      "repeated keys of a list field become a list",
      [
        call(HttpMethod.Get, "/v1/publishers/p1/books?tags=a&tags=b"),
        LIST_ROUTE,
        LIST.input,
        PARAMS,
      ],
      { parent: "publishers/p1", tags: ["a", "b"] },
    ),
    positive(
      "a body is merged with the path and keys are camel cased",
      [
        call(HttpMethod.Post, "/v1/publishers/p1/books", json({ book_id: "b2", title: "T" })),
        CREATE_ROUTE,
        CREATE.input,
        PARAMS,
      ],
      { parent: "publishers/p1", bookId: "b2", title: "T" },
    ),
    positive(
      "newline-delimited lines become the collection of the input",
      [call(HttpMethod.Post, "/v1/x", lines(A_LINE, B_LINE)), CREATE_ROUTE, BATCH_INPUT, PARAMS],
      { parent: "publishers/p1", requests: TWO_BOOKS },
    ),
    positive(
      "a blank line between lines is skipped",
      [
        call(HttpMethod.Post, "/v1/x", lines(A_LINE, "\n", B_LINE)),
        CREATE_ROUTE,
        BATCH_INPUT,
        PARAMS,
      ],
      { parent: "publishers/p1", requests: [expect.anything(), expect.anything()] },
    ),
    positive(
      "a query key outside the schema stays text",
      [call(HttpMethod.Get, "/v1/publishers/p1/books/b1?extra=7"), GET_ROUTE, GET.input, PARAMS],
      { name: "publishers/p1/books/b1", extra: "7" },
    ),
  ],
  negative: [
    negative(
      "a line that does not match the schema is rejected and named",
      [
        call(HttpMethod.Post, "/v1/x", lines(A_LINE, '{"bookId":"b"}\n')),
        CREATE_ROUTE,
        BATCH_INPUT,
        PARAMS,
      ],
      { reason: ErrorReason.ValidationFailed, message: expect.stringContaining("Line 2") },
    ),
    negative(
      "a line that is not JSON is rejected and named",
      [call(HttpMethod.Post, "/v1/x", lines(A_LINE, "{oops\n")), CREATE_ROUTE, BATCH_INPUT, PARAMS],
      { reason: ErrorReason.ValidationFailed, message: expect.stringContaining("Line 2") },
    ),
    negative(
      "a body that is not JSON is rejected",
      [call(HttpMethod.Post, "/v1/x", { body: "{oops" }), CREATE_ROUTE, CREATE.input, PARAMS],
      { reason: ErrorReason.ValidationFailed },
    ),
    negative(
      "a body that is not an object is rejected",
      [call(HttpMethod.Post, "/v1/x", { body: "[1]" }), CREATE_ROUTE, CREATE.input, PARAMS],
      { reason: ErrorReason.ValidationFailed },
    ),
    rejected(
      "a blank body is an empty input",
      [call(HttpMethod.Post, "/v1/x", { body: "  " }), ARCHIVE_ROUTE, ARCHIVE.input, PARAMS],
      { name: "publishers/p1/books/b1" },
    ),
    rejected(
      "a GET ignores a body",
      [call(HttpMethod.Get, "/v1/x"), GET_ROUTE, GET.input, PARAMS],
      { name: "publishers/p1/books/b1" },
    ),
  ],
});

const fetchOf = (path: string, init: RequestInit = {}, method = HttpMethod.Get) => [
  "fetch",
  call(method, path, init),
];
const wireOf = (id: string, input: object) =>
  expect.objectContaining({ id, input: expect.objectContaining(input) });

unit(createHttpApp, {
  positive: [
    positive(
      "a GET reaches its capability with the name from the path",
      [options()],
      ok(wireOf("books.get", { name: "publishers/p1/books/b1" })),
      fetchOf("/v1/publishers/p1/books/b1"),
    ),
    positive(
      "a custom verb is routed to its capability",
      [options()],
      ok(wireOf("books.archive", { name: "publishers/p1/books/b1" })),
      fetchOf("/v1/publishers/p1/books/b1:archive", {}, HttpMethod.Post),
    ),
    positive(
      "the request id header reaches the context",
      [options()],
      ok(expect.objectContaining({ requestId: "req-7" })),
      fetchOf("/v1/publishers/p1/books/b1", REQUEST_ID),
    ),
  ],
  negative: [
    rejected(
      "an unknown path is 404",
      [options()],
      failure(404, ErrorReason.ResourceNotFound),
      fetchOf("/v1/nowhere"),
    ),
    rejected(
      "another API version is 404",
      [options()],
      failure(404, ErrorReason.ResourceNotFound),
      fetchOf("/v2/publishers/p1/books/b1"),
    ),
    rejected(
      "the wrong method is 405 with Allow",
      [options()],
      withHeaders(405, { [HttpHeader.Allow]: "POST" }),
      fetchOf("/v1/publishers/p1/books/b1:archive"),
    ),
    rejected(
      "a body that is not JSON is 400",
      [options()],
      failure(400, ErrorReason.ValidationFailed),
      fetchOf("/v1/publishers/p1/books", { body: "{oops", headers: JSON_TYPE }, HttpMethod.Post),
    ),
    rejected(
      "an invoke failure that is unauthenticated is 401 with a challenge",
      [options(denying, true)],
      CHALLENGED,
      fetchOf("/v1/publishers/p1/books/b1:secret", {}, HttpMethod.Post),
    ),
  ],
});
