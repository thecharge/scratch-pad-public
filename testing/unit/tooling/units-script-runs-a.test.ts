import { afterAll } from "bun:test";
import { join, relative } from "node:path";
import { TestTier } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { gitRepo, makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { CoverageGap, CoverageRun } from "@platform/types";
import { unloadedProducts } from "../../../tooling/scripts/coverage.ts";
import { runCoverage, runGroup } from "../../../tooling/scripts/run-coverage.ts";
import { runTier } from "../../../tooling/scripts/run-tier.ts";
import { runSecretScan } from "../../../tooling/scripts/secret-scan.ts";
import { stripFiles } from "../../../tooling/scripts/strip-comments.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

async function tree(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await makeDir();
  await writeFiles(root, files);
  return root;
}

const random = (alphabet: string, length: number) =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(length)),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
const LEAK = [
  `aws_access_key_id = AKIA${random("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", 16)}`,
  `aws_secret_access_key = ${random("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 40)}`,
  "",
].join("\n");
const CLEAN = "nothing sensitive here\n";

const stdinOf = (text: string) => async () => text;
const CLEAN_COMMITTED = await gitRepo({ "a.txt": CLEAN }, true, true);
const LEAK_COMMITTED = await gitRepo({ "a.txt": LEAK }, true, true);
const NOTHING_STAGED = await gitRepo({ "a.txt": CLEAN }, false, false);
const LEAK_STAGED = await gitRepo({ "a.txt": LEAK }, true, false);

unit(runSecretScan, {
  positive: [
    positive("clean text on stdin passes", ["stdin", stdinOf(CLEAN)], 0),
    positive("a repository without secrets passes", ["repo", stdinOf(CLEAN), CLEAN_COMMITTED], 0),
    positive("nothing staged passes", ["staged", stdinOf(CLEAN), NOTHING_STAGED], 0),
  ],
  negative: [
    rejected("a credential on stdin fails", ["stdin", stdinOf(LEAK)], 1),
    rejected(
      "a committed credential fails the repository scan",
      ["repo", stdinOf(CLEAN), LEAK_COMMITTED],
      1,
    ),
    rejected("a staged credential fails", ["staged", stdinOf(CLEAN), LEAK_STAGED], 1),
    rejected("an unknown mode is a usage error", ["other"], 2),
    rejected("a missing mode is a usage error", [undefined], 2),
  ],
});

const stripRoot = await tree({
  "commented.ts": "export const a = 1; // note\n",
  "again.ts": "export const b = 2; // note\n",
  "clean.ts": "export const c = 3;\n",
  "image.png": "// not code\n",
});
const stripTarget = (name: string) => join(stripRoot, name);
const textOf = (name: string) => async () => Bun.file(stripTarget(name)).text();
const nowhere = stdinOf("");

unit(stripFiles, {
  positive: [
    positive(
      "a comment is removed from the file",
      [[stripTarget("commented.ts")], nowhere],
      seen(textOf("commented.ts"), "export const a = 1;\n"),
    ),
    positive(
      "a second file is stripped the same way",
      [[stripTarget("again.ts")], nowhere],
      seen(textOf("again.ts"), "export const b = 2;\n"),
    ),
    positive("a file without comments stays as it is", [[stripTarget("clean.ts")], nowhere], 0),
  ],
  negative: [
    rejected(
      "a file that is not code is left alone",
      [[stripTarget("image.png")], nowhere],
      seen(textOf("image.png"), "// not code\n"),
    ),
    negative("a file that is not there throws", [[stripTarget("absent.ts")], nowhere], {
      code: "ENOENT",
    }),
  ],
});

const tiers = await tree({
  "testing/unit/a/x.test.ts": "export const a = 1;\n",
  "testing/e2e/a/y.test.ts": "export const b = 1;\n",
});
const succeed = async () => ["true"];
const failing = async () => ["false"];
const docsOk = async () => 0;
const docsBroken = async () => 1;
const metricsOk = async () => 0;
const metricsOver = async () => 1;

unit(runTier, {
  positive: [
    positive(
      "parallel unit groups pass",
      [[TestTier.Unit], tiers, succeed, docsOk, metricsOver, 2],
      0,
    ),
    positive(
      "a tier whose tests pass exits with 0",
      [[TestTier.Unit], tiers, succeed, docsOk, metricsOver],
      0,
    ),
    positive(
      "the e2e tier writes the docs after a pass",
      [[TestTier.E2e], tiers, succeed, docsOk, metricsOk],
      0,
    ),
  ],
  negative: [
    rejected("a tier without tests fails", [[TestTier.Integration], tiers, succeed, docsOk], 1),
    rejected(
      "failing e2e tests fail the tier and leave no metrics",
      [[TestTier.E2e], tiers, failing, docsOk, metricsOk],
      1,
    ),
    rejected(
      "metrics over their budget fail the e2e tier",
      [[TestTier.E2e], tiers, succeed, docsOk, metricsOver],
      1,
    ),
    rejected("failing tests fail the tier", [[TestTier.Unit], tiers, failing, docsOk], 1),
    rejected(
      "parallel failures remain blocking",
      [[TestTier.Unit], tiers, failing, docsOk, metricsOk, 2],
      1,
    ),
    rejected(
      "a docs build that fails fails the e2e tier",
      [[TestTier.E2e], tiers, succeed, docsBroken, metricsOk],
      1,
    ),
  ],
});

const groupRoot = await tree({
  "src.ts": "export const value = 1;\n",
  "pass.test.ts":
    'import { expect, test } from "bun:test";\nimport { value } from "./src.ts";\ntest("v", () => expect(value).toBe(1));\n',
  "fail.test.ts": 'import { expect, test } from "bun:test";\ntest("v", () => expect(1).toBe(2));\n',
});
const groupDirs = [
  await makeDir(),
  await makeDir(),
  await makeDir(),
  await makeDir(),
  await makeDir(),
];
const relativeTest = (name: string) => [relative(REPO_ROOT, join(groupRoot, name))];
const listsSource = (result: CoverageRun) =>
  result.lcov.some((file) => file.file.endsWith("src.ts"));

unit(runGroup, {
  positive: [
    positive(
      "a passing group reports ok",
      [relativeTest("pass.test.ts"), groupDirs[0]],
      seen((result: CoverageRun) => result.ok, true),
    ),
    positive(
      "the loaded source is in the lcov",
      [relativeTest("pass.test.ts"), groupDirs[1]],
      seen(listsSource, true),
    ),
  ],
  negative: [
    rejected(
      "a failing group is not ok",
      [relativeTest("fail.test.ts"), groupDirs[2]],
      seen((result: CoverageRun) => result.ok, false),
    ),
    rejected(
      "a group with a unit test is run without the metrics folder",
      [["testing/unit/absent.test.ts"], groupDirs[4]],
      seen((result: CoverageRun) => result.ok, false),
    ),
    rejected(
      "a group without tests is not ok and has no lcov",
      [relativeTest("absent.test.ts"), groupDirs[3]],
      seen((result: CoverageRun) => [result.ok, result.lcov.length], [false, 0]),
    ),
  ],
});

const childLcov = "SF:packages/example/src/child.ts\nFNF:1\nFNH:1\nDA:2,1\nend_of_record\n";
const childJunit =
  '<testsuites><testsuite><testcase name="child assertion" classname="sdk" time="0.25" file="child.test.ts" /></testsuite></testsuites>';
const childReports = `
import { test, expect } from "bun:test";
const target = process.env.TEST_CHILD_REPORT_DIR;
await Bun.write(target + "/nested/server/lcov.info", ${JSON.stringify(childLcov)});
await Bun.write(target + "/nested/client/junit.xml", ${JSON.stringify(childJunit)});
`;
const childGroup = await tree({
  "pass.test.ts": `${childReports}test("parent pass", () => expect(1).toBe(1));`,
  "fail.test.ts": `${childReports}test("parent failure", () => expect(1).toBe(2));`,
});
const childDirs = [await makeDir(), await makeDir(), await makeDir(), await makeDir()];
const childTest = (name: string) => [relative(REPO_ROOT, join(childGroup, name))];
const childSource = (result: CoverageRun) =>
  result.lcov.some((entry) => entry.file === "packages/example/src/child.ts");
const childTimed = (result: CoverageRun) =>
  result.slow?.some((entry) => entry.name === "child assertion" && entry.seconds === 0.25);

unit(runGroup, {
  positive: [
    positive(
      "nested child source coverage is merged",
      [childTest("pass.test.ts"), childDirs[0]],
      seen(childSource, true),
    ),
    positive(
      "nested child assertions retain their timing",
      [childTest("pass.test.ts"), childDirs[1]],
      seen(childTimed, true),
    ),
  ],
  negative: [
    rejected(
      "child coverage does not hide a parent failure",
      [childTest("fail.test.ts"), childDirs[2]],
      seen((result: CoverageRun) => [result.ok, childSource(result)], [false, true]),
    ),
    rejected(
      "child timing does not hide a parent failure",
      [childTest("fail.test.ts"), childDirs[3]],
      seen((result: CoverageRun) => [result.ok, childTimed(result)], [false, true]),
    ),
  ],
});

const PRODUCT = "export async function f(): Promise<number> {\n  return 1;\n}\n";
const coverRoot = await tree({
  "packages/a/src/x.ts": PRODUCT,
  "testing/unit/a/x.test.ts": "export const a = 1;\n",
  "testing/integration/a/z.test.ts": "export const z = 1;\n",
  "testing/unit-debt.json": "[]",
});
const entryOf = (hits: number) => ({
  file: "packages/a/src/x.ts",
  lines: { "2": hits },
  functionsFound: 1,
  functionsHit: hits,
});
const lcovOf = (hits: number): CoverageRun => ({
  lcov: [entryOf(hits)],
  ok: true,
});
const covered = async () => lcovOf(1);
const missed = async () => lcovOf(0);
const slowRun = async (): Promise<CoverageRun> => ({
  ...lcovOf(1),
  slow: [{ name: "a slow test", file: "x.test.ts", seconds: 3 }],
});
const unloaded = async (): Promise<CoverageRun> => ({ lcov: [], ok: true });
const crashed = async (): Promise<CoverageRun> => ({ ...lcovOf(1), ok: false });

unit(runCoverage, {
  positive: [
    positive("full coverage exits with 0", [[TestTier.Unit], covered, true, coverRoot], 0),
    positive(
      "the slowest tests of the run are listed and the run still passes",
      [[TestTier.Unit], slowRun, true, coverRoot],
      0,
    ),
    positive(
      "metrics inside their budget pass the integration run",
      [[TestTier.Integration], covered, true, coverRoot, metricsOk],
      0,
    ),
    positive(
      "a gap is only reported while the report is not blocking",
      [[TestTier.Unit], missed, false, coverRoot],
      0,
    ),
  ],
  negative: [
    rejected(
      "metrics over their budget fail the integration run",
      [[TestTier.Integration], covered, true, coverRoot, metricsOver],
      1,
    ),
    rejected(
      "a crashed integration group fails and leaves no metrics",
      [[TestTier.Integration], crashed, true, coverRoot, metricsOk],
      1,
    ),
    rejected("a gap fails when blocking", [[TestTier.Unit], missed, true, coverRoot], 1),
    rejected(
      "a product file no test loads fails when blocking",
      [[TestTier.Unit], unloaded, true, coverRoot],
      1,
    ),
    rejected(
      "a test group that failed fails when blocking",
      [[TestTier.Unit], crashed, true, coverRoot],
      1,
    ),
  ],
});

const productRoot = await tree({
  "packages/a/src/x.ts": PRODUCT,
  "packages/a/src/y.ts": PRODUCT,
  "packages/a/src/types.d.ts": "export type A = string;\n",
  "packages/a/src/generated/g.ts": PRODUCT,
  "apps/b/src/app.tsx": "export const app = 1;\n",
});
const loaded = (...names: string[]) =>
  names.map((file) => ({ file, lines: {}, functionsFound: 0, functionsHit: 0 }));
const names = (gaps: CoverageGap[]) => gaps.map((gap) => gap.file);

unit(unloadedProducts, {
  positive: [
    positive(
      "a source no run loaded is a gap",
      [loaded("packages/a/src/x.ts", "apps/b/src/app.tsx"), productRoot],
      seen(names, ["packages/a/src/y.ts"]),
    ),
    positive(
      "a root where nothing loaded lists every source",
      [[], productRoot],
      seen(names, ["apps/b/src/app.tsx", "packages/a/src/x.ts", "packages/a/src/y.ts"]),
    ),
  ],
  negative: [
    rejected(
      "a loaded root has no gap",
      [loaded("packages/a/src/x.ts", "packages/a/src/y.ts", "apps/b/src/app.tsx"), productRoot],
      [],
    ),
    rejected(
      "declaration files and generated code are not sources",
      [loaded("packages/a/src/x.ts", "packages/a/src/y.ts", "apps/b/src/app.tsx"), productRoot],
      seen(names, []),
    ),
  ],
});
