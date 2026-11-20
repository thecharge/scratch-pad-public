import {
  applyUpdateMask,
  applyView,
  assertBatchSize,
  assertRequired,
  atomically,
  batchGet,
  collectBehaviors,
  isDeleted,
  maskPathsOf,
  parseFieldMask,
  selectFields,
  softDelete,
  transition,
  undelete,
  validateFieldMask,
} from "@platform/aip";
import { withBehavior } from "@platform/capability";
import {
  BATCH_MAX_ITEMS,
  CanonicalCode,
  ErrorReason,
  FieldBehavior,
  ResourceView,
} from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { z } from "zod";

const setOf = (items: string[] = []) => new Set(items);
const mapOf = (entries: [string, unknown][] = []) => new Map(entries);
const NESTED = z.object({
  o: z.object({ x: await withBehavior(z.string(), FieldBehavior.Required) }),
});
const PICKED = { title: "old", meta: { rank: 1 } };
const OPTIONAL_NESTED = z.object({ o: z.object({ x: z.string() }).optional() });
const NOW = new Date("2026-01-01T00:00:00.000Z");
const DAY = 86_400_000;
const SCHEMA = z.object({
  name: await withBehavior(z.string(), FieldBehavior.Immutable),
  title: await withBehavior(z.string(), FieldBehavior.Required),
  createTime: await withBehavior(z.string(), FieldBehavior.OutputOnly),
  meta: z.object({ rank: z.number() }).optional(),
});
const RULES = { behaviors: await collectBehaviors(SCHEMA), fieldMask: undefined } as never;
const CURRENT = { name: "n", title: "old", createTime: "t0", meta: { rank: 1 } };
const BAD_MASK = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidFieldMask };
const IMMUTABLE = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.FieldImmutable };
const MISSING_FIELD = {
  code: CanonicalCode.InvalidArgument,
  reason: ErrorReason.RequiredFieldMissing,
};
const BAD_BATCH = { code: CanonicalCode.InvalidArgument };
const TRANSITION = {
  code: CanonicalCode.FailedPrecondition,
  reason: ErrorReason.InvalidTransition,
};
const EXISTS = { code: CanonicalCode.AlreadyExists };
const NOT_FOUND = { code: CanonicalCode.NotFound, reason: ErrorReason.ResourceNotFound };

unit(parseFieldMask, {
  positive: [
    positive("paths are split and trimmed", ["title, meta.rank"], ["title", "meta.rank"]),
    positive("repeated paths are kept once", ["a,a,b"], ["a", "b"]),
  ],
  negative: [
    rejected("no text means no mask", [undefined], undefined),
    rejected("blank text means no mask", ["   "], undefined),
  ],
});

unit(maskPathsOf, {
  positive: [
    positive(
      "top-level and nested paths",
      [SCHEMA],
      setOf(["name", "title", "createTime", "meta", "meta.rank"]),
    ),
    positive("a prefix is prepended", [z.object({ a: z.string() }), "root"], setOf(["root.a"])),
  ],
  negative: [
    rejected("an empty object has no paths", [z.object({})], setOf()),
    rejected(
      "an optional object still contributes its children",
      [OPTIONAL_NESTED],
      setOf(["o", "o.x"]),
    ),
  ],
});

unit(validateFieldMask, {
  positive: [
    positive("an allowed path passes", [["title"], setOf(["title"])], undefined),
    positive("the full replacement mask passes", [["*"], setOf()], undefined),
  ],
  negative: [
    negative("a path that is not allowed", [["secret"], setOf(["title"])], BAD_MASK),
    negative("an index segment", [["items.0"], setOf(["items.0"])], BAD_MASK),
  ],
});

unit(collectBehaviors, {
  positive: [
    positive(
      "every declared behavior by path",
      [SCHEMA],
      mapOf([
        ["name", FieldBehavior.Immutable],
        ["title", FieldBehavior.Required],
        ["createTime", FieldBehavior.OutputOnly],
      ]),
    ),
    positive("nested fields are prefixed", [NESTED], mapOf([["o.x", FieldBehavior.Required]])),
  ],
  negative: [
    rejected("a schema without behaviors has none", [z.object({ a: z.string() })], mapOf()),
    rejected("an empty schema has none", [z.object({})], mapOf()),
  ],
});

unit(selectFields, {
  positive: [
    positive("only the listed paths", [CURRENT, ["title", "meta.rank"]], PICKED),
    positive("a missing path is skipped", [CURRENT, ["title", "ghost"]], { title: "old" }),
  ],
  negative: [
    rejected("no paths return the whole resource", [CURRENT, undefined], CURRENT),
    rejected("an empty list returns the whole resource", [CURRENT, []], CURRENT),
  ],
});

unit(applyView, {
  positive: [
    positive("the full view returns everything", [CURRENT, ResourceView.Full, ["title"]], CURRENT),
    positive("the basic view returns the basic fields", [CURRENT, ResourceView.Basic, ["title"]], {
      title: "old",
    }),
  ],
  negative: [
    rejected(
      "a basic view with no basic fields returns everything",
      [CURRENT, ResourceView.Basic, []],
      CURRENT,
    ),
    rejected("a basic view skips absent fields", [CURRENT, ResourceView.Basic, ["ghost"]], {}),
  ],
});

unit(applyUpdateMask, {
  positive: [
    positive("a masked field is replaced", [CURRENT, { title: "new" }, ["title"], RULES], {
      ...CURRENT,
      title: "new",
    }),
    positive(
      "no mask applies every provided field",
      [CURRENT, { title: "new" }, undefined, RULES],
      { ...CURRENT, title: "new" },
    ),
    positive(
      "an output-only field is ignored",
      [CURRENT, { createTime: "x", title: "new" }, ["createTime", "title"], RULES],
      { ...CURRENT, title: "new" },
    ),
  ],
  negative: [
    negative(
      "an immutable field changed",
      [CURRENT, { name: "other" }, ["name"], RULES],
      IMMUTABLE,
    ),
    rejected(
      "an immutable field sent unchanged is kept",
      [CURRENT, { name: "n" }, ["name"], RULES],
      CURRENT,
    ),
    rejected(
      "a field absent from the patch is untouched",
      [CURRENT, {}, ["title"], RULES],
      CURRENT,
    ),
  ],
});

unit(assertRequired, {
  positive: [
    positive("every required field present", [SCHEMA, { title: "t" }], undefined),
    positive(
      "optional fields may be absent",
      [z.object({ a: z.string().optional() }), {}],
      undefined,
    ),
  ],
  negative: [
    negative("a required field missing", [SCHEMA, {}], MISSING_FIELD),
    negative("a required field null", [SCHEMA, { title: null }], MISSING_FIELD),
  ],
});

unit(softDelete, {
  positive: [
    positive("delete and purge times are set", [{ a: 1 }, NOW, DAY], {
      a: 1,
      deleteTime: "2026-01-01T00:00:00.000Z",
      purgeTime: "2026-01-02T00:00:00.000Z",
    }),
    positive("a zero retention purges at once", [{}, NOW, 0], {
      deleteTime: "2026-01-01T00:00:00.000Z",
      purgeTime: "2026-01-01T00:00:00.000Z",
    }),
  ],
  negative: [
    negative("an invalid date throws", [{}, new Date("x"), DAY], { name: "RangeError" }),
    negative("a non-date throws", [{}, undefined, DAY], { name: "TypeError" }),
  ],
});

unit(isDeleted, {
  positive: [
    positive("a delete time means deleted", [{ deleteTime: "t" }], true),
    positive("an empty-string delete time still means deleted", [{ deleteTime: "" }], true),
  ],
  negative: [
    rejected("no delete time means live", [{ a: 1 }], false),
    rejected("an undefined delete time means live", [{ deleteTime: undefined }], false),
  ],
});

unit(undelete, {
  positive: [
    positive(
      "delete and purge times are dropped",
      [{ a: 1, deleteTime: "t", purgeTime: "u" }, "n"],
      { a: 1 },
    ),
    positive("other fields stay", [{ deleteTime: "t", b: 2 }, "n"], { b: 2 }),
  ],
  negative: [
    negative("a live resource", [{ a: 1 }, "books/b1"], EXISTS),
    negative("an empty resource", [{}, "books/b2"], EXISTS),
  ],
});

unit(transition, {
  positive: [
    positive("an allowed move returns the target", ["ACTIVE", "ARCHIVED", ["ACTIVE"]], "ARCHIVED"),
    positive("any listed origin is allowed", ["DRAFT", "ACTIVE", ["DRAFT", "ACTIVE"]], "ACTIVE"),
  ],
  negative: [
    negative("a move from another state", ["ARCHIVED", "ACTIVE", ["DRAFT"]], TRANSITION),
    negative("no origin is allowed", ["ACTIVE", "ARCHIVED", []], TRANSITION),
  ],
});

unit(assertBatchSize, {
  positive: [
    positive("one item", [1], undefined),
    positive("the largest batch", [BATCH_MAX_ITEMS], undefined),
  ],
  negative: [
    negative("an empty batch", [0], BAD_BATCH),
    negative("one more than the largest batch", [BATCH_MAX_ITEMS + 1], {
      ...BAD_BATCH,
      reason: ErrorReason.BatchTooLarge,
    }),
  ],
});

const loadFrom = (known: Record<string, number>) => async (name: string) => known[name];

unit(batchGet, {
  positive: [
    positive("items come back in order", [["a", "b"], loadFrom({ a: 1, b: 2 })], [1, 2]),
    positive("the same name twice loads twice", [["a", "a"], loadFrom({ a: 1 })], [1, 1]),
  ],
  negative: [
    negative("an absent item names itself", [["a", "ghost"], loadFrom({ a: 1 })], NOT_FOUND),
    negative("an empty list is refused", [[], loadFrom({})], BAD_BATCH),
  ],
});

const applyTo = (limit: number) => async (item: number) =>
  item > limit ? Promise.reject(new Error("too big")) : item * 10;
const undoTo = async () => undefined;

unit(atomically, {
  positive: [
    positive(
      "every item is applied and results are in order",
      [[1, 2], applyTo(5), undoTo],
      [10, 20],
    ),
    positive("a single item", [[3], applyTo(5), undoTo], [30]),
  ],
  negative: [
    negative(
      "a failing item undoes the earlier ones and rethrows",
      [[1, 2, 9], applyTo(5), undoTo],
      { message: "too big" },
    ),
    negative("an empty batch is refused", [[], applyTo(5), undoTo], BAD_BATCH),
  ],
});
