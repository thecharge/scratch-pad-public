import { afterAll } from "bun:test";
import { UnitRule } from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { UnitCoverage, UnitRef } from "@platform/types";
import {
  areaOf,
  casesOf,
  productUnits,
  suiteCases,
  unitCaseViolations,
  unitDebt,
  unitsOf,
} from "../../../tooling/scripts/check-unit-cases.ts";

const MISSING = "ENOENT";
const source = (file: string, text: string) => ({ file, text });
const ref = (area: string, name: string): UnitRef => ({ area, name, file: `${area}.ts` });
const cases = (
  area: string,
  name: string,
  positiveCount: number,
  negativeCount: number,
  factoryBuilt = true,
): UnitCoverage => ({
  area,
  name,
  positive: positiveCount,
  negative: negativeCount,
  factoryBuilt,
  file: "testing/unit/x.test.ts",
});
const violation = (name: string, rule: UnitRule, detail: string) => ({
  unit: `a/${name}`,
  file: "a.ts",
  rule,
  detail,
});

const SUBJECT = `
export function plain() {}
export const arrow = () => 1;
export const value = 3;
export class Thing {}
function hidden() {}
`;
const SUITE = `
import { unit, positive, negative } from "@platform/test-factories";
import { plain } from "@platform/aip";
import { arrow } from "../../../apps/api/src/x.ts";
unit(plain, { positive: [positive("a", [], 1), positive("b", [], 2)], negative: [negative("c", [], {})] });
unit(arrow, { positive: [{ name: "raw" }], negative: [] });
unit(unknownSubject, { positive: [], negative: [] });
`;

const root = await makeDir();
await writeFiles(root, {
  "packages/a/src/code.ts": "export function one() {}\n",
  "packages/a/src/index.ts": 'export * from "./code.ts";\n',
  "packages/a/src/generated/g.ts": "export function gen() {}\n",
  "tooling/scripts/tool.ts": "export const two = () => 2;\n",
  "testing/unit/a/code.test.ts":
    'import { unit, positive } from "@platform/test-factories";\nimport { one } from "@platform/a";\nunit(one, { positive: [positive("x", [], 1), positive("y", [], 2)], negative: [] });\n',
  "testing/unit-debt.json": '["a/one"]',
});
const emptyRoot = await makeDir();
const badDebt = await makeDir();
await writeFiles(badDebt, { "testing/unit-debt.json": '{"not":"a list"}' });
const brokenDebt = await makeDir();
await writeFiles(brokenDebt, { "testing/unit-debt.json": "{" });
afterAll(removeAll);

unit(areaOf, {
  positive: [
    positive("a platform package", ["@platform/aip"], "aip"),
    positive("a relative path into a package", ["../../../packages/auth/src/x.ts"], "auth"),
    positive("a relative path into an app", ["../../../apps/api/src/x.ts"], "api"),
  ],
  negative: [
    rejected("a node module", ["node:path"], undefined),
    rejected("a path outside the product", ["../../../docs/x.ts"], undefined),
  ],
});

unit(unitsOf, {
  positive: [
    positive(
      "exported functions and arrow constants",
      [source("packages/aip/src/x.ts", SUBJECT)],
      [
        { area: "aip", name: "plain", file: "packages/aip/src/x.ts" },
        { area: "aip", name: "arrow", file: "packages/aip/src/x.ts" },
      ],
    ),
    positive(
      "tooling scripts get the tooling area",
      [source("tooling/scripts/y.ts", "export function run() {}")],
      [{ area: "tooling", name: "run", file: "tooling/scripts/y.ts" }],
    ),
  ],
  negative: [
    rejected(
      "a file with no export has no unit",
      [source("packages/aip/src/z.ts", "function hidden() {}")],
      [],
    ),
    rejected(
      "exported values are not units",
      [source("packages/aip/src/v.ts", "export const value = 3;")],
      [],
    ),
  ],
});

unit(casesOf, {
  positive: [
    positive(
      "counts cases and spots hand-written ones",
      [source("testing/unit/a/x.test.ts", SUITE)],
      [
        {
          area: "aip",
          name: "plain",
          positive: 2,
          negative: 1,
          factoryBuilt: true,
          file: "testing/unit/a/x.test.ts",
        },
        {
          area: "api",
          name: "arrow",
          positive: 1,
          negative: 0,
          factoryBuilt: false,
          file: "testing/unit/a/x.test.ts",
        },
      ],
    ),
    positive(
      "a call named unit on an imported subject",
      [
        source(
          "testing/unit/a/y.test.ts",
          'import { f } from "@platform/aip";\nunit(f, { positive: [], negative: [] });',
        ),
      ],
      [
        {
          area: "aip",
          name: "f",
          positive: 0,
          negative: 0,
          factoryBuilt: true,
          file: "testing/unit/a/y.test.ts",
        },
      ],
    ),
  ],
  negative: [
    rejected(
      "a subject that is not imported from the product",
      [source("testing/unit/a/z.test.ts", "unit(local, { positive: [], negative: [] });")],
      [],
    ),
    rejected("a file without unit calls", [source("testing/unit/a/w.test.ts", "export {};")], []),
  ],
});

unit(unitCaseViolations, {
  positive: [
    positive("a unit with 2 and 2 passes", [[ref("a", "f")], [cases("a", "f", 2, 2)]], []),
    positive(
      "a unit split over two calls passes",
      [[ref("a", "f")], [cases("a", "f", 1, 1), cases("a", "f", 1, 1)]],
      [],
    ),
  ],
  negative: [
    rejected("no cases at all", [[ref("a", "f")], []], [violation("f", UnitRule.MissingCases, "")]),
    rejected(
      "one negative case names the missing kind",
      [[ref("a", "f")], [cases("a", "f", 2, 1)]],
      [violation("f", UnitRule.TooFewNegative, "1")],
    ),
    rejected(
      "one positive case names the missing kind",
      [[ref("a", "f")], [cases("a", "f", 1, 2)]],
      [violation("f", UnitRule.TooFewPositive, "1")],
    ),
    rejected(
      "hand-written cases are refused",
      [[ref("a", "f")], [cases("a", "f", 2, 2, false)]],
      [violation("f", UnitRule.NotFactoryBuilt, "")],
    ),
    rejected(
      "a debt entry for a covered unit is stale",
      [[ref("a", "f")], [cases("a", "f", 2, 2)], ["a/f"]],
      [{ unit: "a/f", file: "testing/unit-debt.json", rule: UnitRule.StaleDebt, detail: "" }],
    ),
    rejected("a listed debt hides the missing cases", [[ref("a", "f")], [], ["a/f"]], []),
  ],
});

unit(productUnits, {
  positive: [
    positive(
      "reads exported functions and skips barrels and generated files",
      [root],
      [
        { area: "a", name: "one", file: "packages/a/src/code.ts" },
        { area: "tooling", name: "two", file: "tooling/scripts/tool.ts" },
      ],
    ),
    positive("an empty repository has none", [emptyRoot], []),
  ],
  negative: [
    negative("a missing repository throws", [`${root}/missing`], { code: MISSING }),
    negative("a nested missing repository throws", [`${root}/missing/deeper`], { code: MISSING }),
  ],
});

unit(suiteCases, {
  positive: [
    positive(
      "reads the unit calls of the suites",
      [root],
      [
        {
          area: "a",
          name: "one",
          positive: 2,
          negative: 0,
          factoryBuilt: true,
          file: "testing/unit/a/code.test.ts",
        },
      ],
    ),
    positive("no suites means no cases", [emptyRoot], []),
  ],
  negative: [
    negative("a missing repository throws", [`${root}/missing`], { code: MISSING }),
    negative("a nested missing repository throws", [`${root}/missing/deeper`], { code: MISSING }),
  ],
});

unit(unitDebt, {
  positive: [
    positive("reads the list", [root], ["a/one"]),
    positive("a missing list is empty", [emptyRoot], []),
  ],
  negative: [
    negative("a list that is not an array is refused", [badDebt], { name: "ZodError" }),
    negative("a list that is not JSON is refused", [brokenDebt], { name: "SyntaxError" }),
  ],
});
