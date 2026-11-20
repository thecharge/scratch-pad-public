import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  API_RECORDING_LABEL,
  DOCS_CONTENT_DIR,
  KB_TEMP_PREFIX,
  MessageId,
  OpenApiMode,
  Runner,
  StdioMode,
  Text,
  UI_RECORDING_LABEL,
  UI_RECORDING_RESULTS_FILE,
  UI_RECORDING_TIMEOUT_MS,
} from "@platform/constants";
import { message } from "@platform/messages";
import { RecordedPathsSchema, type SurfaceUrls, SurfaceUrlsSchema } from "@platform/types";
import { all } from "@platform/util";
import { scanText } from "./secret-scan.ts";
import { REPO_ROOT } from "./tools.ts";

const SELF = import.meta.path;

export async function recordApi(
  staging: string,
  urls?: SurfaceUrls,
  listOf?: () => Promise<readonly unknown[]>,
): Promise<string[]> {
  const { recordAll, scenarios } = await import("@platform/kb-recorder");
  return recordAll(
    (listOf === undefined ? scenarios() : await listOf()) as ReturnType<typeof scenarios>,
    staging,
    undefined,
    urls,
  );
}

export async function uiCommand(staging: string, urls?: SurfaceUrls): Promise<string[]> {
  return [Runner.Bun, Runner.Run, SELF, OpenApiMode.Ui, staging, JSON.stringify(urls ?? null)];
}

export async function recordStaged(
  staging: string,
  urls?: SurfaceUrls,
  apiLimitMs: number = UI_RECORDING_TIMEOUT_MS,
  uiLimitMs: number = UI_RECORDING_TIMEOUT_MS,
  api: typeof recordApi = recordApi,
  command: typeof uiCommand = uiCommand,
): Promise<string[]> {
  const { withDeadline } = await import("@platform/kb-recorder");
  const written = await withDeadline(api(staging, urls), API_RECORDING_LABEL, apiLimitMs);
  const result = join(staging, UI_RECORDING_RESULTS_FILE);
  await rm(result, { force: true });
  const child = Bun.spawn(await command(staging, urls), {
    stdout: StdioMode.Inherit,
    stderr: StdioMode.Inherit,
  });
  const code = await withDeadline(child.exited, UI_RECORDING_LABEL, uiLimitMs, async () => {
    child.kill();
  });
  if (code !== 0) {
    throw new Error(message(MessageId.UiScenarioProcessFailed));
  }
  const paths = RecordedPathsSchema.parse(await Bun.file(result).json());
  await rm(result);
  return [...written, ...paths];
}

export async function recordInto(
  directory: string,
  urls?: SurfaceUrls,
  stage: (staging: string, urls?: SurfaceUrls) => Promise<string[]> = recordStaged,
): Promise<string[]> {
  const staging = await mkdtemp(join(tmpdir(), KB_TEMP_PREFIX));
  try {
    const staged = await stage(staging, urls);
    await cp(staging, directory, { recursive: true });
    return staged.map((path) => path.replace(staging, directory));
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function recordUiOnly(
  directory: string,
  urlsJson: string,
  listOf?: () => Promise<readonly unknown[]>,
): Promise<number> {
  const { recordUi, uiScenarios } = await import("@platform/kb-recorder");
  await Bun.write(
    join(directory, UI_RECORDING_RESULTS_FILE),
    JSON.stringify(
      await recordUi(
        (listOf === undefined ? uiScenarios() : await listOf()) as ReturnType<typeof uiScenarios>,
        directory,
        undefined,
        SurfaceUrlsSchema.nullable().parse(JSON.parse(urlsJson)) ?? undefined,
      ),
    ),
  );
  return 0;
}

export async function scanPages(paths: readonly string[]): Promise<number> {
  const texts = await all(paths.map((path) => async () => Bun.file(path).text()));
  return scanText(texts.join(Text.Newline));
}

async function check(record: typeof recordInto): Promise<number> {
  const workDir = await mkdtemp(join(tmpdir(), KB_TEMP_PREFIX));
  try {
    const paths = await record(workDir);
    const code = await scanPages(paths);
    console.log(
      message(code === 0 ? MessageId.KbRecorded : MessageId.KbSecretFound, { count: paths.length }),
    );
    return code;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function write(record: typeof recordInto, docsDir: string): Promise<number> {
  const { resolveDocsUrls } = await import("@platform/config/factual");
  const paths = await record(docsDir, (await resolveDocsUrls()).urls);
  console.log(message(MessageId.KbRecorded, { count: paths.length }));
  return await scanPages(paths);
}

export async function runRecordKb(
  args: readonly string[],
  record: typeof recordInto = recordInto,
  docsDir: string = join(REPO_ROOT, DOCS_CONTENT_DIR),
  draw: typeof recordUiOnly = recordUiOnly,
): Promise<number> {
  const [mode, directory = Text.Empty, urlsJson = Text.Empty] = args;
  const modes: Record<string, () => Promise<number>> = {
    [OpenApiMode.Check]: async () => check(record),
    [OpenApiMode.Ui]: async () => draw(directory, urlsJson),
  };
  return (modes[mode ?? Text.Empty] ?? (async () => write(record, docsDir)))();
}

if (import.meta.main) process.exit(await runRecordKb(Bun.argv.slice(2)));
