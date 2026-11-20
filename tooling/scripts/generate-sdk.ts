import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FileSuffix,
  MessageId,
  NO_INSTALL_FLAG,
  OpenApiMode,
  RepoPath,
  Runner,
  SDK_GENERATOR,
  SDK_OUTPUT_ENV,
  SDK_TEMP_PREFIX,
  Separator,
  Text,
  ToolBinary,
  TSC_NO_EMIT_FLAG,
  TSC_PROJECT_FLAG,
} from "@platform/constants";
import { message } from "@platform/messages";
import { all } from "@platform/util";
import { stripComments } from "./strip-comments.ts";
import { REPO_ROOT, run } from "./tools.ts";

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(directory.length + 1))
    .sort();
}

async function generateInto(outputDir: string): Promise<void> {
  const result = await run([Runner.Bunx, SDK_GENERATOR], {
    cwd: join(REPO_ROOT, RepoPath.SdkPackage),
    env: { [SDK_OUTPUT_ENV]: outputDir },
  });
  if (result.exitCode !== 0) {
    throw new Error(
      message(MessageId.SdkGenerationFailed, { detail: result.stderr + result.stdout }),
    );
  }
  const files = (await filesIn(outputDir)).filter((file) => file.endsWith(FileSuffix.TypeScript));
  await all(
    files.map((file) => async () => {
      const path = join(outputDir, file);
      await Bun.write(path, await stripComments(path, await Bun.file(path).text()));
    }),
  );
}

async function contents(directory: string): Promise<string[]> {
  const files = await filesIn(directory);
  const texts = await all(files.map((file) => async () => Bun.file(join(directory, file)).text()));
  return files.map((file, index) => [file, texts[index]].join(Separator.Detail));
}

export async function generatedCodeTypechecks(
  project: string = join(REPO_ROOT, RepoPath.SdkPackage, RepoPath.SdkTsconfig),
): Promise<boolean> {
  const result = await run([
    Runner.Bunx,
    NO_INSTALL_FLAG,
    ToolBinary.Tsc,
    TSC_PROJECT_FLAG,
    project,
    TSC_NO_EMIT_FLAG,
  ]);
  return result.exitCode === 0;
}

export async function sdkMatchesOpenApi(
  committedDir: string = join(REPO_ROOT, RepoPath.SdkGenerated),
): Promise<boolean> {
  const workDir = await mkdtemp(join(tmpdir(), SDK_TEMP_PREFIX));
  try {
    await generateInto(workDir);
    const fresh = await contents(workDir);
    const committed = await contents(committedDir);
    return fresh.join(Text.Newline) === committed.join(Text.Newline);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function runGenerateSdk(
  mode: string | undefined,
  target: string = join(REPO_ROOT, RepoPath.SdkGenerated),
): Promise<number> {
  if (mode === OpenApiMode.Check) {
    const inSync = (await sdkMatchesOpenApi(target)) && (await generatedCodeTypechecks());
    console.log(message(inSync ? MessageId.SdkInSync : MessageId.SdkDrift));
    return inSync ? 0 : 1;
  }
  await generateInto(target);
  console.log(message(MessageId.SdkGenerated, { path: RepoPath.SdkGenerated }));
  return 0;
}

if (import.meta.main) process.exit(await runGenerateSdk(Bun.argv[2]));
