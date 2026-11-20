import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import {
  DigestEncoding,
  DOCS_CONTENT_DIR,
  DOCS_DIST,
  DOCS_PUBLICATION_AUTOMATED,
  DOCS_PUBLICATION_BAD,
  DOCS_PUBLICATION_CANDIDATE,
  DOCS_PUBLICATION_CONTENT,
  DOCS_PUBLICATION_CURRENT,
  DOCS_PUBLICATION_DEPENDENCIES,
  DOCS_PUBLICATION_DIRECTORY,
  DOCS_PUBLICATION_ERROR_CODE_FIELD,
  DOCS_PUBLICATION_EXCLUSIVE_WRITE,
  DOCS_PUBLICATION_GROUPS,
  DOCS_PUBLICATION_INDEX,
  DOCS_PUBLICATION_INPUTS,
  DOCS_PUBLICATION_LOCK,
  DOCS_PUBLICATION_MANIFEST,
  DOCS_PUBLICATION_PENDING,
  DOCS_PUBLICATION_REMOVE_DELAY_MS,
  DOCS_PUBLICATION_REMOVE_RETRIES,
  DOCS_PUBLICATION_REMOVE_TRANSIENT,
  DOCS_PUBLICATION_REPORTS,
  DOCS_PUBLICATION_SITE,
  DOCS_PUBLICATION_SOURCE,
  DOCS_PUBLICATION_TEMPLATES,
  DOCS_PUBLICATION_VERSION,
  DOCS_PUBLICATION_WORKSPACE,
  DOCS_TIMINGS_FILE,
  HashAlgorithm,
  INTERNAL_DOCS_DIR,
  PathSegment,
  Separator,
  VERIFY_REPORT_DIR,
} from "@platform/constants";
import { type DocsPublicationFile, DocsPublicationManifestSchema } from "@platform/types";

async function removeTree(path: string, remove: typeof rm, remaining: number): Promise<void> {
  try {
    await remove(path, { recursive: true, force: true });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !(DOCS_PUBLICATION_ERROR_CODE_FIELD in error) ||
      error.code !== DOCS_PUBLICATION_REMOVE_TRANSIENT ||
      remaining < 1
    )
      throw error;
    await Bun.sleep(DOCS_PUBLICATION_REMOVE_DELAY_MS);
    await removeTree(path, remove, remaining - 1);
  }
}
export async function removeDocsPublicationTree(
  path: string,
  remove: typeof rm = rm,
): Promise<void> {
  await removeTree(path, remove, DOCS_PUBLICATION_REMOVE_RETRIES);
}
async function within(root: string, target: string) {
  const path = relative(root, target);
  if (path.length === 0 || path.startsWith(PathSegment.Parent) || isAbsolute(path))
    throw new Error(DOCS_PUBLICATION_BAD);
  return path;
}
async function copyExisting(root: string, target: string, file: string) {
  const source = join(root, file);
  const stat = await lstat(source).catch(() => undefined);
  if (stat === undefined) return;
  if (stat.isSymbolicLink()) throw new Error(DOCS_PUBLICATION_BAD);
  await mkdir(dirname(join(target, file)), { recursive: true });
  await cp(source, join(target, file), { recursive: true });
}
async function seed(root: string, workspace: string) {
  for (const file of [...DOCS_PUBLICATION_SOURCE, ...DOCS_PUBLICATION_INPUTS])
    await copyExisting(root, workspace, file);
  await removeDocsPublicationTree(join(workspace, DOCS_CONTENT_DIR));
  await mkdir(join(workspace, DOCS_CONTENT_DIR), { recursive: true });
  for (const file of DOCS_PUBLICATION_TEMPLATES) await copyExisting(root, workspace, file);
  for (const file of DOCS_PUBLICATION_DEPENDENCIES) await linkDependency(root, workspace, file);
}
async function linkDependency(root: string, workspace: string, file: string) {
  const source = join(root, file);
  if ((await lstat(source).catch(() => undefined)) === undefined) return;
  await mkdir(dirname(join(workspace, file)), { recursive: true });
  await symlink(source, join(workspace, file));
}
async function inventory(root: string): Promise<DocsPublicationFile[]> {
  const files: DocsPublicationFile[] = [];
  const pending = DOCS_PUBLICATION_GROUPS.map((group) => join(root, group));
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error(DOCS_PUBLICATION_BAD);
    if (stat.isDirectory())
      pending.push(...(await readdir(current)).map((name) => join(current, name)));
    else files.push(await fingerprint(root, current));
  }
  return files.sort((a, b) => a.file.localeCompare(b.file));
}
async function fingerprint(root: string, file: string): Promise<DocsPublicationFile> {
  if (!(await lstat(file)).isFile()) throw new Error(DOCS_PUBLICATION_BAD);
  await within(await realpath(root), await realpath(file));
  return {
    file: relative(root, file),
    sha256: new Bun.CryptoHasher(HashAlgorithm.Sha256)
      .update(await Bun.file(file).arrayBuffer())
      .digest(DigestEncoding.Hex),
  };
}
async function bundle(workspace: string, candidate: string) {
  const exports = [
    [DOCS_CONTENT_DIR, DOCS_PUBLICATION_CONTENT],
    [DOCS_DIST, DOCS_PUBLICATION_SITE],
    [INTERNAL_DOCS_DIR, DOCS_PUBLICATION_REPORTS],
  ];
  for (const [source, target] of exports) {
    if (source === undefined || target === undefined) throw new Error(DOCS_PUBLICATION_BAD);
    await cp(join(workspace, source), join(candidate, target), { recursive: true });
  }
  if (!(await Bun.file(join(candidate, DOCS_PUBLICATION_INDEX)).exists()))
    throw new Error(DOCS_PUBLICATION_BAD);
  const manifest = DocsPublicationManifestSchema.parse({
    version: DOCS_PUBLICATION_VERSION,
    status: DOCS_PUBLICATION_AUTOMATED,
    createdAt: new Date().toISOString(),
    files: await inventory(candidate),
  });
  await Bun.write(join(candidate, DOCS_PUBLICATION_MANIFEST), JSON.stringify(manifest, null, 2));
}
async function checkBundle(candidate: string) {
  const manifestPath = join(candidate, DOCS_PUBLICATION_MANIFEST);
  if (!(await lstat(manifestPath)).isFile()) throw new Error(DOCS_PUBLICATION_BAD);
  const manifest = DocsPublicationManifestSchema.parse(
    await Bun.file(join(candidate, DOCS_PUBLICATION_MANIFEST)).json(),
  );
  const actual = await inventory(candidate);
  if (
    !actual.some((file) => file.file === DOCS_PUBLICATION_INDEX) ||
    JSON.stringify(actual) !== JSON.stringify(manifest.files)
  )
    throw new Error(DOCS_PUBLICATION_BAD);
}
async function safeDestination(root: string, file: string) {
  const parts = file.split(Separator.Resource);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    const stat = await lstat(current).catch(() => undefined);
    if (stat?.isSymbolicLink()) throw new Error(DOCS_PUBLICATION_BAD);
  }
}
async function mirror(candidate: string, root: string) {
  await safeDestination(root, DOCS_CONTENT_DIR);
  await safeDestination(root, INTERNAL_DOCS_DIR);
  await cp(join(candidate, DOCS_PUBLICATION_CONTENT), join(root, DOCS_CONTENT_DIR), {
    recursive: true,
  });
  await cp(join(candidate, DOCS_PUBLICATION_REPORTS), join(root, INTERNAL_DOCS_DIR), {
    recursive: true,
  });
}
async function select(directory: string, candidate: string) {
  const pending = join(directory, DOCS_PUBLICATION_PENDING + crypto.randomUUID());
  try {
    await symlink(await within(directory, candidate), pending);
    await rename(pending, join(directory, DOCS_PUBLICATION_CURRENT));
  } catch (error) {
    await rm(pending, { force: true });
    throw error;
  }
}
async function timings(workspace: string, root: string) {
  const file = join(VERIFY_REPORT_DIR, DOCS_TIMINGS_FILE);
  await copyExisting(workspace, root, file);
}
async function producePublication(
  root: string,
  directory: string,
  produce: (workspace: string) => Promise<number>,
): Promise<number> {
  const candidate = await mkdtemp(join(directory, DOCS_PUBLICATION_CANDIDATE));
  const workspace = join(candidate, DOCS_PUBLICATION_WORKSPACE);
  let selected = false;
  try {
    await seed(root, workspace);
    const code = await produce(workspace);
    if (code !== 0) return code;
    await bundle(workspace, candidate);
    await checkBundle(candidate);
    await mirror(candidate, root);
    await timings(workspace, root);
    await removeDocsPublicationTree(workspace);
    await select(directory, candidate);
    selected = true;
    return 0;
  } finally {
    if (!selected) await timings(workspace, root);
    if (!selected) await removeDocsPublicationTree(candidate);
  }
}
export async function withDocsPublication(
  root: string,
  produce: (workspace: string) => Promise<number>,
): Promise<number> {
  root = await realpath(root);
  const directory = join(root, DOCS_PUBLICATION_DIRECTORY);
  await mkdir(directory, { recursive: true });
  await within(root, await realpath(directory));
  const lockPath = join(directory, DOCS_PUBLICATION_LOCK);
  const lock = await open(lockPath, DOCS_PUBLICATION_EXCLUSIVE_WRITE);
  try {
    const previous = await lstat(join(directory, DOCS_PUBLICATION_CURRENT)).catch(() => undefined);
    if (previous !== undefined) await publishedDocs(root);
    return await producePublication(root, directory, produce);
  } finally {
    await lock.close();
    await rm(lockPath);
  }
}
export async function publishedDocs(root: string): Promise<string> {
  root = await realpath(root);
  const directory = join(root, DOCS_PUBLICATION_DIRECTORY);
  await within(root, await realpath(directory));
  const current = join(directory, DOCS_PUBLICATION_CURRENT);
  if (!(await lstat(current)).isSymbolicLink()) throw new Error(DOCS_PUBLICATION_BAD);
  const candidate = await realpath(current);
  const path = await within(await realpath(directory), candidate);
  if (!path.startsWith(DOCS_PUBLICATION_CANDIDATE) || path.includes(Separator.Resource))
    throw new Error(DOCS_PUBLICATION_BAD);
  await checkBundle(candidate);
  return join(candidate, DOCS_PUBLICATION_SITE);
}
