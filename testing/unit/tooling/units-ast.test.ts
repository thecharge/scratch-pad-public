import { expect, test } from "bun:test";
import { positive, rejected, unit } from "@platform/test-factories";
import type { AstNode } from "@platform/types";
import { childrenOf, isNode, lineOf } from "../../../tooling/scripts/ast.ts";

const leaf = (type: string, start: number, end: number) => ({ type, start, end });
const FIRST = leaf("A", 0, 1);
const SECOND = leaf("B", 1, 2);

unit(isNode, {
  positive: [
    positive("an object with type, start and end", [FIRST], true),
    positive("extra properties are allowed", [{ ...FIRST, name: "x" }], true),
  ],
  negative: [
    rejected("an object without a range", [{ type: "A" }], false),
    rejected("a string", ["A"], false),
    rejected("an undefined value", [undefined], false),
    rejected("a numeric scalar", [1], false),
    rejected("nested metadata is not a node", [{ start: 0, end: 1 }], false),
    rejected(
      "node-shaped invalid ranges still fail schema validation",
      [{ type: "A", start: "0", end: 1 }],
      false,
    ),
    rejected(
      "a node-shaped invalid tag still fails schema validation",
      [{ type: 1, start: 0, end: 1 }],
      false,
    ),
    rejected("null", [null], false),
  ],
});

unit(childrenOf, {
  positive: [
    positive(
      "node arrays are flattened into children",
      [{ ...leaf("P", 0, 5), body: [FIRST, SECOND] }],
      [FIRST, SECOND],
    ),
    positive("a single node property is a child", [{ ...leaf("P", 0, 5), left: FIRST }], [FIRST]),
  ],
  negative: [
    rejected("a node without nested nodes has none", [{ ...leaf("P", 0, 5), name: "x" }], []),
    rejected("arrays of plain values have none", [{ ...leaf("P", 0, 5), list: [1, "a"] }], []),
  ],
});

unit(lineOf, {
  positive: [
    positive("an offset in the second line", ["a\nb\nc", 2], 2),
    positive("an offset in the third line", ["a\nb\nc", 4], 3),
  ],
  negative: [
    rejected("offset zero is line one", ["a\nb", 0], 1),
    rejected("an empty source is line one", ["", 5], 1),
  ],
});

test.each([
  { ...FIRST, body: [SECOND] },
  { ...FIRST, child: SECOND },
  { ...FIRST, body: [null, "metadata"] },
  { ...FIRST, child: { type: "invalid", start: "bad", end: 1 } },
])("parsed-tree caching preserves validation for %s", async (root) => {
  const cache = new WeakMap<AstNode, AstNode[]>();
  const expected = await childrenOf(root);
  const first = await childrenOf(root, cache);
  expect(first).toEqual(expected);
  expect(await childrenOf(root, cache)).toBe(first);
  expect(await childrenOf(root, new WeakMap())).not.toBe(first);
});
