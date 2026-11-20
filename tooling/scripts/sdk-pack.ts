import { cp, mkdir, mkdtemp, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  MessageId,
  RepoFile,
  RepoPath,
  Runner,
  SDK_PACK_ARGS,
  SDK_PACK_PREFIX,
  SDK_PACKED_DIR,
  SDK_TARBALL_SUFFIX,
  Separator,
  TAR_DIRECTORY_FLAG,
  TAR_EXTRACT,
  Text,
  VERIFY_REPORT_DIR,
  WORKSPACE_PROTOCOL,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { PackedSdk } from "@platform/types";
import { all } from "@platform/util";
import { buildSdk } from "./build-sdk.ts";
import { REPO_ROOT, run } from "./tools.ts";

export async function packSdk(
  build: () => Promise<void> = buildSdk,
  tar: string = Runner.Tar,
  packageDir: string = join(REPO_ROOT, RepoPath.SdkPackage),
): Promise<PackedSdk> {
  const parent = join(REPO_ROOT, VERIFY_REPORT_DIR);
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, SDK_PACK_PREFIX));
  let source = packageDir;
  if (build === buildSdk) {
    source = join(directory, RepoPath.SdkPackage);
    await mkdir(source, { recursive: true });
    await all(
      [RepoFile.PackageJson, RepoFile.License, RepoPath.Readme].map(
        (file) => async () => cp(join(packageDir, file), join(source, file)),
      ),
    );
    const manifestFile = join(source, RepoFile.PackageJson);
    const manifest = await Bun.file(manifestFile).json();
    const dependencies = Object.entries<string>(manifest.devDependencies ?? {});
    manifest.devDependencies = Object.fromEntries(
      await all(
        dependencies.map(([name, version]) => async () => [
          name,
          version.startsWith(WORKSPACE_PROTOCOL)
            ? (
                await Bun.file(
                  join(
                    REPO_ROOT,
                    RepoPath.Packages,
                    name.split(Separator.Resource).at(-1) ?? Text.Empty,
                    RepoFile.PackageJson,
                  ),
                ).json()
              ).version
            : version,
        ]),
      ),
    );
    await Bun.write(manifestFile, JSON.stringify(manifest));
    await buildSdk(join(source, RepoPath.SdkDist));
  } else {
    await build();
  }
  const packed = await run([...SDK_PACK_ARGS, directory], {
    cwd: source,
  });
  const names = await readdir(directory);
  const name = names.find((entry) => entry.endsWith(SDK_TARBALL_SUFFIX));
  if (packed.exitCode !== 0 || name === undefined) {
    throw new Error(message(MessageId.SdkPackFailed, { detail: packed.stderr + packed.stdout }));
  }
  const tarball = join(directory, name);
  const extracted = await run([tar, ...TAR_EXTRACT, tarball, TAR_DIRECTORY_FLAG, directory]);
  if (extracted.exitCode !== 0) {
    throw new Error(message(MessageId.SdkPackFailed, { detail: extracted.stderr }));
  }
  return { directory: join(directory, SDK_PACKED_DIR), tarball };
}
