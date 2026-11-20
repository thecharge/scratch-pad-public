import { expect } from "bun:test";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  EndpointPath,
  ExampleIo,
  MethodKind,
  TransportKind,
} from "@platform/constants";
import { exampleFor, generateOpenApi, openApiApp } from "@platform/openapi";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import type { Capability, CapabilityDefinition, OpenApiDocument } from "@platform/types";
import { z } from "zod";

const BOOK = "publishers/{publisher}/books/{book}";
const OPTIONS = { title: "Library", version: "7" };
const OTHER_OPTIONS = { title: "Shelf", version: "2" };

async function define(overrides: Partial<CapabilityDefinition<z.ZodType, z.ZodType>>) {
  return defineCapability({
    id: "books.x",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: BOOK,
    summary: "summary",
    description: "description",
    auth: AuthMode.Required,
    input: z.strictObject({ name: z.string() }),
    output: z.object({ name: z.string() }),
    handler: () => ({ name: "n" }),
    ...overrides,
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

const GET = await define({ id: "books.get" });
const OPEN = await define({
  id: "books.open",
  method: MethodKind.Custom,
  customVerb: "open",
  auth: AuthMode.None,
});
const TOOL_ONLY = await define({
  id: "books.tool",
  method: MethodKind.Custom,
  customVerb: "tool",
  onlyOver: TransportKind.Mcp,
});
const GET_PATH = "/v1/publishers/{publisher}/books/{book}";
const OPEN_PATH = `${GET_PATH}:open`;
const operationIds = (document: OpenApiDocument) =>
  Object.values(document.paths)
    .flatMap((methods) => Object.values(methods))
    .map((operation) => operation.operationId)
    .sort();

const infoOf = (title: string, version: string) =>
  expect.objectContaining({ info: expect.objectContaining({ title, version }) });
const INFO_LIBRARY = infoOf("Library", "7");
const INFO_SHELF = infoOf("Shelf", "2");
const BATCH_ITEM = z.strictObject({ bookId: z.string() });
const BATCH = await define({
  id: "books.batch",
  method: MethodKind.Create,
  resource: "publishers/{publisher}/books",
  input: z.strictObject({ parent: z.string(), requests: z.array(BATCH_ITEM) }),
});
const PLAIN_CREATE = await define({
  id: "books.make",
  method: MethodKind.Create,
  resource: "publishers/{publisher}/books",
  input: z.strictObject({ parent: z.string(), title: z.string() }),
});
const operationOf = (document: OpenApiDocument, id: string) =>
  Object.values(document.paths)
    .flatMap((methods) => Object.values(methods))
    .find((operation) => operation.operationId === id);
const statusesOf = (id: string) => (document: OpenApiDocument) =>
  Object.keys(operationOf(document, id)?.responses ?? {}).sort();
const bodyTypesOf = (id: string) => (document: OpenApiDocument) =>
  Object.keys(operationOf(document, id)?.requestBody?.content ?? {}).sort();
const headersTalk = (document: OpenApiDocument) =>
  ["Accept", "Content-Type", "406", "415"].every((word) =>
    document.info.description?.includes(word),
  );
const VERSION_31 = expect.objectContaining({ openapi: "3.1.0" });
const EMPTY_PATHS = expect.objectContaining({ paths: {} });
const REQUIRED_SECURITY = [{ bearerAuth: [] }];

unit(generateOpenApi, {
  positive: [
    positive("the info and version are the given ones", [[GET], OPTIONS], INFO_LIBRARY),
    positive("another title gives another document", [[GET], OTHER_OPTIONS], INFO_SHELF),
    positive("the document is OpenAPI 3.1", [[GET, OPEN], OPTIONS], VERSION_31),
    positive(
      "every served capability appears by operation id",
      [[GET, OPEN], OPTIONS],
      seen(operationIds, ["books.get", "books.open"]),
    ),
    positive(
      "every operation answers 406 for an Accept it cannot serve",
      [[GET], OPTIONS],
      seen(statusesOf("books.get"), ["200", "406", "default"]),
    ),
    positive(
      "an operation with a body also answers 415 for a Content-Type it does not read",
      [[PLAIN_CREATE], OPTIONS],
      seen(statusesOf("books.make"), ["200", "406", "415", "default"]),
    ),
    positive(
      "an operation that takes a collection offers newline-delimited JSON as a body",
      [[BATCH], OPTIONS],
      seen(bodyTypesOf("books.batch"), ["application/json", "application/x-ndjson"]),
    ),
    positive(
      "the document says which headers every request sends",
      [[GET], OPTIONS],
      seen(headersTalk, true),
    ),
    positive(
      "a required capability asks for a bearer token",
      [[GET], OPTIONS],
      seen(
        (document: OpenApiDocument) => document.paths[GET_PATH]?.get?.security,
        REQUIRED_SECURITY,
      ),
    ),
  ],
  negative: [
    rejected("no capabilities give no paths", [[], OPTIONS], EMPTY_PATHS),
    rejected(
      "an operation without a body does not answer 415",
      [[GET], OPTIONS],
      seen(statusesOf("books.get"), ["200", "406", "default"]),
    ),
    rejected(
      "an operation without a collection offers only JSON as a body",
      [[PLAIN_CREATE], OPTIONS],
      seen(bodyTypesOf("books.make"), ["application/json"]),
    ),
    rejected(
      "a tool only capability is left out",
      [[GET, TOOL_ONLY], OPTIONS],
      seen(operationIds, ["books.get"]),
    ),
    rejected(
      "a capability without auth declares no security",
      [[OPEN], OPTIONS],
      seen((document: OpenApiDocument) => document.paths[OPEN_PATH]?.post?.security, undefined),
    ),
    negative("a capability that is not a capability throws", [[{}], OPTIONS], {
      name: "TypeError",
    }),
  ],
});

const OBJECT_SCHEMA = z.object({ name: z.string(), count: z.number(), done: z.boolean() });
const OPTIONAL_SCHEMA = z.object({ name: z.string(), note: z.string().optional() });
const ENUM_SCHEMA = z.object({ state: z.enum(["ACTIVE", "ARCHIVED"]) });
const UNION_SCHEMA = z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]);
const LIST_SCHEMA = z.object({ tags: z.array(z.string()) });
const CONST_SCHEMA = z.object({ kind: z.literal("book") });

unit(exampleFor, {
  positive: [
    positive("required scalars get sample values", [OBJECT_SCHEMA, ExampleIo.Output], {
      name: "string",
      count: 0,
      done: false,
    }),
    positive("an enum takes its first value", [ENUM_SCHEMA, ExampleIo.Output], { state: "ACTIVE" }),
    positive("a union takes the sample of its first member", [UNION_SCHEMA, ExampleIo.Output], {
      a: "string",
    }),
    positive("a literal keeps its value", [CONST_SCHEMA, ExampleIo.Input], { kind: "book" }),
  ],
  negative: [
    rejected("an optional field is left out", [OPTIONAL_SCHEMA, ExampleIo.Input], {
      name: "string",
    }),
    rejected("an array field gets an empty sample", [LIST_SCHEMA, ExampleIo.Output], { tags: [] }),
    negative("something that is not a schema throws", [{}, ExampleIo.Output], {
      name: "TypeError",
    }),
  ],
});

const source = (capabilities: Capability[]) => ({ list: async () => capabilities });
const request = (path: string) => new Request(`http://localhost${path}`);
const SERVED_INFO = expect.objectContaining({ status: 200, body: INFO_LIBRARY });
const HAS_GET_PATH = expect.objectContaining({ [GET_PATH]: expect.anything() });
const SERVED_PATHS = expect.objectContaining({
  body: expect.objectContaining({ paths: HAS_GET_PATH }),
});
const NOT_SERVED = expect.objectContaining({ status: 404 });

unit(openApiApp, {
  positive: [
    positive(
      "the document is served at the documented endpoint",
      [source([GET]), OPTIONS],
      SERVED_INFO,
      ["request", request(EndpointPath.OpenApi)],
    ),
    positive(
      "the served document holds the capability paths",
      [source([GET]), OPTIONS],
      SERVED_PATHS,
      ["request", request(EndpointPath.OpenApi)],
    ),
  ],
  negative: [
    rejected("another path is not served", [source([GET]), OPTIONS], NOT_SERVED, [
      "request",
      request("/v1/other"),
    ]),
    rejected("the document is only served for a get", [source([GET]), OPTIONS], NOT_SERVED, [
      "request",
      new Request(`http://localhost${EndpointPath.OpenApi}`, { method: "POST" }),
    ]),
  ],
});
