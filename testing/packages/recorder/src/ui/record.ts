import { join } from "node:path";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import {
  EnvironmentName,
  KB_FILE_SUFFIX,
  SHOT_FOLDER,
  Text,
  UI_PROXY,
  UI_SCENARIO_ATTEMPTS,
} from "@platform/constants";
import type { RecordedPage, RecordedUi, SurfaceUrls, UiScenario } from "@platform/types";
import { all } from "@platform/util";
import { stackDown, stackUp } from "../../../../../apps/infra/src/cli.ts";
import { retryOnDeadline } from "../deadline.ts";
import { guidePage } from "../guide-display.ts";
import { toMdx } from "../mdx.ts";
import { withUiLock } from "./lock.ts";
import { runUiProxy } from "./proxy.ts";
import { assertUiPassed } from "./runner.ts";
import { buildConsole, discardBuild } from "./stack.ts";

async function runAll(
  scenarios: readonly UiScenario[],
  dist: string,
  root: string,
): Promise<RecordedUi[]> {
  const recorded: RecordedUi[] = [];
  for (const scenario of scenarios) {
    const shotsDir = join(root, scenario.category, SHOT_FOLDER);
    const { results, files } = await retryOnDeadline(
      async () => runUiProxy(scenario, dist, shotsDir),
      UI_SCENARIO_ATTEMPTS,
    );
    assertUiPassed(scenario, results);
    const { id, title, intent, category } = scenario;
    recorded.push({ page: { id, title, intent, category, results }, files });
  }
  return recorded;
}

async function stopProxy(): Promise<void> {
  if ((await stackDown(EnvironmentName.Test)) !== 0) throw new Error(UI_PROXY.StackStopFailure);
}

async function recordLocked(
  scenarios: readonly UiScenario[],
  root: string,
  consoleSource?: string,
  urls?: SurfaceUrls,
  manageStack = true,
): Promise<string[]> {
  if (scenarios.length === 0) return [];
  const dist = await buildConsole(TEST_PROXY_ORIGIN, consoleSource);
  try {
    if (manageStack && (await stackUp(EnvironmentName.Test)) !== 0)
      throw new Error(UI_PROXY.StackStartFailure);
    const recorded = await runAll(scenarios, dist, root);
    const pagePath = (page: RecordedPage) =>
      join(root, page.category, [page.id, KB_FILE_SUFFIX].join(Text.Empty));
    const writes = recorded.flatMap(({ page, files }) => [
      async () => Bun.write(pagePath(page), toMdx(await guidePage(page), urls)),
      ...Object.entries(files).map(
        ([path, bytes]) =>
          async () =>
            Bun.write(path, bytes),
      ),
    ]);
    await all(writes);
    return recorded.map(({ page }) => pagePath(page));
  } finally {
    await discardBuild(dist);
    if (manageStack) await stopProxy();
  }
}

export async function recordUi(
  scenarios: readonly UiScenario[],
  root: string,
  consoleSource?: string,
  urls?: SurfaceUrls,
  manageStack = true,
): Promise<string[]> {
  return withUiLock(() => recordLocked(scenarios, root, consoleSource, urls, manageStack));
}
