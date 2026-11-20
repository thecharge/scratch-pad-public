import { afterAll } from "bun:test";
import { MessageId } from "@platform/constants";
import { message } from "@platform/messages";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  commandNames,
  commandProblem,
  knowledgeProblems,
  malformedSkill,
  projectSkills,
  selfUpdateProblems,
} from "../../../tooling/scripts/check-agent-knowledge.ts";

afterAll(removeAll);

const SKILL_A = "---\nname: project-a\ndescription: Does a thing.\n---\n\nbody\n";
const SKILL_B = "---\nname: project-b\ndescription: Does another thing.\n---\n\nbody\n";
const WRONG_NAME = "---\nname: other\ndescription: Does a thing.\n---\n\nbody\n";
const NO_DESCRIPTION = "---\nname: project-a\n---\n\nbody\n";
const MAP = JSON.stringify({ "project-a": ["package.json"], "project-b": ["src/**"] });

const COMPLETE: Record<string, string> = {
  "AGENTS.md": "See DEV_RULES.md for every rule.\n",
  "CLAUDE.md": "Read AGENTS.md. project-a project-b\n",
  "DEV_RULES.md": "rules\n",
  "package.json": "{}\n",
  ".claude/skills/project-a/SKILL.md": SKILL_A,
  ".claude/skills/project-b/SKILL.md": SKILL_B,
  ".claude/skills/skill-paths.json": MAP,
};

async function rootOf(files: Record<string, string>): Promise<string> {
  const dir = await makeDir();
  await writeFiles(dir, files);
  return dir;
}

const complete = await rootOf(COMPLETE);
const managedOnly = await rootOf({
  ".claude/skills/openspec-apply-change/SKILL.md": SKILL_A,
});
const noGuide = await rootOf(
  Object.fromEntries(Object.entries(COMPLETE).filter(([name]) => name !== "AGENTS.md")),
);
const single = await rootOf({
  "AGENTS.md": COMPLETE["AGENTS.md"] ?? "",
  "CLAUDE.md": "Read AGENTS.md. project-a\n",
  "package.json": "{}\n",
  ".claude/skills/project-a/SKILL.md": SKILL_A,
  ".claude/skills/skill-paths.json": JSON.stringify({ "project-a": ["package.json"] }),
});
const unlinkedGuide = await rootOf({ ...COMPLETE, "AGENTS.md": "no link here\n" });
const unlistedSkill = await rootOf({ ...COMPLETE, "CLAUDE.md": "Read AGENTS.md. project-a\n" });
const unmappedSkill = await rootOf({
  ...COMPLETE,
  ".claude/skills/skill-paths.json": JSON.stringify({ "project-a": ["package.json"] }),
});
const missingPath = await rootOf({
  ...COMPLETE,
  ".claude/skills/skill-paths.json": JSON.stringify({
    "project-a": ["gone.json"],
    "project-b": ["src/**"],
  }),
});
const wrongName = await rootOf({ ...COMPLETE, ".claude/skills/project-a/SKILL.md": WRONG_NAME });
const noDescription = await rootOf({
  ...COMPLETE,
  ".claude/skills/project-a/SKILL.md": NO_DESCRIPTION,
});

const COMMAND =
  '---\nname: "DEV: A"\ndescription: Does a thing.\n---\n\nSkill: project-a\n\nSteps\n';
const NO_SKILL_LINE = '---\nname: "DEV: A"\ndescription: Does a thing.\n---\n\nSteps\n';
const NO_FRONT = "Skill: project-a\n\nSteps\n";
const BAD_SKILL = COMMAND.replace("project-a", "project-zzz");
const LISTED = "Read AGENTS.md. project-a project-b /dev:a\n";
const SELF_SKILL =
  "---\nname: project-self-update\ndescription: Updates.\n---\n\\n## When to update\n\n## How to update\n";
const withCommand = await rootOf({
  ...COMPLETE,
  "CLAUDE.md": LISTED,
  ".claude/commands/dev/a.md": COMMAND,
});
const withTwo = await rootOf({
  ...COMPLETE,
  "CLAUDE.md": `${LISTED} /dev:b`,
  ".claude/commands/dev/a.md": COMMAND,
  ".claude/commands/dev/b.md": COMMAND,
  ".claude/commands/dev/notes.txt": "ignored",
});
const noCommands = await rootOf(COMPLETE);
const unlistedCommand = await rootOf({ ...COMPLETE, ".claude/commands/dev/a.md": COMMAND });
const noSkillLine = await rootOf({ ...COMPLETE, ".claude/commands/dev/a.md": NO_SKILL_LINE });
const noFront = await rootOf({ ...COMPLETE, ".claude/commands/dev/a.md": NO_FRONT });
const badSkill = await rootOf({ ...COMPLETE, ".claude/commands/dev/a.md": BAD_SKILL });
const selfComplete = await rootOf({
  ".claude/skills/project-self-update/SKILL.md": SELF_SKILL,
});
const selfNoHow = await rootOf({
  ".claude/skills/project-self-update/SKILL.md": SELF_SKILL.replace("## How to update", ""),
});
const selfNeither = await rootOf({
  ".claude/skills/project-self-update/SKILL.md":
    "---\nname: project-self-update\ndescription: Updates.\n---\n\nbody\n",
});

unit(projectSkills, {
  positive: [
    positive("lists the project skills in order", [complete], ["project-a", "project-b"]),
    positive("leaves out the skills the OpenSpec tool manages", [managedOnly], []),
  ],
  negative: [
    negative("fails for a root that does not exist", ["/nowhere/at/all"], { code: "ENOENT" }),
    negative("fails for a second root that does not exist", ["/also/not/here"], {
      code: "ENOENT",
    }),
  ],
});

unit(malformedSkill, {
  positive: [
    positive(
      "accepts a skill with a matching name and a description",
      [complete, "project-a"],
      false,
    ),
    positive("accepts the second skill", [complete, "project-b"], false),
  ],
  negative: [
    rejected("flags a name that differs from the folder", [wrongName, "project-a"], true),
    rejected("flags a missing description", [noDescription, "project-a"], true),
  ],
});

unit(knowledgeProblems, {
  positive: [
    positive("finds nothing wrong with a complete project", [complete], []),
    positive("finds nothing wrong with a project that has one skill", [single], []),
    positive("finds nothing wrong with a project with a listed command", [withCommand], []),
  ],
  negative: [
    rejected(
      "names a command that CLAUDE.md does not list",
      [unlistedCommand],
      [message(MessageId.CommandNotListed, { command: "a" })],
    ),
    rejected(
      "names AGENTS.md when it does not point to DEV_RULES.md",
      [unlinkedGuide],
      [message(MessageId.AgentKnowledgeNoLink, { file: "AGENTS.md", target: "DEV_RULES.md" })],
    ),
    rejected(
      "names a skill missing from the CLAUDE.md table",
      [unlistedSkill],
      [message(MessageId.SkillNotListed, { skill: "project-b" })],
    ),
    rejected(
      "names a skill with no entry in the path map",
      [unmappedSkill],
      [
        message(MessageId.SkillMapMismatch, {
          skill: "project-b",
          map: ".claude/skills/skill-paths.json",
        }),
      ],
    ),
    rejected(
      "names a listed path that does not exist",
      [missingPath],
      [message(MessageId.SkillPathMissing, { skill: "project-a", path: "gone.json" })],
    ),
    rejected(
      "names a skill whose name differs from its folder",
      [wrongName],
      [message(MessageId.SkillMalformed, { skill: "project-a" })],
    ),
    rejected(
      "names a skill without a description",
      [noDescription],
      [message(MessageId.SkillMalformed, { skill: "project-a" })],
    ),
    rejected(
      "names AGENTS.md when it is missing",
      [noGuide],
      [message(MessageId.AgentKnowledgeMissing, { file: "AGENTS.md" })],
    ),
  ],
});

unit(commandNames, {
  positive: [
    positive("lists the command", [withCommand], ["a"]),
    positive("lists two commands in order and ignores other files", [withTwo], ["a", "b"]),
  ],
  negative: [
    rejected("lists nothing when there is no commands folder", [noCommands], []),
    rejected("lists nothing for a root that does not exist", ["/nowhere/at/all"], []),
  ],
});

unit(commandProblem, {
  positive: [
    positive("accepts a complete listed command", [withCommand, "a", LISTED], []),
    positive("accepts the second command", [withTwo, "b", `${LISTED} /dev:b`], []),
  ],
  negative: [
    rejected(
      "names a command without a Skill: line",
      [noSkillLine, "a", LISTED],
      [message(MessageId.CommandMalformed, { command: "a" })],
    ),
    rejected(
      "names a command without front matter",
      [noFront, "a", LISTED],
      [message(MessageId.CommandMalformed, { command: "a" })],
    ),
    rejected(
      "names a command that applies a missing skill",
      [badSkill, "a", LISTED],
      [message(MessageId.CommandSkillMissing, { command: "a", skill: "project-zzz" })],
    ),
    rejected(
      "names a command that CLAUDE.md does not list",
      [withCommand, "a", "Read AGENTS.md.\n"],
      [message(MessageId.CommandNotListed, { command: "a" })],
    ),
  ],
});

unit(selfUpdateProblems, {
  positive: [
    positive("accepts a self-update skill with both sections", [selfComplete], []),
    positive("accepts a project without the self-update skill", [noCommands], []),
  ],
  negative: [
    rejected(
      "names the missing How to update section",
      [selfNoHow],
      [
        message(MessageId.SelfUpdateSectionMissing, {
          skill: "project-self-update",
          section: "## How to update",
        }),
      ],
    ),
    rejected(
      "names both missing sections",
      [selfNeither],
      [
        message(MessageId.SelfUpdateSectionMissing, {
          skill: "project-self-update",
          section: "## When to update",
        }),
        message(MessageId.SelfUpdateSectionMissing, {
          skill: "project-self-update",
          section: "## How to update",
        }),
      ],
    ),
  ],
});
