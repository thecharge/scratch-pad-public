import { afterAll, expect } from "bun:test";
import { TestingRule } from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  outsideReason,
  outsideViolations,
  productSources,
  stackViolations,
  testingManifests,
} from "../../../tooling/scripts/check-testing-area.ts";

const MISSING = "ENOENT";
const source = (file: string, text: string) => ({ file, text });
const manifest = (name: string, deps: string[]) =>
  source(
    `testing/packages/${name}/package.json`,
    JSON.stringify({
      name: `@platform/${name}`,
      dependencies: Object.fromEntries(deps.map((dep) => [dep, "workspace:*"])),
    }),
  );
const outside = (file: string, detail: string) => ({
  file,
  rule: TestingRule.OutsideArea,
  detail,
});

const root = await makeDir();
await writeFiles(root, {
  "packages/a/src/code.ts": "export const a = 1;\n",
  "packages/a/src/code.test.ts": "export const b = 1;\n",
  "packages/a/generated/skip.test.ts": "export const c = 1;\n",
  "apps/docs/src/skip.test.ts": "export const d = 1;\n",
  "testing/packages/test-framework/package.json": "{}",
});
afterAll(removeAll);

unit(outsideReason, {
  positive: [
    positive(
      "plain product source is fine",
      [source("packages/a/src/x.ts", "export const x = 1;")],
      undefined,
    ),
    positive(
      "a type-only test-support file is fine",
      [source("packages/types/src/test-support.ts", "export {};")],
      undefined,
    ),
  ],
  negative: [
    rejected("a test file name", [source("packages/a/src/x.test.ts", "")], "x.test.ts"),
    rejected("a fixtures file name", [source("tooling/scripts/fixtures.ts", "")], "fixtures.ts"),
    rejected(
      "an import of bun:test",
      [source("packages/a/src/y.ts", 'import { test } from "bun:test";')],
      expect.any(String),
    ),
  ],
});

unit(outsideViolations, {
  positive: [
    positive(
      "nothing outside means no violation",
      [[source("packages/a/src/x.ts", "export {};")]],
      [],
    ),
    positive("an empty list means no violation", [[]], []),
  ],
  negative: [
    rejected(
      "a test in product source is reported",
      [[source("packages/a/src/x.test.ts", "")]],
      [outside("packages/a/src/x.test.ts", "x.test.ts")],
    ),
    rejected(
      "a harness name is reported",
      [[source("apps/api/src/harness.ts", "")]],
      [outside("apps/api/src/harness.ts", "harness.ts")],
    ),
  ],
});

unit(stackViolations, {
  positive: [
    positive("framework with no testing dependency", [[manifest("test-framework", [])]], []),
    positive(
      "factories on the framework",
      [[manifest("test-factories", ["@platform/test-framework"])]],
      [],
    ),
  ],
  negative: [
    rejected(
      "framework depending on factories",
      [[manifest("test-framework", ["@platform/test-factories"])]],
      [
        {
          file: "testing/packages/test-framework/package.json",
          rule: TestingRule.StackViolation,
          detail: "@platform/test-factories",
        },
      ],
    ),
    rejected(
      "factories depending on scenarios",
      [[manifest("test-factories", ["@platform/test-scenarios"])]],
      [
        {
          file: "testing/packages/test-factories/package.json",
          rule: TestingRule.StackViolation,
          detail: "@platform/test-scenarios",
        },
      ],
    ),
  ],
});

unit(productSources, {
  positive: [
    positive(
      "finds product files and skips generated ones",
      [root],
      [
        source("packages/a/src/code.test.ts", "export const b = 1;\n"),
        source("packages/a/src/code.ts", "export const a = 1;\n"),
      ],
    ),
    positive("an empty directory has none", [await makeDir()], []),
  ],
  negative: [
    negative("a missing directory throws", [`${root}/missing`], { code: MISSING }),
    negative("a nested missing directory throws", [`${root}/missing/deeper`], { code: MISSING }),
  ],
});

unit(testingManifests, {
  positive: [
    positive(
      "reads the testing package manifests",
      [root],
      [source("testing/packages/test-framework/package.json", "{}")],
    ),
    positive("an empty directory has none", [await makeDir()], []),
  ],
  negative: [
    negative("a missing directory throws", [`${root}/missing`], { code: MISSING }),
    negative("a nested missing directory throws", [`${root}/missing/deeper`], { code: MISSING }),
  ],
});
