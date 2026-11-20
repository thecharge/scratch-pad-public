import { createHash } from "node:crypto";
import { lstat, readFile, readlink, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import {
  HEX_ENCODING,
  NUL,
  Text,
  VERIFICATION_COMMIT_SUFFIX,
  VERIFICATION_CURRENT,
  VERIFICATION_GIT_COMMIT,
  VERIFICATION_GIT_DIFF,
  VERIFICATION_GIT_FILES,
  VERIFICATION_GIT_HEAD,
  VERIFICATION_GIT_UNTRACKED,
  VERIFICATION_HASH,
  VERIFICATION_PARENT,
  VERIFICATION_PATH_END,
  VERIFICATION_PATH_SEPARATOR,
  VerificationInputKind,
  VerificationReason,
} from "@platform/constants";
import type { VerificationFile, VerificationRange, VerificationTree } from "@platform/types";
import { VerificationRangeSchema } from "@platform/types";
import { all } from "@platform/util";
import { REPO_ROOT, run } from "./tools.ts";

async function names(output: string): Promise<string[]> {
  return [...new Set(output.split(NUL).filter(Boolean))].sort();
}

async function canonical(path: string): Promise<boolean> {
  const parts = path.split(VERIFICATION_PATH_SEPARATOR);
  return (
    !isAbsolute(path) &&
    !path.includes(NUL) &&
    !parts.some(
      (part) =>
        part === Text.Empty || part === VERIFICATION_PARENT || part === VERIFICATION_CURRENT,
    )
  );
}

async function inputFile(root: string, path: string): Promise<VerificationFile> {
  if (!(await canonical(path))) throw new Error(VerificationReason.UnsafePath);
  const fullPath = join(root, path);
  const parent = relative(await realpath(root), await realpath(dirname(fullPath)));
  if (parent !== Text.Empty && !(await canonical(parent))) {
    throw new Error(VerificationReason.UnsafePath);
  }
  const stat = await lstat(fullPath);
  if (!stat.isFile() && !stat.isSymbolicLink()) {
    throw new Error(VerificationReason.UnsupportedInput);
  }
  const kind = stat.isSymbolicLink() ? VerificationInputKind.Symlink : VerificationInputKind.File;
  const content = stat.isSymbolicLink() ? await readlink(fullPath) : await readFile(fullPath);
  return {
    path,
    mode: stat.mode,
    kind,
    hash: createHash(VERIFICATION_HASH).update(content).digest(HEX_ENCODING),
  };
}

async function git(command: readonly string[], root: string, execute: typeof run): Promise<string> {
  const result = await execute(command, { cwd: root });
  if (result.exitCode !== 0) throw new Error(VerificationReason.InspectionFailed);
  return result.stdout;
}

async function validateRange(range: VerificationRange, root: string, execute: typeof run) {
  await all(
    [range.base, range.head].map((commit) => async () => {
      const resolved = await git(
        [...VERIFICATION_GIT_COMMIT, commit + VERIFICATION_COMMIT_SUFFIX],
        root,
        execute,
      );
      if (resolved.trim() !== commit) throw new Error(VerificationReason.InspectionFailed);
    }),
  );
}

async function inspect(
  range: VerificationRange | undefined,
  root: string,
  execute: typeof run,
): Promise<VerificationTree> {
  const parsed = range === undefined ? undefined : VerificationRangeSchema.parse(range);
  if (parsed !== undefined) await validateRange(parsed, root, execute);
  const head = parsed?.head ?? (await git(VERIFICATION_GIT_HEAD, root, execute)).trim();
  const discovered = await names(await git(VERIFICATION_GIT_FILES, root, execute));
  const untracked = await names(await git(VERIFICATION_GIT_UNTRACKED, root, execute));
  const dirty = await names(
    await git([...VERIFICATION_GIT_DIFF, head, VERIFICATION_PATH_END], root, execute),
  );
  const changed =
    parsed === undefined
      ? []
      : await names(
          await git(
            [...VERIFICATION_GIT_DIFF, parsed.base, parsed.head, VERIFICATION_PATH_END],
            root,
            execute,
          ),
        );
  const files = await all(discovered.map((path) => async () => inputFile(root, path)));
  const symbolic = files.filter(({ kind }) => kind === VerificationInputKind.Symlink);
  return {
    range: parsed,
    changed,
    dirty: [...new Set([...dirty, ...untracked])].sort(),
    files,
    problems: symbolic.map(({ path }) => path),
  };
}

export async function inspectVerificationTree(
  range?: VerificationRange,
  root = REPO_ROOT,
  execute = run,
): Promise<VerificationTree> {
  try {
    return await inspect(range, root, execute);
  } catch {
    return {
      changed: [],
      dirty: [],
      files: [],
      problems: [VerificationReason.InspectionFailed],
    };
  }
}
