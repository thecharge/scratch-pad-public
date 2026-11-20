import { afterAll, expect, test } from "bun:test";
import { gitRepo, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  DocumentPhase,
  DocumentScopeReason,
} from "../../../packages/constants/src/document-shipping.ts";
import { inspectDocumentScope } from "../../../tooling/scripts/document-scope.ts";
import { run } from "../../../tooling/scripts/tools.ts";
import { parsePushUpdates } from "../../../tooling/scripts/verification-push.ts";

import { prepareEarlier, prepareTransition, prepareUnsafe } from "./document-scope-fixtures.ts";

afterAll(removeAll);
const initial = {
  "docs/old.md": "old guide",
  "apps/api/source.ts": "old source",
  ".gitignore": ".stack/\n",
};
const cases = [
  ["guide", "docs/old.md", true],
  ["spec", "openspec/changes/product/specs/new/spec.md", true],
  ["source", "apps/api/source.ts", false],
  ["tooling", "tooling/scripts/verify.ts", false],
  ["unknown", "notes.txt", false],
  ["generated", "docs/e2e/api.md", false],
  ["evidence", "openspec/changes/product/evidence/record.md", false],
  ["instructions", "AGENTS.md", false],
] as const;

test.each(cases)("actual staged and push snapshots: %s", async (_name, path, eligible) => {
  const root = await gitRepo(initial, true, true);
  const base = (await run(["git", "rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  await writeFiles(root, { [path]: "new content" });
  expect((await run(["git", "add", "--all"], { cwd: root })).exitCode).toBe(0);
  expect((await inspectDocumentScope(DocumentPhase.Commit, undefined, root)).eligible).toBe(
    eligible,
  );
  expect(
    (
      await run(
        [
          "git",
          "-c",
          "user.name=Integration",
          "-c",
          "user.email=integration@example.test",
          "commit",
          "-qm",
          "test: change fixture",
        ],
        { cwd: root },
      )
    ).exitCode,
  ).toBe(0);
  const head = (await run(["git", "rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  const push = await parsePushUpdates(`refs/heads/main ${head} refs/heads/main ${base}\n`);
  const scope = await inspectDocumentScope(DocumentPhase.Push, push, root);
  expect(scope.eligible).toBe(eligible);
  expect(scope.changed).toContain(path);
});

test.each(["partial", "untracked", "assume", "skip"] as const)(
  "unsafe index state broadens: %s",
  async (kind) => {
    const root = await gitRepo(initial, true, true);
    await writeFiles(root, { "docs/old.md": "staged" });
    await run(["git", "add", "docs/old.md"], { cwd: root });
    await prepareUnsafe(root, kind);
    const scope = await inspectDocumentScope(DocumentPhase.Commit, undefined, root);
    expect(scope.eligible).toBe(false);
    expect(scope.reason).toBe(DocumentScopeReason.Dirty);
  },
);

test.each(["rename", "delete", "symlink", "executable"] as const)(
  "file transitions: %s",
  async (kind) => {
    const root = await gitRepo(initial, true, true);
    await prepareTransition(root, kind);
    expect((await inspectDocumentScope(DocumentPhase.Commit, undefined, root)).eligible).toBe(
      false,
    );
  },
);

test("earlier unpublished source cannot hide behind latest documentation commit", async () => {
  const root = await gitRepo(initial, true, true);
  const base = (await run(["git", "rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  await prepareEarlier(root);
  const head = (await run(["git", "rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  const push = await parsePushUpdates(`refs/heads/main ${head} refs/heads/main ${base}\n`);
  const scope = await inspectDocumentScope(DocumentPhase.Push, push, root);
  expect(scope.changed).toEqual(["apps/api/source.ts", "docs/old.md"]);
  expect(scope.eligible).toBe(false);
});

test.each(["creation", "deletion", "missing", "multiple", "wrong-head"] as const)(
  "ambiguous push broadens: %s",
  async (kind) => {
    const root = await gitRepo(initial, true, true);
    const head = (await run(["git", "rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    const zero = "0".repeat(40);
    const update = `refs/heads/main ${head} refs/heads/main ${head}\n`;
    const input =
      kind === "creation"
        ? update.replace(`${head}\n`, `${zero}\n`)
        : kind === "deletion"
          ? update.replace(` ${head} `, ` ${zero} `)
          : kind === "multiple"
            ? update + update
            : kind === "missing"
              ? ""
              : update.replace(` ${head} `, ` ${"f".repeat(40)} `);
    expect(
      (await inspectDocumentScope(DocumentPhase.Push, await parsePushUpdates(input), root))
        .eligible,
    ).toBe(false);
  },
);
