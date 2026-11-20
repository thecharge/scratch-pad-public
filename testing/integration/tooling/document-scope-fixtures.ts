import { rename, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { writeFiles } from "@platform/test-scenarios";
import { run } from "../../../tooling/scripts/tools.ts";

export async function prepareUnsafe(root: string, kind: string): Promise<void> {
  if (kind === "partial") await writeFiles(root, { "docs/old.md": "unstaged" });
  if (kind === "untracked") await writeFiles(root, { "untracked.txt": "untracked" });
  if (kind === "assume")
    await run(["git", "update-index", "--assume-unchanged", "apps/api/source.ts"], { cwd: root });
  if (kind === "skip")
    await run(["git", "update-index", "--skip-worktree", "apps/api/source.ts"], { cwd: root });
}

export async function prepareTransition(root: string, kind: string): Promise<void> {
  if (kind === "rename")
    await rename(join(root, "apps/api/source.ts"), join(root, "docs/source.md"));
  if (kind === "delete") await rm(join(root, "apps/api/source.ts"));
  if (kind === "symlink") await symlink("../apps/api/source.ts", join(root, "docs/link.md"));
  if (kind === "executable") await writeFiles(root, { "docs/old.md": "executable" });
  await run(["git", "add", "--all"], { cwd: root });
  if (kind === "executable")
    await run(["git", "update-index", "--chmod=+x", "docs/old.md"], { cwd: root });
}

export async function prepareEarlier(root: string): Promise<void> {
  for (const path of ["apps/api/source.ts", "docs/old.md"]) {
    await writeFiles(root, { [path]: "changed" });
    await run(["git", "add", path], { cwd: root });
    const result = await run(
      [
        "git",
        "-c",
        "user.name=Integration",
        "-c",
        "user.email=integration@example.test",
        "commit",
        "-qm",
        "test: fixture iteration",
      ],
      { cwd: root },
    );
    if (result.exitCode !== 0) throw new Error(result.stderr);
  }
}
