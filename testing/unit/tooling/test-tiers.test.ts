import { afterAll, expect, test } from "bun:test";
import { METRICS_PRELOAD_FILE, TestTier } from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { FAST_SHIP_SCAN_UNITS } from "../../../packages/constants/src/fast-shipping.ts";
import { testCommand } from "../../../tooling/scripts/run-tier.ts";
import {
  fastUnitFiles,
  groupsOf,
  isIsolated,
  misplaced,
  openedBy,
  testFiles,
  tierOf,
  unitViolations,
} from "../../../tooling/scripts/test-tiers.ts";

const MISSING = "ENOENT";
const calling = (name: string, rest: string) => ["Bun", name].join(".") + rest;
const SERVING = `const server = ${calling("serve", "({ fetch: () => new Response() });")}\n`;
const UNIT_FILE = "testing/unit/aip/a.test.ts";
const OTHER_UNIT_FILE = "testing/unit/store/b.test.ts";
const CONSOLE_FILE = "testing/unit/console/c.test.ts";
const INTEGRATION_FILE = "testing/integration/api/d.test.ts";
const E2E_FILE = "testing/e2e/api/e.test.ts";

const root = await makeDir();
await writeFiles(root, {
  [UNIT_FILE]: "export const clean = 1;\n",
  [OTHER_UNIT_FILE]: SERVING,
  [INTEGRATION_FILE]: SERVING,
});
afterAll(removeAll);

unit(tierOf, {
  positive: [
    positive("the unit folder", [UNIT_FILE], TestTier.Unit),
    positive("the integration folder", [INTEGRATION_FILE], TestTier.Integration),
    positive("the end-to-end folder", [E2E_FILE], TestTier.E2e),
  ],
  negative: [
    rejected("a test beside its source has no tier", ["packages/aip/src/a.test.ts"], undefined),
    rejected(
      "a name marker no longer decides the tier",
      ["packages/aip/src/a.e2e.test.ts"],
      undefined,
    ),
  ],
});

unit(isIsolated, {
  positive: [
    positive("console tests run alone", [CONSOLE_FILE], true),
    positive("a nested console test runs alone", ["testing/unit/console/deep/f.test.ts"], true),
  ],
  negative: [
    rejected("other unit tests share a process", [UNIT_FILE], false),
    rejected("integration tests are not isolated by folder", [INTEGRATION_FILE], false),
  ],
});

test.each([false, true])(
  "grouping preserves every discovered file exactly once, fast=%s",
  async (fast) => {
    const files = await testFiles();
    expect((await groupsOf(files, fast)).flat().sort()).toEqual(files.sort());
  },
);

unit(groupsOf, {
  positive: [
    positive(
      "tooling work is split without omissions or duplicates",
      [
        [
          UNIT_FILE,
          "testing/unit/tooling/a.test.ts",
          "testing/unit/tooling/b.test.ts",
          "testing/unit/tooling/c.test.ts",
          CONSOLE_FILE,
        ],
        true,
      ],
      [
        [UNIT_FILE],
        ["testing/unit/tooling/a.test.ts", "testing/unit/tooling/c.test.ts"],
        ["testing/unit/tooling/b.test.ts"],
        [CONSOLE_FILE],
      ],
    ),
    positive(
      "fast unit shards preserve every file",
      [[UNIT_FILE, OTHER_UNIT_FILE, "testing/unit/tooling/a.test.ts", CONSOLE_FILE], true],
      [[UNIT_FILE, OTHER_UNIT_FILE], ["testing/unit/tooling/a.test.ts"], [CONSOLE_FILE]],
    ),
    positive(
      "unit tests share a group and others run alone",
      [[UNIT_FILE, OTHER_UNIT_FILE, CONSOLE_FILE, INTEGRATION_FILE, E2E_FILE]],
      [[UNIT_FILE, OTHER_UNIT_FILE], [CONSOLE_FILE], [INTEGRATION_FILE], [E2E_FILE]],
    ),
    positive(
      "only integration files run one by one",
      [[INTEGRATION_FILE, E2E_FILE]],
      [[INTEGRATION_FILE], [E2E_FILE]],
    ),
  ],
  negative: [
    rejected("no files means no groups", [[]], []),
    rejected(
      "sharding keeps console isolation",
      [[CONSOLE_FILE, "testing/unit/console/g.test.ts"], true],
      [[CONSOLE_FILE, "testing/unit/console/g.test.ts"]],
    ),
    rejected(
      "console files form one isolated group",
      [[CONSOLE_FILE, "testing/unit/console/g.test.ts"]],
      [[CONSOLE_FILE, "testing/unit/console/g.test.ts"]],
    ),
  ],
});

unit(misplaced, {
  positive: [
    positive("every test is in a tier folder", [[UNIT_FILE, INTEGRATION_FILE, E2E_FILE]], []),
    positive("no files, nothing misplaced", [[]], []),
  ],
  negative: [
    rejected(
      "a test in source is misplaced",
      [["packages/aip/src/a.test.ts", UNIT_FILE]],
      ["packages/aip/src/a.test.ts"],
    ),
    rejected(
      "a test in tooling is misplaced",
      [["tooling/scripts/a.test.ts"]],
      ["tooling/scripts/a.test.ts"],
    ),
  ],
});

unit(openedBy, {
  positive: [
    positive("Bun.serve opens a port", [calling("serve", "({})")], String.raw`Bun\.serve\(`),
    positive("Bun.spawn opens a process", [calling("spawn", "([])")], String.raw`Bun\.spawn\(`),
  ],
  negative: [
    rejected("plain code opens nothing", ["const a = 1;"], undefined),
    rejected("a mention without a call opens nothing", [calling("serve", "")], undefined),
  ],
});

unit(unitViolations, {
  positive: [
    positive("a clean unit test has no violation", [[UNIT_FILE], root], []),
    positive("integration files are not checked as units", [[INTEGRATION_FILE], root], []),
  ],
  negative: [
    rejected(
      "a unit test that serves is reported",
      [[OTHER_UNIT_FILE], root],
      [{ file: OTHER_UNIT_FILE, pattern: String.raw`Bun\.serve\(` }],
    ),
    negative(
      "a unit test that does not exist throws",
      [["testing/unit/aip/missing.test.ts"], root],
      { code: MISSING },
    ),
  ],
});

unit(testFiles, {
  positive: [
    positive(
      "finds this suite",
      [],
      expect.arrayContaining(["testing/unit/tooling/test-tiers.test.ts"]),
    ),
    positive(
      "finds the api end-to-end suite",
      [],
      expect.arrayContaining(["testing/e2e/api/http.test.ts"]),
    ),
  ],
  negative: [
    rejected(
      "skips tests under node_modules",
      [],
      expect.not.arrayContaining([expect.stringContaining("node_modules/")]),
    ),
    rejected(
      "skips generated tests",
      [],
      expect.not.arrayContaining([expect.stringContaining("generated/")]),
    ),
  ],
});

const PRELOADED = ["bun", "test", "--preload", `./${METRICS_PRELOAD_FILE}`];

unit(testCommand, {
  positive: [
    positive("runs bun test on relative paths", [[UNIT_FILE]], [...PRELOADED, `./${UNIT_FILE}`]),
    positive(
      "extra flags come before the files",
      [[UNIT_FILE], ["--coverage"]],
      [...PRELOADED, "--coverage", `./${UNIT_FILE}`],
    ),
  ],
  negative: [
    rejected("no files gives the bare command", [[]], PRELOADED),
    negative("a non-list group throws", [undefined], { name: "TypeError" }),
  ],
});

const PARTITION_FILES = [...FAST_SHIP_SCAN_UNITS, UNIT_FILE, CONSOLE_FILE];
unit(fastUnitFiles, {
  positive: [
    positive(
      "scanner phase selects its complete suites",
      [PARTITION_FILES, true],
      FAST_SHIP_SCAN_UNITS,
    ),
    positive(
      "remaining phase retains every other suite",
      [PARTITION_FILES, false],
      [UNIT_FILE, CONSOLE_FILE],
    ),
  ],
  negative: [
    rejected("no scanner files selects no scanner work", [[UNIT_FILE], true], []),
    rejected("remaining phase never repeats scanner suites", [FAST_SHIP_SCAN_UNITS, false], []),
  ],
});

test.each([true, false])(
  "split phases partition every discovered suite, unitsOnly=%s",
  async (unitsOnly) => {
    const files = (await testFiles()).filter(
      (file) => !unitsOnly || file.startsWith("testing/unit/"),
    );
    const scans = await fastUnitFiles(files, true);
    const rest = await fastUnitFiles(files, false);
    expect([...scans, ...rest].sort()).toEqual([...files].sort());
    expect(scans.filter((file) => rest.includes(file))).toEqual([]);
    expect(await fastUnitFiles(files)).toEqual(files);
  },
);
