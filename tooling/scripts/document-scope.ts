import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  NUL,
  Text,
  VERIFICATION_COMMIT_PATTERN,
  VERIFICATION_CURRENT,
  VERIFICATION_GIT_HEAD,
  VERIFICATION_GIT_UNTRACKED,
  VERIFICATION_PARENT,
  VERIFICATION_PATH_END,
  VERIFICATION_PATH_SEPARATOR,
  VERIFY_REPORT_DIR,
} from "@platform/constants";
import {
  DOCUMENT_FILE_MODE,
  DOCUMENT_GIT_ANCESTOR,
  DOCUMENT_GIT_DIFF,
  DOCUMENT_GIT_DIRTY,
  DOCUMENT_GIT_FLAGS,
  DOCUMENT_GIT_INDEX,
  DOCUMENT_GIT_INDEX_TREE,
  DOCUMENT_GIT_NORMAL_FLAG,
  DOCUMENT_GIT_TREE,
  DOCUMENT_GIT_TREE_MODE,
  DOCUMENT_PATH_PATTERN,
  DOCUMENT_SCOPE_EXCLUDED,
  DOCUMENT_SCOPE_FILE,
  DOCUMENT_SCOPE_PATTERNS,
  DocumentPhase,
  DocumentScopeReason,
} from "../../packages/constants/src/document-shipping.ts";
import {
  type DocumentScope,
  DocumentScopeSchema,
} from "../../packages/types/src/document-shipping.ts";
import type { VerificationPush } from "../../packages/types/src/verification-push.ts";
import { documentIndexMatches } from "./document-index.ts";
import { REPO_ROOT, run } from "./tools.ts";

async function output(
  command: readonly string[],
  root: string,
  execute: typeof run,
): Promise<string> {
  const result = await execute(command, { cwd: root });
  if (result.exitCode !== 0) throw new Error(result.stderr);
  return result.stdout;
}

async function documentPath(path: string): Promise<boolean> {
  const parts = path.split(VERIFICATION_PATH_SEPARATOR);
  if (
    !DOCUMENT_PATH_PATTERN.test(path) ||
    parts.some(
      (part) => part === VERIFICATION_PARENT || part.length === 0 || part === VERIFICATION_CURRENT,
    )
  )
    return false;
  if (DOCUMENT_SCOPE_EXCLUDED.some((pattern) => new Bun.Glob(pattern).match(path))) return false;
  return DOCUMENT_SCOPE_PATTERNS.some((pattern) => new Bun.Glob(pattern).match(path));
}

async function supportedFiles(
  paths: readonly string[],
  refs: readonly string[],
  root: string,
  execute: typeof run,
): Promise<boolean> {
  for (const path of paths) if (!(await documentPath(path))) return false;
  for (const ref of refs) {
    const entries = (
      await output([...DOCUMENT_GIT_TREE, ref, VERIFICATION_PATH_END, ...paths], root, execute)
    )
      .split(NUL)
      .filter(Boolean);
    if (entries.some((entry) => DOCUMENT_GIT_TREE_MODE.exec(entry)?.[1] !== DOCUMENT_FILE_MODE))
      return false;
  }
  return true;
}

async function inspect(
  phase: DocumentPhase,
  push: VerificationPush | undefined,
  root: string,
  execute: typeof run,
  matchesIndex: typeof documentIndexMatches,
): Promise<DocumentScope> {
  const result: DocumentScope = {
    phase,
    eligible: false,
    reason: DocumentScopeReason.Inspection,
    head: Text.Empty,
    snapshot: Text.Empty,
    changed: [],
  };
  const head = (await output(VERIFICATION_GIT_HEAD, root, execute)).trim();
  if (!VERIFICATION_COMMIT_PATTERN.test(head)) return result;
  result.head = head;
  result.snapshot = (await output(DOCUMENT_GIT_INDEX, root, execute)).trim();
  if (!VERIFICATION_COMMIT_PATTERN.test(result.snapshot)) return result;
  const flags = (await output(DOCUMENT_GIT_FLAGS, root, execute)).split(NUL).filter(Boolean);
  if (flags.some((flag) => !flag.startsWith(DOCUMENT_GIT_NORMAL_FLAG)))
    return { ...result, reason: DocumentScopeReason.Dirty };
  if (!(await matchesIndex(root, execute))) return { ...result, reason: DocumentScopeReason.Dirty };
  const dirty = await execute(DOCUMENT_GIT_DIRTY, { cwd: root });
  const untracked = await output(VERIFICATION_GIT_UNTRACKED, root, execute);
  if (dirty.exitCode !== 0 || untracked.length > 0)
    return { ...result, reason: DocumentScopeReason.Dirty };
  let refs = [head, result.snapshot];
  if (phase === DocumentPhase.Push) {
    if (push?.range === undefined || push.reasons.length > 0 || push.range.head !== head)
      return { ...result, reason: DocumentScopeReason.MissingRange };
    const cleanIndex = await execute([...DOCUMENT_GIT_INDEX_TREE, head, VERIFICATION_PATH_END], {
      cwd: root,
    });
    const ancestor = await execute([...DOCUMENT_GIT_ANCESTOR, push.range.base, head], {
      cwd: root,
    });
    if (cleanIndex.exitCode !== 0) return { ...result, reason: DocumentScopeReason.Dirty };
    if (ancestor.exitCode !== 0) return { ...result, reason: DocumentScopeReason.MissingRange };
    result.range = push.range;
    refs = [push.range.base, head];
  }
  result.changed = (
    await output([...DOCUMENT_GIT_DIFF, ...refs, VERIFICATION_PATH_END], root, execute)
  )
    .split(NUL)
    .filter(Boolean);
  if (result.changed.length === 0) return { ...result, reason: DocumentScopeReason.Empty };
  if (!(await supportedFiles(result.changed, refs, root, execute)))
    return { ...result, reason: DocumentScopeReason.Unsupported };
  return { ...result, eligible: true, reason: DocumentScopeReason.Eligible };
}

export async function inspectDocumentScope(
  phase: DocumentPhase,
  push?: VerificationPush,
  root = REPO_ROOT,
  execute = run,
  matchesIndex = documentIndexMatches,
): Promise<DocumentScope> {
  try {
    return DocumentScopeSchema.parse(await inspect(phase, push, root, execute, matchesIndex));
  } catch {
    return {
      phase,
      eligible: false,
      reason: DocumentScopeReason.Inspection,
      head: Text.Empty,
      snapshot: Text.Empty,
      changed: [],
    };
  }
}

export async function recordDocumentScope(
  phase = DocumentPhase.Commit,
  push?: VerificationPush,
  root = REPO_ROOT,
  inspectScope = inspectDocumentScope,
): Promise<DocumentScope> {
  const scope = await inspectScope(phase, push, root);
  await mkdir(join(root, VERIFY_REPORT_DIR), { recursive: true });
  await Bun.write(
    join(root, VERIFY_REPORT_DIR, DOCUMENT_SCOPE_FILE),
    JSON.stringify(scope, null, 2),
  );
  return scope;
}

if (import.meta.main) await recordDocumentScope();
