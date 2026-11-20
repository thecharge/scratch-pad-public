import { join } from "node:path";
import { KB_FILE_SUFFIX } from "@platform/constants";
import type { RecordedPage, SdkScenario } from "@platform/types";
import { all } from "@platform/util";
import { guidePage } from "./guide-display.ts";
import { toMdx } from "./mdx.ts";
import { assertPassed } from "./record.ts";
import { runSdkScenario } from "./sdk.ts";

export async function recordSdkScenario(
  scenario: SdkScenario,
  tarball: string,
  connect?: Parameters<typeof runSdkScenario>[2],
  execute?: Parameters<typeof runSdkScenario>[3],
): Promise<RecordedPage> {
  const results = await runSdkScenario(scenario, tarball, connect, execute);
  assertPassed(scenario.id, results);
  return {
    id: scenario.id,
    title: scenario.title,
    intent: scenario.intent,
    category: scenario.category,
    results,
  };
}

export async function recordSdkPages(
  scenarios: readonly SdkScenario[],
  tarball: string,
  outputDir: string,
  connect?: Parameters<typeof runSdkScenario>[2],
  execute?: Parameters<typeof runSdkScenario>[3],
): Promise<string[]> {
  const pages: RecordedPage[] = [];
  if (connect === undefined) {
    pages.push(
      ...(await all(
        scenarios.map(
          (scenario) => async () => recordSdkScenario(scenario, tarball, connect, execute),
        ),
      )),
    );
  } else {
    for (const scenario of scenarios)
      pages.push(await recordSdkScenario(scenario, tarball, connect, execute));
  }
  const shown = await all(pages.map((page) => async () => guidePage(page)));
  const written = shown.map((page) => ({
    path: join(outputDir, page.category, `${page.id}${KB_FILE_SUFFIX}`),
    text: toMdx(page),
  }));
  await all(
    written.map(
      ({ path, text }) =>
        async () =>
          Bun.write(path, text),
    ),
  );
  return written.map(({ path }) => path);
}
