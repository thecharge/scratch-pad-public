import { afterAll } from "bun:test";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  allSyncFunctions,
  asyncViolations,
  ignoreConfig,
  isIgnored,
  matched,
  staleIgnores,
  syncFunctions,
} from "../../../tooling/scripts/check-async-functions.ts";
import { readSources } from "../../../tooling/scripts/source-files.ts";

afterAll(removeAll);

const SYNC = "export function plain() {\n  return 1;\n}\n";
const ASYNC = "export async function plain() {\n  return 1;\n}\n";
const CALLBACK = "export async function plain() {\n  return [1].map((item) => item);\n}\n";
const PREDICATE =
  "export async function ok(value: unknown) {\n  return isText(value);\n}\nfunction isText(value: unknown): value is string {\n  return typeof value === 'string';\n}\n";
const ARROW = "export const make = () => 1;\n";
const CLASS_SYNC =
  "export class Box {\n  constructor() {}\n  get size() {\n    return 1;\n  }\n  open() {\n    return 1;\n  }\n}\n";
const OBJECT_METHOD = "export const api = { open() { return 1; } };\n";

const SOURCE_PATH = "packages/demo/src/a.ts";
const FINDING = { file: SOURCE_PATH, line: 1, name: "plain" };
const OTHER = { file: "packages/demo/src/b.ts", line: 3, name: "other" };
const WHOLE_FILE = { entries: [{ path: SOURCE_PATH, reason: "pending" }] };
const BY_NAME = { entries: [{ path: SOURCE_PATH, names: ["plain"], reason: "pending" }] };
const CAPPED = { entries: [{ path: SOURCE_PATH, maximum: 1, reason: "pending" }] };

async function rootOf(files: Record<string, string>): Promise<string> {
  const dir = await makeDir();
  await writeFiles(dir, files);
  return dir;
}

const IGNORE_FILE = "async-ignore.json";
const ENTRY_ONE = { path: SOURCE_PATH, maximum: 1, reason: "pending" };
const ENTRY_FIVE = { path: SOURCE_PATH, maximum: 5, reason: "pending" };
const ENTRY_NO_REASON = { path: "x" };
const ENTRY_ZERO = { path: "x", maximum: 0, reason: "r" };
const CONFIG_ONE = { entries: [ENTRY_ONE] };
const SECOND = `${SYNC}export function second() {\n  return 2;\n}\n`;

const syncRoot = await rootOf({ [SOURCE_PATH]: SYNC });
const asyncRoot = await rootOf({ [SOURCE_PATH]: ASYNC });
const ignoredRoot = await rootOf({
  [SOURCE_PATH]: SYNC,
  [IGNORE_FILE]: JSON.stringify(CONFIG_ONE),
});
const staleRoot = await rootOf({
  [SOURCE_PATH]: ASYNC,
  [IGNORE_FILE]: JSON.stringify(CONFIG_ONE),
});
const loosePadding = await rootOf({
  [SOURCE_PATH]: SYNC,
  [IGNORE_FILE]: JSON.stringify({ entries: [ENTRY_FIVE] }),
});
const overCap = await rootOf({
  [SOURCE_PATH]: SECOND,
  [IGNORE_FILE]: JSON.stringify(CONFIG_ONE),
});
const badConfig = await rootOf({ [IGNORE_FILE]: JSON.stringify({ entries: [ENTRY_NO_REASON] }) });
const noConfig = await rootOf({ [SOURCE_PATH]: ASYNC });
const zeroMaximum = await rootOf({ [IGNORE_FILE]: JSON.stringify({ entries: [ENTRY_ZERO] }) });

unit(syncFunctions, {
  positive: [
    positive("finds a function that is not async", [{ file: SOURCE_PATH, text: SYNC }], [FINDING]),
    positive(
      "names an arrow function by its variable",
      [{ file: SOURCE_PATH, text: ARROW }],
      [{ file: SOURCE_PATH, line: 1, name: "make" }],
    ),
    positive("leaves an async function alone", [{ file: SOURCE_PATH, text: ASYNC }], []),
    positive("leaves callbacks alone", [{ file: SOURCE_PATH, text: CALLBACK }], []),
    positive("leaves a type predicate alone", [{ file: SOURCE_PATH, text: PREDICATE }], []),
    positive(
      "leaves constructors and getters alone but finds a method",
      [{ file: SOURCE_PATH, text: CLASS_SYNC }],
      [{ file: SOURCE_PATH, line: 6, name: "open" }],
    ),
  ],
  negative: [
    rejected(
      "reports a method of an object literal",
      [{ file: SOURCE_PATH, text: OBJECT_METHOD }],
      [{ file: SOURCE_PATH, line: 1, name: "open" }],
    ),
    rejected(
      "reports a plain arrow function",
      [{ file: SOURCE_PATH, text: ARROW }],
      [{ file: SOURCE_PATH, line: 1, name: "make" }],
    ),
  ],
});

unit(matched, {
  positive: [
    positive(
      "keeps the findings of the entry's path",
      [[FINDING, OTHER], WHOLE_FILE.entries[0]],
      [FINDING],
    ),
    positive(
      "keeps only the named functions",
      [[FINDING, { ...FINDING, name: "x" }], BY_NAME.entries[0]],
      [FINDING],
    ),
  ],
  negative: [
    rejected("keeps nothing for another path", [[OTHER], WHOLE_FILE.entries[0]], []),
    negative("fails when the entry is missing", [[FINDING]], { name: "TypeError" }),
  ],
});

unit(isIgnored, {
  positive: [
    positive("ignores a finding in an ignored file", [FINDING, WHOLE_FILE], true),
    positive("ignores a finding by name", [FINDING, BY_NAME], true),
    positive("ignores up to the maximum", [FINDING, CAPPED, [FINDING]], true),
  ],
  negative: [
    rejected("does not ignore another file", [OTHER, WHOLE_FILE], false),
    rejected("does not ignore another name", [{ ...FINDING, name: "x" }, BY_NAME], false),
    rejected(
      "does not ignore beyond the maximum",
      [FINDING, CAPPED, [FINDING, { ...FINDING, name: "two" }]],
      false,
    ),
    negative("fails without an ignore configuration", [FINDING], { name: "TypeError" }),
  ],
});

unit(ignoreConfig, {
  positive: [
    positive("reads the configuration file", [ignoredRoot], CONFIG_ONE),
    positive("returns no entries without a file", [noConfig], { entries: [] }),
  ],
  negative: [
    negative("rejects an entry without a reason", [badConfig], { name: "ZodError" }),
    negative("rejects a maximum of zero", [zeroMaximum], { name: "ZodError" }),
  ],
});

unit(allSyncFunctions, {
  positive: [
    positive("finds every synchronous function", [syncRoot], [FINDING]),
    positive("finds none when all are async", [asyncRoot], []),
  ],
  negative: [
    negative("fails for a root that does not exist", ["/nowhere/at/all"], { code: "ENOENT" }),
    negative("fails for a second missing root", ["/also/not/here"], { code: "ENOENT" }),
  ],
});

unit(asyncViolations, {
  positive: [
    positive("reports an unlisted synchronous function", [syncRoot], [FINDING]),
    positive("reports nothing for a listed function", [ignoredRoot], []),
    positive("reports nothing when all are async", [asyncRoot], []),
  ],
  negative: [
    rejected(
      "reports every function beyond the maximum",
      [overCap],
      [FINDING, { file: SOURCE_PATH, line: 4, name: "second" }],
    ),
    negative("fails for a root that does not exist", ["/nowhere/at/all"], { code: "ENOENT" }),
  ],
});

unit(staleIgnores, {
  positive: [
    positive("finds nothing stale when the entry is exact", [ignoredRoot], []),
    positive("finds nothing without a configuration", [noConfig], []),
  ],
  negative: [
    rejected("names an entry with no synchronous function left", [staleRoot], [SOURCE_PATH]),
    rejected(
      "names an entry whose maximum is larger than its functions",
      [loosePadding],
      [SOURCE_PATH],
    ),
  ],
});

unit(readSources, {
  positive: [
    positive(
      "reads the files a glob finds",
      [[SOURCE_PATH], syncRoot],
      [{ file: SOURCE_PATH, text: SYNC }],
    ),
    positive("returns nothing when no file matches", [["nothing/*.ts"], syncRoot], []),
  ],
  negative: [
    negative("fails for a root that does not exist", [[SOURCE_PATH], "/nowhere/at/all"], {
      code: "ENOENT",
    }),
    negative("fails for a second root that does not exist", [[SOURCE_PATH], "/also/not/here"], {
      code: "ENOENT",
    }),
  ],
});
