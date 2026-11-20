import { afterAll } from "bun:test";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  allUses,
  ignoreConfig,
  promiseAllUses,
  promiseAllViolations,
  staleIgnores,
} from "../../../tooling/scripts/check-promise-all.ts";

afterAll(removeAll);

const USES = "export async function run() {\n  return Promise.all([]);\n}\n";
const TWO = `${USES}export async function again() {\n  return Promise.all([]);\n}\n`;
const CLEAN = "export async function run() {\n  return Promise.allSettled([]);\n}\n";
const OTHER_OBJECT = "export async function run() {\n  return Pool.all([]);\n}\n";
const SOURCE_PATH = "packages/demo/src/a.ts";
const TEST_PATH = "testing/unit/demo/a.test.ts";
const IGNORE_FILE = "promise-all-ignore.json";
const ENTRY_ONE = { path: SOURCE_PATH, maximum: 1, reason: "pending" };
const ENTRY_FIVE = { path: SOURCE_PATH, maximum: 5, reason: "pending" };
const ZERO_ENTRY = { path: "x", maximum: 0, reason: "r" };
const ZERO_CONFIG = { entries: [ZERO_ENTRY] };
const BAD_ENTRY = { path: "x" };
const BAD_CONFIG = { entries: [BAD_ENTRY] };
const FINDING = { file: SOURCE_PATH, line: 2, name: "all" };

async function rootOf(files: Record<string, string>): Promise<string> {
  const dir = await makeDir();
  await writeFiles(dir, files);
  return dir;
}

const usesRoot = await rootOf({ [SOURCE_PATH]: USES });
const testsRoot = await rootOf({ [TEST_PATH]: USES });
const cleanRoot = await rootOf({ [SOURCE_PATH]: CLEAN });
const ignoredRoot = await rootOf({
  [SOURCE_PATH]: USES,
  [IGNORE_FILE]: JSON.stringify({ entries: [ENTRY_ONE] }),
});
const overCap = await rootOf({
  [SOURCE_PATH]: TWO,
  [IGNORE_FILE]: JSON.stringify({ entries: [ENTRY_ONE] }),
});
const staleRoot = await rootOf({
  [SOURCE_PATH]: CLEAN,
  [IGNORE_FILE]: JSON.stringify({ entries: [ENTRY_ONE] }),
});
const loosePadding = await rootOf({
  [SOURCE_PATH]: USES,
  [IGNORE_FILE]: JSON.stringify({ entries: [ENTRY_FIVE] }),
});
const zeroMaximum = await rootOf({
  [IGNORE_FILE]: JSON.stringify(ZERO_CONFIG),
});
const badConfig = await rootOf({ [IGNORE_FILE]: JSON.stringify(BAD_CONFIG) });

unit(promiseAllUses, {
  positive: [
    positive("finds a call of Promise.all", [{ file: SOURCE_PATH, text: USES }], [FINDING]),
    positive(
      "finds every call in the file",
      [{ file: SOURCE_PATH, text: TWO }],
      [FINDING, { file: SOURCE_PATH, line: 5, name: "all" }],
    ),
  ],
  negative: [
    rejected("leaves Promise.allSettled alone", [{ file: SOURCE_PATH, text: CLEAN }], []),
    rejected("leaves another object's all alone", [{ file: SOURCE_PATH, text: OTHER_OBJECT }], []),
  ],
});

unit(allUses, {
  positive: [
    positive("finds a use in product source", [usesRoot], [FINDING]),
    positive("finds a use in testing", [testsRoot], [{ file: TEST_PATH, line: 2, name: "all" }]),
  ],
  negative: [
    rejected("finds none in clean source", [cleanRoot], []),
    negative("fails for a root that does not exist", ["/nowhere/at/all"], { code: "ENOENT" }),
  ],
});

unit(ignoreConfig, {
  positive: [
    positive("reads the configuration file", [ignoredRoot], { entries: [ENTRY_ONE] }),
    positive("returns no entries without a file", [cleanRoot], { entries: [] }),
  ],
  negative: [
    negative("rejects an entry without a reason", [badConfig], { name: "ZodError" }),
    negative("rejects a maximum of zero", [zeroMaximum], { name: "ZodError" }),
  ],
});

unit(promiseAllViolations, {
  positive: [
    positive("names the file and line of an unlisted use", [usesRoot], [FINDING]),
    positive(
      "names a use in a test file",
      [testsRoot],
      [{ file: TEST_PATH, line: 2, name: "all" }],
    ),
    positive("reports nothing for a listed use", [ignoredRoot], []),
    positive("reports nothing for clean source", [cleanRoot], []),
  ],
  negative: [
    rejected(
      "reports every use beyond the maximum",
      [overCap],
      [FINDING, { file: SOURCE_PATH, line: 5, name: "all" }],
    ),
    negative("fails for a root that does not exist", ["/nowhere/at/all"], { code: "ENOENT" }),
  ],
});

unit(staleIgnores, {
  positive: [
    positive("finds nothing stale when the entry is exact", [ignoredRoot], []),
    positive("finds nothing without a configuration", [cleanRoot], []),
  ],
  negative: [
    rejected("names an entry with no use left", [staleRoot], [SOURCE_PATH]),
    rejected("names an entry whose maximum is larger than its uses", [loosePadding], [SOURCE_PATH]),
  ],
});
