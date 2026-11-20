import { describe, expect, test } from "bun:test";
import { defineCapability, withBehavior } from "@platform/capability";
import { ApiVersion, AuthMode, EndpointPath, FieldBehavior, MethodKind } from "@platform/constants";
import { generateOpenApi, openApiApp } from "@platform/openapi";
import {
  type Capability,
  type CapabilityDefinition,
  type JsonObject,
  JsonObjectSchema,
} from "@platform/types";
import { z } from "zod";

const OPTIONS = { title: "T", version: "1" };
const BOOK = "publishers/{publisher}/books/{book}";
const OUTPUT = z.object({
  name: await withBehavior(z.string(), FieldBehavior.OutputOnly),
  secret: await withBehavior(z.string(), FieldBehavior.InputOnly),
});

async function define(
  overrides: Partial<CapabilityDefinition<z.ZodType, z.ZodType>>,
): Promise<Capability> {
  return defineCapability({
    id: "books.x",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: BOOK,
    summary: "summary",
    description: "description",
    auth: AuthMode.Required,
    input: z.strictObject({ name: z.string(), view: z.string().optional() }),
    output: OUTPUT,
    handler: () => ({ name: "n", secret: "s" }),
    ...overrides,
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

const CAPABILITIES = [
  await define({ id: "books.get" }),
  await define({
    id: "books.optional",
    method: MethodKind.Custom,
    customVerb: "peek",
    auth: AuthMode.Optional,
  }),
  await define({
    id: "books.open",
    method: MethodKind.Custom,
    customVerb: "open",
    auth: AuthMode.None,
  }),
  await define({
    id: "books.create",
    method: MethodKind.Create,
    input: z.strictObject({ parent: z.string(), bookId: z.string(), title: z.string() }),
  }),
];

function document() {
  return generateOpenApi(CAPABILITIES, OPTIONS);
}

function jsonBody(schema: JsonObject): JsonObject {
  const media = { schema };
  const content = { "application/json": media };
  return { content };
}

const BEARER_SCHEME = { type: "http", scheme: "bearer", bearerFormat: "JWT" };
const TITLE_PROPERTY = { title: { type: "string" } };
const FIELD_FLAGS = { name: { readOnly: true }, secret: { writeOnly: true } };

describe("document", () => {
  test("declares OpenAPI 3.1.0 with the given info", async () => {
    expect(await document()).toMatchObject({
      openapi: "3.1.0",
      info: { title: "T", version: "1" },
    });
  });

  test("custom methods use their public colon paths", async () => {
    const paths = Object.keys((await document()).paths);
    expect(paths).toContain("/v1/publishers/{publisher}/books/{book}:peek");
  });

  test("every capability appears with its operation id", async () => {
    const operations = Object.values((await document()).paths).flatMap((methods) =>
      Object.values(methods),
    );
    expect(operations.map((operation) => operation.operationId).sort()).toEqual([
      "books.create",
      "books.get",
      "books.open",
      "books.optional",
    ]);
  });

  test("a get sends its fields as query parameters and has no body", async () => {
    const get = (await document()).paths["/v1/publishers/{publisher}/books/{book}"]?.get;
    expect(get).toMatchObject({ parameters: expect.any(Array) });
    expect(get).not.toHaveProperty("requestBody");
  });

  test("a create keeps the id in the query and the rest in the body", async () => {
    const post = (await document()).paths["/v1/publishers/{publisher}/books"]?.post;
    const query = (post?.parameters ?? []).filter((parameter) => parameter.in === "query");
    expect(query.map((parameter) => parameter.name)).toEqual(["bookId"]);
    expect(post?.requestBody).toMatchObject(jsonBody({ properties: TITLE_PROPERTY }));
  });
});

describe("security", () => {
  test("declares one bearer JWT scheme", async () => {
    const schemes = { bearerAuth: BEARER_SCHEME };
    expect((await document()).components).toMatchObject({ securitySchemes: schemes });
  });

  test.each<[string, string, string, JsonObject[] | undefined]>([
    ["required", "/v1/publishers/{publisher}/books/{book}", "get", [{ bearerAuth: [] }]],
    ["optional", "/v1/publishers/{publisher}/books/{book}:peek", "post", [{}, { bearerAuth: [] }]],
    ["none", "/v1/publishers/{publisher}/books/{book}:open", "post", undefined],
  ])("%s", async (_mode, path, method, expected) => {
    expect((await document()).paths[path]?.[method]?.security).toEqual(expected);
  });
});

describe("field behavior", () => {
  test("output-only is readOnly and input-only is writeOnly", async () => {
    const get = (await document()).paths["/v1/publishers/{publisher}/books/{book}"]?.get;
    const schema = JsonObjectSchema.parse(get?.responses["200"]);
    expect(schema).toMatchObject(jsonBody({ properties: FIELD_FLAGS }));
  });
});

describe("serving", () => {
  test("the document is served at the documented endpoint and built on first request", async () => {
    const listed = { count: 0 };
    const source = {
      list: async () => {
        listed.count += 1;
        return CAPABILITIES;
      },
    };
    const app = await openApiApp(source, OPTIONS);
    const before = listed.count;
    const response = await app.request(EndpointPath.OpenApi);
    expect([before, response.status, listed.count, (await response.json()).openapi]).toEqual([
      0,
      200,
      1,
      "3.1.0",
    ]);
  });
});
