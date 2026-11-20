import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { arch, platform as runtimePlatform, tmpdir } from "node:os";
import { join } from "node:path";
import { releaseUrl } from "@platform/config/urls";
import {
  BUNDLE_RELEASES,
  BUNDLED_TOOLS,
  MessageId,
  type Platform,
  Runner,
  Separator,
  TAR_DIRECTORY_FLAG,
  TAR_EXTRACT,
  TOOL_TEMP_PREFIX,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { BundledTool } from "@platform/types";
import { all } from "@platform/util";
import { downloadTool } from "../../../tooling/scripts/download-tool.ts";
import { LOCAL_BUNDLE_DIR, run } from "../../../tooling/scripts/tools.ts";

async function installBundle(
  tool: BundledTool,
  platform: Platform,
  root: string,
  fetcher: typeof fetch,
  releases: typeof BUNDLE_RELEASES,
  execute: typeof run,
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
    await mkdir(root, { recursive: true });
    const extracted = await execute([
      Runner.Tar,
      ...TAR_EXTRACT,
      archivePath,
      TAR_DIRECTORY_FLAG,
      root,
    ]);
    if (extracted.exitCode !== 0) {
      throw new Error(message(MessageId.ExtractFailed, { detail: extracted.stderr }));
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function ensureBundle(
  tool: BundledTool,
  root: string,
  fetcher: typeof fetch,
  releases: typeof BUNDLE_RELEASES,
  execute: typeof run,
): Promise<boolean> {
  const target = join(root, tool, tool);
  const platform = [runtimePlatform(), arch()].join(Separator.Platform) as Platform;
  if (await Bun.file(target).exists()) {
    console.log(message(MessageId.ToolPresent, { tool, path: target }));
    return true;
  }
  if (!(platform in releases[tool].files)) {
    console.error(message(MessageId.NoArchive, { tool, platform }));
    return false;
  }
  await installBundle(tool, platform, root, fetcher, releases, execute);
  console.log(
    message(MessageId.ToolInstalled, { tool, version: releases[tool].version, path: target }),
  );
  return true;
}

export async function installBundles(
  root: string = LOCAL_BUNDLE_DIR,
  fetcher: typeof fetch = fetch,
  tools: readonly BundledTool[] = BUNDLED_TOOLS,
  releases: typeof BUNDLE_RELEASES = BUNDLE_RELEASES,
  execute: typeof run = run,
): Promise<number> {
  const results = await all(
    tools.map((item) => async () => ensureBundle(item, root, fetcher, releases, execute)),
  );
  return results.every(Boolean) ? 0 : 1;
}
