import { join } from "node:path";
import {
  AGENTS_FILE,
  CLAUDE_FILE,
  COMMAND_FILE_GLOB,
  COMMAND_FILE_SUFFIX,
  DEV_COMMAND_PREFIX,
  DEV_COMMANDS_DIR,
  DEV_RULES_FILE,
  FRONT_DESCRIPTION_PATTERN,
  FRONT_MATTER_PATTERN,
  FRONT_NAME_PATTERN,
  FRONT_SKILL_PATTERN,
  GLOB_MARK,
  MANAGED_SKILL_PREFIX,
  MessageId,
  SELF_UPDATE_SECTIONS,
  SELF_UPDATE_SKILL,
  Separator,
  SKILL_FILE,
  SKILL_FILE_GLOB,
  SKILL_PATHS_FILE,
  SKILLS_DIR,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { SkillPathsSchema } from "@platform/types";
import { all } from "@platform/util";
import { finish, REPO_ROOT } from "./tools.ts";

async function textOf(path: string): Promise<string | undefined> {
  const file = Bun.file(path);
  return (await file.exists()) ? file.text() : undefined;
}

export async function projectSkills(root: string): Promise<string[]> {
  const found = await Array.fromAsync(
    new Bun.Glob(SKILL_FILE_GLOB).scan({ cwd: join(root, SKILLS_DIR) }),
  );
  return found
    .map((file) => file.split(Separator.Resource)[0] ?? Text.Empty)
    .filter((name) => !name.startsWith(MANAGED_SKILL_PREFIX))
    .sort();
}

export async function malformedSkill(root: string, skill: string): Promise<boolean> {
  const text = (await textOf(join(root, SKILLS_DIR, skill, SKILL_FILE))) ?? Text.Empty;
  const front = FRONT_MATTER_PATTERN.exec(text)?.[1] ?? Text.Empty;
  const name = FRONT_NAME_PATTERN.exec(front)?.[1]?.trim();
  const description = FRONT_DESCRIPTION_PATTERN.exec(front)?.[1]?.trim();
  return name !== skill || description === undefined || description.length === 0;
}

async function missingPaths(
  root: string,
  skill: string,
  paths: readonly string[],
): Promise<string[]> {
  const literal = paths.filter((path) => !path.includes(GLOB_MARK));
  const present = await all(literal.map((path) => async () => Bun.file(join(root, path)).exists()));
  return literal
    .filter((_path, index) => !present[index])
    .map((path) => message(MessageId.SkillPathMissing, { skill, path }));
}

async function guideProblems(root: string): Promise<string[]> {
  const texts = await all(
    [AGENTS_FILE, CLAUDE_FILE].map((file) => async () => textOf(join(root, file))),
  );
  const missing = [AGENTS_FILE, CLAUDE_FILE]
    .filter((_file, index) => texts[index] === undefined)
    .map((file) => message(MessageId.AgentKnowledgeMissing, { file }));
  const unlinked =
    texts[0]?.includes(DEV_RULES_FILE) === false
      ? [message(MessageId.AgentKnowledgeNoLink, { file: AGENTS_FILE, target: DEV_RULES_FILE })]
      : [];
  const unlinkedClaude =
    texts[1]?.includes(AGENTS_FILE) === false
      ? [message(MessageId.AgentKnowledgeNoLink, { file: CLAUDE_FILE, target: AGENTS_FILE })]
      : [];
  return [...missing, ...unlinked, ...unlinkedClaude];
}

async function skillProblems(root: string): Promise<string[]> {
  const claude = (await textOf(join(root, CLAUDE_FILE))) ?? Text.Empty;
  const names = await projectSkills(root);
  const mapText = (await textOf(join(root, SKILL_PATHS_FILE))) ?? Text.Empty;
  const map = SkillPathsSchema.parse(mapText.length === 0 ? {} : JSON.parse(mapText));
  const malformed = await all(names.map((skill) => async () => malformedSkill(root, skill)));
  const paths = await all(
    Object.entries(map).map(
      ([skill, listed]) =>
        async () =>
          missingPaths(root, skill, listed),
    ),
  );
  const mismatched = [...new Set([...names, ...Object.keys(map)])].filter(
    (skill) => names.includes(skill) !== skill in map,
  );
  return [
    ...names
      .filter((_skill, index) => malformed[index])
      .map((skill) => message(MessageId.SkillMalformed, { skill })),
    ...names
      .filter((skill) => !claude.includes(skill))
      .map((skill) => message(MessageId.SkillNotListed, { skill })),
    ...mismatched.map((skill) =>
      message(MessageId.SkillMapMismatch, { skill, map: SKILL_PATHS_FILE }),
    ),
    ...paths.flat(),
  ];
}

export async function commandNames(root: string): Promise<string[]> {
  const found = await Array.fromAsync(
    new Bun.Glob(COMMAND_FILE_GLOB).scan({ cwd: join(root, DEV_COMMANDS_DIR) }),
  ).catch(() => []);
  return found.map((file) => file.slice(0, -COMMAND_FILE_SUFFIX.length)).sort();
}

export async function commandProblem(
  root: string,
  command: string,
  claude: string,
): Promise<string[]> {
  const text =
    (await textOf(join(root, DEV_COMMANDS_DIR, `${command}${COMMAND_FILE_SUFFIX}`))) ?? Text.Empty;
  const front = FRONT_MATTER_PATTERN.exec(text)?.[1] ?? Text.Empty;
  const named = FRONT_NAME_PATTERN.test(front) && FRONT_DESCRIPTION_PATTERN.test(front);
  const skill = FRONT_SKILL_PATTERN.exec(text)?.[1];
  const malformed =
    named && skill !== undefined ? [] : [message(MessageId.CommandMalformed, { command })];
  const skillPresent =
    skill === undefined || (await Bun.file(join(root, SKILLS_DIR, skill, SKILL_FILE)).exists());
  const missing = skillPresent
    ? []
    : [message(MessageId.CommandSkillMissing, { command, skill: skill ?? Text.Empty })];
  const unlisted = claude.includes(`${DEV_COMMAND_PREFIX}${command}`)
    ? []
    : [message(MessageId.CommandNotListed, { command })];
  return [...malformed, ...missing, ...unlisted];
}

export async function selfUpdateProblems(root: string): Promise<string[]> {
  const text = await textOf(join(root, SKILLS_DIR, SELF_UPDATE_SKILL, SKILL_FILE));
  return text === undefined
    ? []
    : SELF_UPDATE_SECTIONS.filter((section) => !text.includes(section)).map((section) =>
        message(MessageId.SelfUpdateSectionMissing, { skill: SELF_UPDATE_SKILL, section }),
      );
}

async function commandProblems(root: string): Promise<string[]> {
  const claude = (await textOf(join(root, CLAUDE_FILE))) ?? Text.Empty;
  const names = await commandNames(root);
  const problems = await all(
    names.map((command) => async () => commandProblem(root, command, claude)),
  );
  return [...problems.flat(), ...(await selfUpdateProblems(root))];
}

export async function knowledgeProblems(root: string): Promise<string[]> {
  return [
    ...(await guideProblems(root)),
    ...(await skillProblems(root)),
    ...(await commandProblems(root)),
  ];
}

export async function checkAgentKnowledge(root: string = REPO_ROOT): Promise<number> {
  return finish(await knowledgeProblems(root), message(MessageId.AgentKnowledgeOk));
}

if (import.meta.main) process.exit(await checkAgentKnowledge());
