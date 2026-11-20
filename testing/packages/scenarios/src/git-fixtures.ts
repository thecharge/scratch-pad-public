import { run } from "../../../../tooling/scripts/tools.ts";
import { makeDir, writeFiles } from "./repo-fixtures.ts";

const IDENTITY = ["-c", "user.name=Unit", "-c", "user.email=unit@example.test"];

export async function gitRepo(
  files: Readonly<Record<string, string>>,
  staged: boolean,
  committed: boolean,
): Promise<string> {
  const root = await makeDir();
  await writeFiles(root, files);
  await run(["git", "init", "-q"], { cwd: root });
  const steps = [
    ...(staged ? [["git", "add", "-A"]] : []),
    ...(committed ? [["git", ...IDENTITY, "commit", "-q", "-m", "unit"]] : []),
  ];
  await steps.reduce(async (previous, command) => {
    await previous;
    await run(command, { cwd: root });
  }, Promise.resolve());
  return root;
}

export async function gitRepoWithOrigin(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await gitRepo(files, true, true);
  await run(["git", "update-ref", "refs/remotes/origin/main", "HEAD"], { cwd: root });
  return root;
}
