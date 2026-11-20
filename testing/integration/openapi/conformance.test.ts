import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineCapability } from "@platform/capability";
import { ApiVersion, AuthMode, MethodKind, OASDIFF_ARGS } from "@platform/constants";
import { generateOpenApi } from "@platform/openapi";
import { REPO_ROOT } from "@platform/test-framework";
import type { Capability, CapabilityDefinition, OpenApiDocument } from "@platform/types";
import { all } from "@platform/util";
import { validate } from "@readme/openapi-parser";
import { z } from "zod";

const OASDIFF = join(REPO_ROOT, ".tools/bin/oasdiff");
const OPTIONS = { title: "T", version: "1" };
const BOOK = "publishers/{publisher}/books/{book}";
const GET_PATH = "/v1/publishers/{publisher}/books/{book}";
const INPUT = z.strictObject({ name: z.string(), view: z.string().optional() });

async function define(
  output: z.ZodType,
  input: z.ZodType = INPUT,
  method: MethodKind = MethodKind.Get,
): Promise<Capability> {
  return defineCapability({
    id: "books.get",
    version: ApiVersion.V1,
    method,
    resource: BOOK,
    summary: "summary",
    description: "description",
    auth: AuthMode.Required,
    input,
    output,
    handler: () => ({}),
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

const FULL_OUTPUT = z.object({ name: z.string(), count: z.number(), extra: z.string() });
const SLIM_OUTPUT = z.object({ name: z.string(), count: z.number() });

function documentOf(capability: Capability) {
  return generateOpenApi([capability], OPTIONS);
}

async function oasdiffExit(before: OpenApiDocument, after: OpenApiDocument): Promise<number> {
  const directory = await mkdtemp(join(tmpdir(), "oasdiff-"));
  const first = join(directory, "before.json");
  const second = join(directory, "after.json");
  await writeFile(first, JSON.stringify(before));
  await writeFile(second, JSON.stringify(after));
  const child = Bun.spawn([OASDIFF, ...OASDIFF_ARGS, first, second], {
    stdout: "ignore",
    stderr: "ignore",
  });
  return child.exited;
}

describe("generated document conformance", () => {
  test("validates as OpenAPI 3.1", async () => {
    const result = await validate(
      JSON.parse(JSON.stringify(await documentOf(await define(FULL_OUTPUT)))),
    );
    expect(result.valid).toBe(true);
  });

  test("each operation carries generated examples derived from its schemas", async () => {
    const created = await define(
      FULL_OUTPUT,
      z.strictObject({ parent: z.string(), bookId: z.string(), title: z.string() }),
      MethodKind.Create,
    );
    const document = await documentOf(created);
    const post = document.paths["/v1/publishers/{publisher}/books"]?.post;
    const success = JSON.stringify(post?.responses["200"]);
    const body = JSON.stringify(post?.requestBody);
    expect(success).toContain(
      '"examples":{"default":{"value":{"name":"string","count":0,"extra":"string"}}}',
    );
    expect(body).toContain('"examples":{"default":{"value":{"title":"string"}}}');
  });
});

describe("breaking change gate", () => {
  test("removing a response field fails oasdiff", async () => {
    const before = await documentOf(await define(FULL_OUTPUT));
    const after = await documentOf(await define(SLIM_OUTPUT));
    expect(await oasdiffExit(before, after)).not.toBe(0);
  });

  test("an unchanged document passes oasdiff", async () => {
    const before = await documentOf(await define(FULL_OUTPUT));
    expect(await oasdiffExit(before, before)).toBe(0);
  });
});

describe("schema drift", () => {
  test("adding a field changes both the OpenAPI operation and the MCP input schema", async () => {
    const wider = z.strictObject({
      name: z.string(),
      view: z.string().optional(),
      tag: z.string(),
    });
    const [before, after] = (await all([
      async () => documentOf(await define(FULL_OUTPUT)),
      async () => documentOf(await define(FULL_OUTPUT, wider)),
    ])) as [OpenApiDocument, OpenApiDocument];
    const names = (document: OpenApiDocument) =>
      (document.paths[GET_PATH]?.get?.parameters ?? []).map((parameter) => parameter.name);
    const properties = (schema: z.ZodType) => Object.keys(z.toJSONSchema(schema).properties ?? {});
    expect(names(before)).not.toContain("tag");
    expect(names(after)).toContain("tag");
    expect(properties(INPUT)).not.toContain("tag");
    expect(properties(wider)).toContain("tag");
  });
});
