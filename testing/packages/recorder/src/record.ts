import { join } from "node:path";
import {
  DETAIL_SEPARATOR,
  KB_FILE_SUFFIX,
  MessageId,
  PROXY_BACKEND_ENV,
  PROXY_RECORDER_MISSING_PAGES,
  StepFlag,
  Text,
  TransportKind,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { RecordedPage, Scenario, StepResult, SurfaceUrls } from "@platform/types";
import { all } from "@platform/util";
import { guidePage } from "./guide-display.ts";
import { toMdx } from "./mdx.ts";
import { runProxyRecorder } from "./proxy-record.ts";
import { runScenario, ScenarioFailure } from "./runner.ts";

const ALL_TRANSPORTS: readonly TransportKind[] = [TransportKind.Http, TransportKind.Mcp];

export function assertPassed(id: string, results: readonly StepResult[]): void {
  const failed = results.find((result) => result.flag === StepFlag.Failed);
  if (failed !== undefined) {
    throw new ScenarioFailure(
      message(MessageId.KbScenarioFailed, {
        id,
        transport: failed.source,
        step: failed.description,
        reason: failed.checks
          .filter((check) => !check.passed)
          .map((check) => check.label)
          .join(DETAIL_SEPARATOR),
        expected: failed.evidence.expected ?? Text.Empty,
        actual: failed.evidence.actual ?? Text.Empty,
      }),
    );
  }
}

export async function recordScenario(
  scenario: Scenario,
  transports: readonly TransportKind[] = ALL_TRANSPORTS,
  run: typeof runScenario = runScenario,
): Promise<RecordedPage> {
  const runs = await all(transports.map((transport) => async () => run(scenario, transport)));
  const results = runs.flat();
  assertPassed(scenario.id, results);
  return {
    id: scenario.id,
    title: scenario.title,
    intent: scenario.intent,
    category: scenario.category,
    results,
  };
}

export async function recordPages(
  scenarios: readonly Scenario[],
  transports: readonly TransportKind[] = ALL_TRANSPORTS,
  run: typeof runScenario = runScenario,
): Promise<RecordedPage[]> {
  if (scenarios.length === 0) return [];
  if (run === runScenario && Bun.env[PROXY_BACKEND_ENV] === undefined) {
    const output = await runProxyRecorder({
      scenarios: [...scenarios],
      transports: [...transports],
    });
    if (output.pages === undefined) throw new Error(PROXY_RECORDER_MISSING_PAGES);
    return output.pages;
  }
  return all(scenarios.map((scenario) => async () => recordScenario(scenario, transports, run)));
}

export async function recordAll(
  scenarios: readonly Scenario[],
  outputDir: string,
  transports: readonly TransportKind[] = ALL_TRANSPORTS,
  urls?: SurfaceUrls,
  run: typeof runScenario = runScenario,
): Promise<string[]> {
  const pages = await recordPages(scenarios, transports, run);
  const shown = await all(pages.map((page) => async () => guidePage(page)));
  const written = shown.map((page) => ({
    path: join(outputDir, page.category, `${page.id}${KB_FILE_SUFFIX}`),
    text: toMdx(page, urls),
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
