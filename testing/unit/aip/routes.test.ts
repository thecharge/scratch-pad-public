import { describe, expect, test } from "bun:test";
import { pathInput, publicPath, routeFor, splitInput } from "@platform/aip";
import { defineCapability } from "@platform/capability";
import { ApiVersion, AuthMode, HttpMethod, MethodKind, PathStyle } from "@platform/constants";
import type { CapabilityDefinition, JsonObject } from "@platform/types";
import { z } from "zod";

const PATTERN = "publishers/{publisher}/books/{book}";
const INPUT = z.strictObject({
  name: z.string().optional(),
  parent: z.string().optional(),
  title: z.string().optional(),
  pageSize: z.number().optional(),
  updateMask: z.string().optional(),
  bookId: z.string().optional(),
});

async function capability(overrides: Partial<CapabilityDefinition<z.ZodType, z.ZodType>>) {
  return defineCapability({
    id: "books.x",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: PATTERN,
    summary: "s",
    description: "d",
    auth: AuthMode.None,
    input: INPUT,
    output: z.object({}),
    handler: () => ({}),
    ...overrides,
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

const verb = { method: MethodKind.Custom, customVerb: "archive" };

describe("route derivation", () => {
  test.each<[string, Partial<CapabilityDefinition<z.ZodType, z.ZodType>>, HttpMethod, string]>([
    ["get", { method: MethodKind.Get }, HttpMethod.Get, "/v1/publishers/{publisher}/books/{book}"],
    ["list", { method: MethodKind.List }, HttpMethod.Get, "/v1/publishers/{publisher}/books"],
    ["create", { method: MethodKind.Create }, HttpMethod.Post, "/v1/publishers/{publisher}/books"],
    [
      "update",
      { method: MethodKind.Update },
      HttpMethod.Patch,
      "/v1/publishers/{publisher}/books/{book}",
    ],
    [
      "delete",
      { method: MethodKind.Delete },
      HttpMethod.Delete,
      "/v1/publishers/{publisher}/books/{book}",
    ],
    ["item verb", verb, HttpMethod.Post, "/v1/publishers/{publisher}/books/{book}:archive"],
    [
      "read-only verb",
      { ...verb, httpMethod: HttpMethod.Get },
      HttpMethod.Get,
      "/v1/publishers/{publisher}/books/{book}:archive",
    ],
    [
      "collection verb",
      { ...verb, resource: "publishers/{publisher}/books" },
      HttpMethod.Post,
      "/v1/publishers/{publisher}/books:archive",
    ],
    [
      "batch get",
      { method: MethodKind.BatchGet },
      HttpMethod.Get,
      "/v1/publishers/{publisher}/books:batchGet",
    ],
    [
      "batch create",
      { method: MethodKind.BatchCreate },
      HttpMethod.Post,
      "/v1/publishers/{publisher}/books:batchCreate",
    ],
  ])("%s", async (_name, overrides, method, path) => {
    const route = await routeFor(await capability(overrides));
    expect([route.method, await publicPath(route, ApiVersion.V1)]).toEqual([method, path]);
  });

  test("the router path uses colon parameters and a verb segment", async () => {
    const route = await routeFor(await capability(verb));
    expect(await publicPath(route, ApiVersion.V1, PathStyle.Router)).toBe(
      "/v1/publishers/:publisher/books/:book/_verbs/archive",
    );
  });
});

describe("path input", () => {
  test.each<[string, Partial<CapabilityDefinition<z.ZodType, z.ZodType>>, JsonObject]>([
    [
      "an item route names the resource",
      { method: MethodKind.Get },
      { name: "publishers/p1/books/b1" },
    ],
    [
      "a collection route names the parent",
      { method: MethodKind.List },
      { parent: "publishers/p1" },
    ],
    ["an item verb names the resource", verb, { name: "publishers/p1/books/b1" }],
    [
      "a collection verb names the parent",
      { ...verb, resource: "publishers/{publisher}/books" },
      { parent: "publishers/p1" },
    ],
    [
      "a top-level collection has no parent",
      { method: MethodKind.List, resource: "publishers/{publisher}" },
      {},
    ],
  ])("%s", async (_name, overrides, expected) => {
    const route = await routeFor(await capability(overrides));
    expect(await pathInput(route, { publisher: "p1", book: "b1" })).toEqual(expected);
  });
});

describe("input split", () => {
  test.each<[string, Partial<CapabilityDefinition<z.ZodType, z.ZodType>>, string[], string[]]>([
    [
      "get sends everything in the query",
      { method: MethodKind.Get },
      ["title", "pageSize", "updateMask", "bookId"],
      [],
    ],
    [
      "create keeps the id in the query",
      { method: MethodKind.Create },
      ["updateMask", "bookId"],
      ["title", "pageSize"],
    ],
    [
      "update keeps only the mask in the query",
      { method: MethodKind.Update },
      ["updateMask"],
      ["title", "pageSize", "bookId"],
    ],
  ])("%s", async (_name, overrides, query, body) => {
    const item = await capability(overrides);
    const split = await splitInput(item, await routeFor(item));
    expect([split.query.sort(), split.body.sort()]).toEqual([query.sort(), body.sort()]);
  });
});

describe("definition rules", () => {
  test("an HTTP method on a standard method is rejected", () => {
    expect(async () =>
      capability({ method: MethodKind.Get, httpMethod: HttpMethod.Post }),
    ).toThrow();
  });
});
