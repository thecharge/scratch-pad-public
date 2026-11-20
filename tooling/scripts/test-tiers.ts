import { join } from "node:path";
import {
  ISOLATED_UNIT_DIRS,
  OPENS_PORT_OR_DATABASE,
  SkippedDir,
  TEST_FILE_GLOB,
  TestTier,
  Text,
  TIER_DIRS,
} from "@platform/constants";
import { filterAsync, flatMapAsync } from "@platform/store";
import { all } from "@platform/util";
import {
  FAST_SHIP_SCAN_UNITS,
  FAST_SHIP_SDK_UNITS,
  FAST_SHIP_SHARD_PREFIX,
  FAST_SHIP_TOOLING_GROUPS,
} from "../../packages/constants/src/fast-shipping.ts";
import { REPO_ROOT } from "./tools.ts";

const SKIPPED = Object.values(SkippedDir) as string[];

export async function tierOf(file: string): Promise<TestTier | undefined> {
  return Object.values(TestTier).find((tier) => file.startsWith(TIER_DIRS[tier]));
}

export async function isIsolated(file: string): Promise<boolean> {
  return ISOLATED_UNIT_DIRS.some((dir) => file.startsWith(dir));
}

export async function testFiles(root: string = REPO_ROOT): Promise<string[]> {
  const found = await Array.fromAsync(new Bun.Glob(TEST_FILE_GLOB).scan({ cwd: root }));
  return found.filter((file) => !SKIPPED.some((dir) => file.includes(dir)));
}

export async function openedBy(source: string): Promise<string | undefined> {
  return OPENS_PORT_OR_DATABASE.find((pattern) => pattern.test(source))?.source;
}

export async function groupsOf(files: readonly string[], shard = false): Promise<string[][]> {
  const shared = await filterAsync(
    files,
    async (file) => (await tierOf(file)) === TestTier.Unit && !(await isIsolated(file)),
  );
  const isolated = await filterAsync(files, async (file) => isIsolated(file));
  const alone = await filterAsync(files, async (file) => (await tierOf(file)) !== TestTier.Unit);
  const scans = FAST_SHIP_SCAN_UNITS.filter((file) => shared.includes(file));
  const sdk = FAST_SHIP_SDK_UNITS.filter((file) => shared.includes(file));
  const separate = shared.filter(
    (file) =>
      file.startsWith(FAST_SHIP_SHARD_PREFIX) &&
      !FAST_SHIP_SDK_UNITS.includes(file) &&
      !FAST_SHIP_SCAN_UNITS.includes(file),
  );
  const combined = shared.filter((file) => !file.startsWith(FAST_SHIP_SHARD_PREFIX));
  const tooling = Array.from({ length: FAST_SHIP_TOOLING_GROUPS }, (_, group) =>
    separate.filter((_, index) => index % FAST_SHIP_TOOLING_GROUPS === group),
  );
  const units = shard ? [scans, sdk, combined, ...tooling] : [shared];
  return [...units, isolated, ...alone.map((file) => [file])].filter((group) => group.length > 0);
}

export async function misplaced(files: readonly string[]): Promise<string[]> {
  return await filterAsync(files, async (file) => (await tierOf(file)) === undefined);
}

export async function unitViolations(files: readonly string[], root: string = REPO_ROOT) {
  const units = await filterAsync(files, async (file) => (await tierOf(file)) === TestTier.Unit);
  const texts = await all(units.map((file) => async () => Bun.file(join(root, file)).text()));
  return await flatMapAsync(units, async (file, index) => {
    const pattern = await openedBy(texts[index] ?? Text.Empty);
    return pattern === undefined ? [] : [{ file, pattern }];
  });
}

export async function fastUnitFiles(files: readonly string[], scans?: boolean): Promise<string[]> {
  return scans === undefined
    ? [...files]
    : files.filter((file) => FAST_SHIP_SCAN_UNITS.includes(file) === scans);
}
