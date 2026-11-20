import { expect, test } from "bun:test";
import { StructureRule } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import type { AstNode, ParsedComment, StructureViolation } from "@platform/types";
import { parse } from "oxc-parser";
import { checkSource, warnSource } from "../../../tooling/scripts/check-structure.ts";
import {
  commentViolations,
  hygieneViolations,
  lazyWarnings,
  yamlCommentViolations,
} from "../../../tooling/scripts/rules-hygiene.ts";

async function programOf(source: string) {
  const parsed = await parse("a.ts", source, { lang: "ts" });
  return { program: parsed.program as unknown as AstNode, comments: parsed.comments };
}

const rulesOf = (found: StructureViolation[]) => found.map((item) => item.rule);
const linesOf = (found: StructureViolation[]) => found.map((item) => item.line);
const CLEAN = "export async function f(a) { return a; }\n";
const DEEP = "function f(a) { if (a) { for (const x of a) { for (const y of x) { use(y); } } } }\n";
const DEEP_OBJECT = "const a = { b: { c: { d: 1 } } };\n";
const COMMENTED = "const a = 1; // note\n";
const SYNC = "import { readFileSync } from 'node:fs';\nconst a = readFileSync('x');\n";
const EAGER = "const cache = new Map();\n";
const LAZY_MAP = "async function f() { return new Map(); }\n";
const HEAVY = "import { JSDOM } from 'jsdom';\n";
const EAGER_CALL = "const value = compute();\n";
const WRAPPED_CALL = "async function f() { const value = compute(); return value; }\n";
const TEST_LOOP = "for (const a of [1]) { use(a); }\n";
const COMMENT_AT = (start: number): ParsedComment[] => [{ value: " note", start }];
const withComment = await programOf(COMMENTED);
const clean = await programOf(CLEAN);
const sync = await programOf(SYNC);
const eager = await programOf(EAGER);
const lazyMap = await programOf(LAZY_MAP);
const heavy = await programOf(HEAVY);
const eagerCall = await programOf(EAGER_CALL);
const wrappedCall = await programOf(WRAPPED_CALL);

unit(checkSource, {
  positive: [
    positive("clean source has no violations", ["a.ts", CLEAN], seen(rulesOf, [])),
    positive(
      "a loop three levels deep breaks the nesting rule",
      ["a.ts", DEEP],
      seen(rulesOf, [StructureRule.NestingDepth]),
    ),
    positive(
      "an object three levels deep breaks the object rule",
      ["a.ts", DEEP_OBJECT],
      seen(rulesOf, [StructureRule.ObjectDepth]),
    ),
  ],
  negative: [
    rejected(
      "a comment is reported",
      ["a.ts", COMMENTED],
      seen(rulesOf, [StructureRule.NoComments]),
    ),
    rejected("a sync call is reported", ["a.ts", SYNC], seen(rulesOf, [StructureRule.SyncApi])),
    rejected(
      "a loop is reported in a test file only",
      ["a.test.ts", TEST_LOOP],
      seen(rulesOf, [StructureRule.TestControlFlow]),
    ),
    negative("missing source throws", ["a.ts", undefined], {
      message: expect.stringContaining("Undefined"),
    }),
  ],
});

unit(warnSource, {
  positive: [
    positive(
      "a heavy import is warned about",
      ["a.ts", HEAVY],
      seen(rulesOf, [StructureRule.HeavyImport]),
    ),
    positive(
      "a call at module level is warned about",
      ["a.ts", EAGER_CALL],
      seen(rulesOf, [StructureRule.EagerInvocation]),
    ),
  ],
  negative: [
    rejected("a call inside a function is fine", ["a.ts", WRAPPED_CALL], seen(rulesOf, [])),
    rejected("clean source has no warnings", ["a.ts", CLEAN], seen(rulesOf, [])),
  ],
});

unit(lazyWarnings, {
  positive: [
    positive(
      "a heavy import is warned about",
      ["a.ts", HEAVY, heavy.program],
      seen(rulesOf, [StructureRule.HeavyImport]),
    ),
    positive(
      "a module level call is warned about",
      ["a.ts", EAGER_CALL, eagerCall.program],
      seen(rulesOf, [StructureRule.EagerInvocation]),
    ),
  ],
  negative: [
    rejected(
      "a call inside a function is fine",
      ["a.ts", WRAPPED_CALL, wrappedCall.program],
      seen(rulesOf, []),
    ),
    rejected(
      "a path that is exempt is never warned about",
      ["testing/a.ts", HEAVY, heavy.program],
      seen(rulesOf, []),
    ),
  ],
});

unit(hygieneViolations, {
  positive: [
    positive(
      "a sync call is reported",
      ["a.ts", SYNC, sync.program],
      seen(rulesOf, [StructureRule.SyncApi]),
    ),
    positive(
      "a map at module level is reported",
      ["a.ts", EAGER, eager.program],
      seen(rulesOf, [StructureRule.EagerCollection]),
    ),
    positive("the line of the finding is kept", ["a.ts", SYNC, sync.program], seen(linesOf, [2])),
  ],
  negative: [
    rejected(
      "a map inside a function is fine",
      ["a.ts", LAZY_MAP, lazyMap.program],
      seen(rulesOf, []),
    ),
    rejected(
      "the store package may hold maps",
      ["packages/store/src/a.ts", EAGER, eager.program],
      seen(rulesOf, []),
    ),
    rejected("clean source has no findings", ["a.ts", CLEAN, clean.program], seen(rulesOf, [])),
  ],
});

unit(commentViolations, {
  positive: [
    positive(
      "each comment becomes a violation on its line",
      ["a.ts", COMMENTED, withComment.comments],
      seen(linesOf, [1]),
    ),
    positive(
      "the rule is no comments",
      ["a.ts", COMMENTED, COMMENT_AT(13)],
      seen(rulesOf, [StructureRule.NoComments]),
    ),
  ],
  negative: [
    rejected("no comments give no violations", ["a.ts", CLEAN, []], seen(rulesOf, [])),
    rejected(
      "a comment on a later line reports that line",
      ["a.ts", "a;\nb;\n// c\n", COMMENT_AT(7)],
      seen(linesOf, [3]),
    ),
  ],
});

unit(yamlCommentViolations, {
  positive: [
    positive(
      "a comment line is reported with its number",
      ["a.yml", "a: 1\n# note\nb: 2\n"],
      seen(linesOf, [2]),
    ),
    positive(
      "an indented comment is reported",
      ["a.yml", "a:\n  # note\n"],
      seen(rulesOf, [StructureRule.NoComments]),
    ),
  ],
  negative: [
    rejected(
      "a hash inside a value is not a comment",
      ["a.yml", "a: 'x # y'\n"],
      seen(rulesOf, []),
    ),
    rejected("a file without comments is clean", ["a.yml", "a: 1\nb: 2\n"], seen(rulesOf, [])),
  ],
});

test.each([HEAVY, EAGER_CALL, WRAPPED_CALL, CLEAN])(
  "combined structure scan retains separate warning results for %s",
  async (source) => {
    const warnings: StructureViolation[] = [];
    const separate = await checkSource("a.ts", source);
    expect(await checkSource("a.ts", source, warnings)).toEqual(separate);
    expect(warnings).toEqual(await warnSource("a.ts", source));
  },
);
