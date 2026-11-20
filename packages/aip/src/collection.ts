import type { Collection } from "@platform/types";
import { z } from "zod";

export async function collectionOf(schema: z.ZodType): Promise<Collection | undefined> {
  const shape = schema instanceof z.ZodObject ? schema.shape : {};
  const arrays = Object.entries(shape).flatMap(([field, value]) =>
    value instanceof z.ZodArray ? [{ field, element: value.element as z.ZodType }] : [],
  );
  return arrays.length === 1 ? arrays[0] : undefined;
}
