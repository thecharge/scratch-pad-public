import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  BUILD_DOCS_SCRIPT,
  DocumentationPhase,
  E2E_METRICS_PHASE,
  E2E_TIMINGS_FILE,
  Glyph,
  METRICS_PRELOAD_FILE,
  MessageId,
  MILLISECONDS_PER_SECOND,
  PRELOAD_FLAG,
  PROTOCOL_REPORT_DIR,
  PROTOCOL_REPORT_ENV,
  PROTOCOL_REPORT_FILE,
  Runner,
  Separator,
  StdioMode,
  TestTier,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync } from "@platform/store";
import type { StepTiming } from "@platform/types";
import { all } from "@platform/util";
import {
  FAST_SHIP_INTEGRATION_CONCURRENCY,
  FAST_SHIP_REST_FLAG,
  FAST_SHIP_SCAN_FLAG,
  FAST_SHIP_SCAN_UNITS,
  FAST_SHIP_TEST_CONCURRENCY,
  FAST_SHIP_TEST_FLAG,
} from "../../packages/constants/src/fast-shipping.ts";
import { discardMetrics, enforceMetrics, metricsDir, prepareMetrics } from "./metrics-run.ts";
import { fastUnitFiles, groupsOf, testFiles, tierOf } from "./test-tiers.ts";
import { REPO_ROOT } from "./tools.ts";
import { measurePhase, writeTimings } from "./verification-timing.ts";

export async function docsCommand(): Promise<string[]> {
  return [Runner.Bun, Runner.Run, BUILD_DOCS_SCRIPT];
}

export async function produceDocs(command: typeof docsCommand = docsCommand): Promise<number> {
  const child = Bun.spawn(await command(), {
    stdout: StdioMode.Inherit,
    stderr: StdioMode.Inherit,
  });
  return child.exited;
}

export async function finishRun(
  codes: readonly number[],
  writesDocs: boolean,
  produce: () => Promise<number>,
): Promise<number> {
  if (!codes.every((code) => code === 0)) {
    if (writesDocs) {
      console.error(message(MessageId.E2eDocsSkipped));
    }
    return 1;
  }
  if (!writesDocs) {
    return 0;
  }
  const code = await produce();
  console.log(message(code === 0 ? MessageId.E2eDocsWritten : MessageId.E2eDocsFailed));
  return code === 0 ? 0 : 1;
}

export async function testCommand(
  group: readonly string[],
  extra: readonly string[] = [],
): Promise<string[]> {
  return [
    Runner.Bun,
    Runner.TestCommand,
    PRELOAD_FLAG,
    [Glyph.Dot, Separator.Resource, METRICS_PRELOAD_FILE].join(Text.Empty),
    ...extra,
    ...group.map((file) => [Glyph.Dot, Separator.Resource, file].join(Text.Empty)),
  ];
}

async function discard(dir: string): Promise<number> {
  await discardMetrics(dir);
  return 0;
}

export async function runTier(
  tiers: readonly TestTier[],
  root: string = REPO_ROOT,
  command: typeof testCommand = testCommand,
  docs: () => Promise<number> = produceDocs,
  enforce: (dir: string) => Promise<number> = enforceMetrics,
  concurrency = 1,
  scans?: boolean,
): Promise<number> {
  const measured = tiers.includes(TestTier.E2e);
  const timings: StepTiming[] = [];
  if (measured) await writeTimings(timings, root, E2E_TIMINGS_FILE);
  const files = await fastUnitFiles(
    await filterAsync(await testFiles(root), async (file) =>
      tiers.includes((await tierOf(file)) as TestTier),
    ),
    scans,
  );
  if (files.length === 0) {
    console.error(message(MessageId.TierEmpty, { tier: tiers.join(Glyph.Space) }));
    return 1;
  }
  const dir = await metricsDir(root, TestTier.E2e);
  if (measured) {
    await prepareMetrics(dir);
  }
  const protocols = join(root, PROTOCOL_REPORT_DIR, PROTOCOL_REPORT_FILE);
  if (measured) {
    await rm(protocols, { force: true });
    await mkdir(join(root, PROTOCOL_REPORT_DIR), { recursive: true });
    Bun.env[PROTOCOL_REPORT_ENV] = protocols;
  }
  const groups = await groupsOf(files, !measured && concurrency > 1);
  const jobs = groups.map((group) => async () => {
    const started = performance.now();
    const child = Bun.spawn(await command(group), {
      cwd: root,
      env: { ...Bun.env },
      stdout: StdioMode.Inherit,
      stderr: StdioMode.Inherit,
    });
    const code = await child.exited;

    timings.push({
      step: group.join(Glyph.Space),
      ok: code === 0,
      seconds: (performance.now() - started) / MILLISECONDS_PER_SECOND,
    });
    if (measured) await writeTimings(timings, root, E2E_TIMINGS_FILE);
    return code;
  });
  const scanFirst =
    concurrency > 1 && groups[0]?.some((file) => FAST_SHIP_SCAN_UNITS.includes(file));
  const prefix = scanFirst ? await all(jobs.slice(0, 1), 1) : [];
  const codes = [
    ...prefix,
    ...(await all(jobs.slice(scanFirst ? 1 : 0), measured ? 1 : concurrency)),
  ];
  if (measured) {
    delete Bun.env[PROTOCOL_REPORT_ENV];
    if (!codes.every((code) => code === 0)) {
      await rm(protocols, { force: true });
    }
    codes.push(
      codes.every((code) => code === 0)
        ? await measurePhase(E2E_METRICS_PHASE, async () => enforce(dir), timings, true)
        : await discard(dir),
    );
  }
  try {
    return await finishRun(codes, measured, async () =>
      measurePhase(DocumentationPhase.Complete, docs, timings, true),
    );
  } finally {
    if (measured) await writeTimings(timings, root, E2E_TIMINGS_FILE);
  }
}

export async function runTierEntry(
  args: readonly string[] = Bun.argv.slice(2),
  execute = runTier,
): Promise<number> {
  return execute(
    args.filter(
      (arg) => ![FAST_SHIP_TEST_FLAG, FAST_SHIP_SCAN_FLAG, FAST_SHIP_REST_FLAG].includes(arg),
    ) as TestTier[],
    undefined,
    undefined,
    undefined,
    undefined,
    args.includes(FAST_SHIP_TEST_FLAG)
      ? args.includes(TestTier.Integration) && args.length === 2
        ? FAST_SHIP_INTEGRATION_CONCURRENCY
        : FAST_SHIP_TEST_CONCURRENCY
      : 1,
    args.includes(FAST_SHIP_SCAN_FLAG)
      ? true
      : args.includes(FAST_SHIP_REST_FLAG)
        ? false
        : undefined,
  );
}

if (import.meta.main) process.exit(await runTierEntry());
