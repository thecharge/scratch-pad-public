import { FieldBehavior } from "@platform/constants";
import { all } from "@platform/util";
import type { ZodObject, ZodType } from "zod";

const SCHEMA_FLAGS: Readonly<Record<FieldBehavior, object>> = {
  [FieldBehavior.Required]: {},
  [FieldBehavior.Optional]: {},
  [FieldBehavior.OutputOnly]: { readOnly: true },
  [FieldBehavior.InputOnly]: { writeOnly: true },
  [FieldBehavior.Immutable]: {},
};

export async function withBehavior<T extends ZodType>(
  schema: T,
  behavior: FieldBehavior,
): Promise<T> {
  return schema.meta({ fieldBehavior: behavior, ...SCHEMA_FLAGS[behavior] }) as T;
}

export async function behaviorOf(schema: ZodType): Promise<FieldBehavior | undefined> {
  return schema.meta()?.fieldBehavior;
}

export async function fieldBehaviors(
  schema: ZodObject,
): Promise<ReadonlyMap<string, FieldBehavior>> {
  const entries = await all(
    Object.entries(schema.shape).map(
      ([name, field]) =>
        async () =>
          [name, await behaviorOf(field as ZodType)] as const,
    ),
  );
  return new Map(
    entries.filter((entry): entry is readonly [string, FieldBehavior] => entry[1] !== undefined),
  );
}
