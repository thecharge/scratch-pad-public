import { resolve } from "node:path";
import { DEFAULT_SKILL_DIRS, EnvVar, MessageId, Separator } from "@platform/constants";
import { message } from "@platform/messages";
import { loadPackageSkills, skillPackageProblems } from "@platform/skill-protocol";
import { all } from "@platform/util";
import { finish, REPO_ROOT } from "./tools.ts";

export async function configuredSkillRoots(list: string): Promise<string[]> {
  return list
    .split(Separator.List)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => resolve(REPO_ROOT, item));
}

export async function skillPackageViolations(roots: readonly string[]): Promise<string[]> {
  const found = await all(roots.map((root) => async () => skillPackageProblems(root)));
  return found.flat();
}

export async function checkSkillPackages(
  list: string = Bun.env[EnvVar.SkillDirs] ?? DEFAULT_SKILL_DIRS,
): Promise<number> {
  const roots = await configuredSkillRoots(list);
  const problems = await skillPackageViolations(roots);
  return finish(
    problems,
    message(MessageId.SkillPackagesOk, { count: (await loadPackageSkills(roots)).length }),
  );
}

if (import.meta.main) process.exit(await checkSkillPackages());
