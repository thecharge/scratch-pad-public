import { join } from "node:path";
import {
  MessageId,
  RepoPath,
  SDK_BUILD_FORMATS,
  SDK_BUILD_LOG_LEVEL,
  SDK_ENTRY,
  SDK_EXTERNALS,
} from "@platform/constants";
import { message } from "@platform/messages";
import { build } from "tsdown";
import { REPO_ROOT } from "./tools.ts";

export async function buildSdk(
  outDir: string = join(RepoPath.SdkPackage, RepoPath.SdkDist),
): Promise<void> {
  await build({
    config: false,
    cwd: REPO_ROOT,
    entry: [join(RepoPath.SdkPackage, SDK_ENTRY)],
    format: [...SDK_BUILD_FORMATS],
    dts: { eager: true },
    tsconfig: RepoPath.SdkBuildTsconfig,
    outDir,
    clean: true,
    fixedExtension: false,
    external: SDK_EXTERNALS,
    logLevel: SDK_BUILD_LOG_LEVEL,
  });
}

export async function runBuildSdk(
  outDir: string = join(RepoPath.SdkPackage, RepoPath.SdkDist),
  execute: typeof buildSdk = buildSdk,
): Promise<number> {
  await execute(outDir);
  console.log(message(MessageId.SdkBuilt, { path: outDir }));
  return 0;
}

if (import.meta.main) process.exit(await runBuildSdk());
