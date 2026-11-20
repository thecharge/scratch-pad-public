import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  DEPENDENCY_FIELDS,
  LICENSE_FILES,
  MessageId,
  REQUIRED_DOCUMENTS,
  RepoFile,
  RepoPath,
  SDK_LICENSE_ID,
  SDK_LICENSE_MARKERS,
  SDK_MANIFEST_PATH,
  SDK_PACKAGE_DIR,
  SDK_REQUIRED_FIELDS,
  Text,
  WORKSPACE_DIRS,
  WORKSPACE_PROTOCOL,
} from "@platform/constants";
import { message } from "@platform/messages";
import { type PackageManifest, PackageManifestSchema } from "@platform/types";
import { all } from "@platform/util";
import { packagesWithoutReadme } from "./check-readmes.ts";
import { finish, REPO_ROOT } from "./tools.ts";

async function childDirectories(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function existing(root: string, paths: readonly string[]): Promise<string[]> {
  const present = await all(paths.map((path) => async () => Bun.file(join(root, path)).exists()));
  return paths.filter((_path, index) => present[index]);
}

async function manifestPaths(root: string): Promise<string[]> {
  const nested = await all(
    WORKSPACE_DIRS.map(
      (dir) => async () =>
        (await childDirectories(join(root, dir))).map((name) =>
          join(dir, name, RepoFile.PackageJson),
        ),
    ),
  );
  return existing(root, [RepoFile.PackageJson, ...nested.flat()]);
}

async function sdkProblems(path: string, manifest: PackageManifest): Promise<string[]> {
  const missing = SDK_REQUIRED_FIELDS.filter((field) => manifest[field] === undefined).map(
    (field) => message(MessageId.RepoSdkField, { path, field }),
  );
  const workspace = DEPENDENCY_FIELDS.flatMap((field) =>
    Object.entries(manifest[field] ?? {})
      .filter(([_name, range]) => range.startsWith(WORKSPACE_PROTOCOL))
      .map(([name]) => message(MessageId.RepoSdkWorkspaceDependency, { path, name })),
  );
  return [
    ...(manifest.private === true ? [message(MessageId.RepoSdkPrivate, { path })] : []),
    ...(manifest.license === SDK_LICENSE_ID
      ? []
      : [message(MessageId.RepoSdkLicenseField, { path, license: SDK_LICENSE_ID })]),
    ...missing,
    ...workspace,
  ];
}

async function otherProblems(path: string, manifest: PackageManifest): Promise<string[]> {
  return [
    ...(manifest.private === true ? [] : [message(MessageId.RepoNotPrivate, { path })]),
    ...(manifest.license === undefined ? [] : [message(MessageId.RepoLicenseField, { path })]),
  ];
}

async function manifestProblems(root: string, path: string): Promise<string[]> {
  const manifest = PackageManifestSchema.parse(JSON.parse(await Bun.file(join(root, path)).text()));
  return path === SDK_MANIFEST_PATH
    ? await sdkProblems(path, manifest)
    : await otherProblems(path, manifest);
}

async function strayLicenseFiles(root: string, manifests: readonly string[]): Promise<string[]> {
  const candidates = manifests
    .filter((path) => path !== SDK_MANIFEST_PATH)
    .flatMap((path) => LICENSE_FILES.map((file) => join(dirname(path), file)));
  return existing(root, candidates);
}

async function sdkLicenseProblems(root: string): Promise<string[]> {
  const file = join(SDK_PACKAGE_DIR, RepoFile.License);
  const present = await existing(root, [file]);
  const text = present.length === 0 ? Text.Empty : await Bun.file(join(root, file)).text();
  const genuine = SDK_LICENSE_MARKERS.every((marker) => text.includes(marker));
  return genuine ? [] : [message(MessageId.RepoSdkLicenseFile, { file })];
}

export async function repoProblems(root: string): Promise<string[]> {
  const manifests = await manifestPaths(root);
  const licenseFiles = await strayLicenseFiles(root, manifests);
  const sdkLicense = await sdkLicenseProblems(root);
  const required = [RepoPath.Readme, SDK_MANIFEST_PATH, ...REQUIRED_DOCUMENTS];
  const present = await existing(root, required);
  const withoutReadme = await packagesWithoutReadme(join(root, RepoPath.Packages));
  const perManifest = await all(manifests.map((path) => async () => manifestProblems(root, path)));
  return [
    ...perManifest.flat(),
    ...licenseFiles.map((file) => message(MessageId.RepoLicenseFile, { file })),
    ...sdkLicense,
    ...required
      .filter((file) => !present.includes(file))
      .map((file) => message(MessageId.RepoFileMissing, { file })),
    ...withoutReadme.map((name) => message(MessageId.ReadmeMissing, { package: name })),
  ];
}

export async function checkRepo(root: string = REPO_ROOT): Promise<number> {
  return finish(await repoProblems(root), message(MessageId.RepoOk));
}

if (import.meta.main) process.exit(await checkRepo());
