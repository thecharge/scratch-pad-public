import { createHash } from "node:crypto";
import { lstat, readFile, readlink, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import {
  HEX_ENCODING,
  NUL,
  Text,
  VERIFICATION_HASH,
  VERIFICATION_PARENT,
  VERIFICATION_PATH_SEPARATOR,
} from "@platform/constants";
import { all } from "@platform/util";
import {
  DOCUMENT_BLOB_PREFIX,
  DOCUMENT_EXECUTABLE_BITS,
  DOCUMENT_EXECUTABLE_MODE,
  DOCUMENT_FILE_MODE,
  DOCUMENT_GIT_INDEX_ENTRIES,
  DOCUMENT_INDEX_ENTRY,
  DOCUMENT_SHA1,
  DOCUMENT_SHA1_LENGTH,
  DOCUMENT_SYMLINK_MODE,
} from "../../packages/constants/src/document-shipping.ts";
import { REPO_ROOT, run } from "./tools.ts";

async function contained(root: string, path: string): Promise<boolean> {
  const parent = relative(await realpath(root), await realpath(dirname(join(root, path))));
  return (
    !isAbsolute(path) &&
    parent !== VERIFICATION_PARENT &&
    !parent.startsWith(VERIFICATION_PARENT + VERIFICATION_PATH_SEPARATOR)
  );
}

async function matches(entry: string, root: string): Promise<boolean> {
  const parsed = DOCUMENT_INDEX_ENTRY.exec(entry);
  if (parsed === null) return false;
  const [, mode = Text.Empty, expected = Text.Empty, path = Text.Empty] = parsed;
  if (!(await contained(root, path))) return false;
  const file = join(root, path);
  const info = await lstat(file);
  const actualMode = info.isSymbolicLink()
    ? DOCUMENT_SYMLINK_MODE
    : info.isFile()
      ? (info.mode & DOCUMENT_EXECUTABLE_BITS) === 0
        ? DOCUMENT_FILE_MODE
        : DOCUMENT_EXECUTABLE_MODE
      : Text.Empty;
  if (mode !== actualMode) return false;
  const content = info.isSymbolicLink() ? Buffer.from(await readlink(file)) : await readFile(file);
  const algorithm = expected.length === DOCUMENT_SHA1_LENGTH ? DOCUMENT_SHA1 : VERIFICATION_HASH;
  const hash = createHash(algorithm)
    .update(DOCUMENT_BLOB_PREFIX + content.length + NUL)
    .update(content)
    .digest(HEX_ENCODING);
  return hash === expected;
}

export async function documentIndexMatches(root = REPO_ROOT, execute = run): Promise<boolean> {
  try {
    const result = await execute(DOCUMENT_GIT_INDEX_ENTRIES, { cwd: root });
    if (result.exitCode !== 0) return false;
    const entries = result.stdout.split(NUL).filter(Boolean);
    return (await all(entries.map((entry) => async () => matches(entry, root)))).every(Boolean);
  } catch {
    return false;
  }
}
