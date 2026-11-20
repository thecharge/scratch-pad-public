import { describe, expect, test } from "bun:test";
import {
  behaviorOf,
  CapabilityRegistry,
  defineCapability,
  fieldBehaviors,
  withBehavior,
} from "@platform/capability";
import { ApiVersion, AuthMode, FieldBehavior, MessageId, MethodKind } from "@platform/constants";
import { thrownBy } from "@platform/test-framework";
import type { Capability, CapabilityDefinition } from "@platform/types";
import { z } from "zod";

const INPUT = z.strictObject({ name: z.string() });

const BASE = {
  id: "books.get",
  version: ApiVersion.V1,
  method: MethodKind.Get,
  resource: "publishers/{publisher}/books/{book}",
  summary: "Get a book",
  description: "Returns one book.",
  auth: AuthMode.None,
  input: INPUT,
  output: z.object({ name: z.string() }),
  handler: ({ name }: z.infer<typeof INPUT>) => ({ name }),
};

async function define(
  overrides: Partial<CapabilityDefinition<z.ZodType, z.ZodType>> = {},
): Promise<Capability> {
  return defineCapability({ ...BASE, ...overrides } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

describe("defineCapability", () => {
  test("returns a frozen capability", async () => {
    expect(Object.isFrozen(await define())).toBe(true);
  });

  test("accepts a custom method that names its verb", async () => {
    expect((await define({ method: MethodKind.Custom, customVerb: "archive" })).customVerb).toBe(
      "archive",
    );
  });

  test.each([
    ["an empty id", { id: "  " }, MessageId.EmptyCapabilityId],
    ["a missing auth mode", { auth: undefined as unknown as AuthMode }, MessageId.MissingAuthMode],
    ["a custom method without a verb", { method: MethodKind.Custom }, MessageId.CustomVerbMismatch],
    ["a verb on a standard method", { customVerb: "archive" }, MessageId.CustomVerbMismatch],
  ])("rejects %s", async (_name, overrides, messageId) => {
    expect(await thrownBy(async () => define(overrides))).toMatchObject({ messageId });
  });
});

describe("CapabilityRegistry", async () => {
  const loads = { count: 0 };
  const registry = new CapabilityRegistry();
  await registry.register("b.get", async () => define({ id: "b.get" }));
  await registry.register("a.get", async () => {
    loads.count += 1;
    return define({ id: "a.get" });
  });

  test("lists capabilities in id order, as MCP tools/list requires", async () => {
    expect((await registry.list()).map((capability) => capability.id)).toEqual(["a.get", "b.get"]);
  });

  test("a capability loads on first use only", async () => {
    const lazy = new CapabilityRegistry();
    const counter = { count: 0 };
    await lazy.register("x.get", async () => {
      counter.count += 1;
      return define({ id: "x.get" });
    });
    const before = counter.count;
    await lazy.get("x.get");
    await lazy.get("x.get");
    expect([before, counter.count]).toEqual([0, 1]);
  });

  test("finds a capability by id", async () => {
    expect((await registry.get("a.get")).id).toBe("a.get");
    expect(await registry.has("c.get")).toBe(false);
  });

  test.each([
    [
      "registering a duplicate id",
      async () => registry.register("a.get", async () => define({ id: "a.get" })),
      MessageId.DuplicateCapability,
    ],
    ["looking up an unknown id", () => registry.get("nope"), MessageId.UnknownCapability],
  ])("fails when %s", async (_name, action, messageId) => {
    expect(await thrownBy(action)).toMatchObject({ messageId });
  });
});

describe("field behavior (AIP-203)", async () => {
  const schema = z.object({
    name: await withBehavior(z.string(), FieldBehavior.Required),
    createTime: await withBehavior(z.string(), FieldBehavior.OutputOnly),
    note: z.string().optional(),
  });

  test("annotations are readable from the schema", async () => {
    expect(await behaviorOf(schema.shape.name)).toBe(FieldBehavior.Required);
    expect(await behaviorOf(schema.shape.note)).toBeUndefined();
  });

  test("an object schema reports only its annotated fields", async () => {
    expect([...(await fieldBehaviors(schema))]).toEqual([
      ["name", FieldBehavior.Required],
      ["createTime", FieldBehavior.OutputOnly],
    ]);
  });
});
