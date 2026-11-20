import { chmod, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { releaseUrl } from "@platform/config/urls";
import {
  EXECUTABLE_MODE,
  INSTALLABLE_TOOLS,
  MessageId,
  type Platform,
  Runner,
  Separator,
  TAR_DIRECTORY_FLAG,
  TAR_EXTRACT,
  TOOL_RELEASES,
  TOOL_TEMP_PREFIX,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { InstallableTool } from "@platform/types";
import { all } from "@platform/util";
import { downloadTool } from "./download-tool.ts";
import { LOCAL_TOOL_DIR, run } from "./tools.ts";

async function extract(archivePath: string, workDir: string, tool: InstallableTool): Promise<void> {
  const extracted = await run([
    Runner.Tar,
    ...TAR_EXTRACT,
    archivePath,
    TAR_DIRECTORY_FLAG,
    workDir,
    tool,
  ]);
  if (extracted.exitCode !== 0) {
    throw new Error(message(MessageId.ExtractFailed, { detail: extracted.stderr }));
  }
}

async function install(
  tool: InstallableTool,
  platform: Platform,
  target: string,
  fetcher: typeof fetch,
  releases: typeof TOOL_RELEASES,
): Promise<void> {
  const release = releases[tool];
  const file = release.files[platform];
  const bytes = await downloadTool(
    await releaseUrl(tool, release.version, file),
    file,
    release.sha256[platform],
    fetcher,
  );
  const workDir = await mkdtemp(join(tmpdir(), TOOL_TEMP_PREFIX));
  try {
    const archivePath = join(workDir, file);
    await Bun.write(archivePath, bytes);
    await extract(archivePath, workDir, tool);
    await mkdir(dirname(target), { recursive: true });
    await Bun.write(target, Bun.file(join(workDir, tool)));
    await chmod(target, EXECUTABLE_MODE);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function ensure(
  tool: InstallableTool,
  directory: string,
  fetcher: typeof fetch,
  releases: typeof TOOL_RELEASES,
): Promise<boolean> {
  const target = join(directory, tool);
  const platform = [process.platform, process.arch].join(Separator.Platform) as Platform;
  if (await Bun.file(target).exists()) {
    console.log(message(MessageId.ToolPresent, { tool, path: target }));
    return true;
  }
  if (!(platform in releases[tool].files)) {
    console.error(message(MessageId.NoArchive, { tool, platform }));
    return false;
  }
  await install(tool, platform, target, fetcher, releases);
  const version = releases[tool].version;
  console.log(message(MessageId.ToolInstalled, { tool, version, path: target }));
  return true;
}

export async function installTools(
  directory: string = LOCAL_TOOL_DIR,
  fetcher: typeof fetch = fetch,
  tools: readonly InstallableTool[] = INSTALLABLE_TOOLS,
  releases: typeof TOOL_RELEASES = TOOL_RELEASES,
): Promise<number> {
  const results = await all(
    tools.map((item) => async () => ensure(item, directory, fetcher, releases)),
  );
  return results.every(Boolean) ? 0 : 1;
}

if (import.meta.main) process.exit(await installTools());
