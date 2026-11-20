import { join } from "node:path";
import {
  COMMANDS_DIR,
  GIT_STAGED_NAMES,
  MessageId,
  Separator,
  SKILL_PATHS_FILE,
  SKILLS_DIR,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync } from "@platform/store";
import { type SkillPaths, SkillPathsSchema, type StaleSkill } from "@platform/types";
import { finish, REPO_ROOT, run } from "./tools.ts";

async function touchesSkill(changed: readonly string[], skill: string): Promise<boolean> {
  const folder = [SKILLS_DIR, skill, Text.Empty].join(Separator.Resource);
  const commands = [COMMANDS_DIR, Text.Empty].join(Separator.Resource);
  return changed.some((file) => file.startsWith(folder) || file.startsWith(commands));
}

export async function staleSkills(
  changed: readonly string[],
  map: SkillPaths,
): Promise<StaleSkill[]> {
  return await filterAsync(
    Object.entries(map).map(([skill, patterns]) => ({
      skill,
      files: changed.filter((file) =>
        patterns.some((pattern) => new Bun.Glob(pattern).match(file)),
      ),
    })),
    async ({ skill, files }) => files.length > 0 && !(await touchesSkill(changed, skill)),
  );
}

async function changedFiles(arguments_: readonly string[], root: string): Promise<string[]> {
  if (arguments_.length > 0) {
    return [...arguments_];
  }
  const staged = await run([...GIT_STAGED_NAMES], { cwd: root });
  return staged.stdout.split(Text.Newline).filter((line) => line.length > 0);
}

export async function checkSkillsFresh(
  args: readonly string[] = [],
  root: string = REPO_ROOT,
): Promise<number> {
  const changed = await changedFiles(args, root);
  const map = SkillPathsSchema.parse(await Bun.file(join(root, SKILL_PATHS_FILE)).json());
  const stale = await staleSkills(changed, map);
  return finish(
    stale.map(({ skill, files }) =>
      message(MessageId.SkillStale, { skill, files: files.join(Separator.ListSpaced) }),
    ),
    message(MessageId.SkillsFreshOk),
  );
}

if (import.meta.main) process.exit(await checkSkillsFresh(Bun.argv.slice(2)));
