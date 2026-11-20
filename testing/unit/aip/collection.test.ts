import { positive, rejected, seen, unit } from "@platform/test-factories";
import type { Collection } from "@platform/types";
import { z } from "zod";
import { collectionOf } from "../../../packages/aip/src/collection.ts";

const ITEM = z.object({ id: z.string() });
const BATCH = z.object({ parent: z.string(), requests: z.array(ITEM) });
const ONLY_LIST = z.object({ ids: z.array(z.string()) });
const NO_LIST = z.object({ name: z.string() });
const TWO_LISTS = z.object({ first: z.array(z.string()), second: z.array(z.string()) });
const field = async (found: Collection | undefined) => found?.field;
const elementKind = async (found: Collection | undefined) => found?.element instanceof z.ZodObject;

unit(collectionOf, {
  positive: [
    positive("names the only array field of a batch input", [BATCH], seen(field, "requests")),
    positive("hands back the schema of one element", [BATCH], seen(elementKind, true)),
    positive("finds a plain list of strings", [ONLY_LIST], seen(field, "ids")),
  ],
  negative: [
    rejected("an input without an array field has no collection", [NO_LIST], undefined),
    rejected("an input with two array fields is ambiguous", [TWO_LISTS], undefined),
    rejected("something that is not an object has no collection", [z.string()], undefined),
    rejected("a missing schema has no collection", [undefined as never], undefined),
  ],
});
