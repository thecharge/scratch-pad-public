import { negative, positive, rejected, unit } from "@platform/test-factories";
import { staleSkills } from "../../../tooling/scripts/check-skills-fresh.ts";

const MAP = { "project-a": ["src/a/**", "docs/a.md"], "project-b": ["src/b.ts"] };

unit(staleSkills, {
  positive: [
    positive("passes when no changed file belongs to a skill", [["README.md"], MAP], []),
    positive(
      "passes when the skill changed with its files",
      [["src/a/x.ts", ".claude/skills/project-a/SKILL.md"], MAP],
      [],
    ),
    positive(
      "passes when a command changed with the files",
      [["src/b.ts", ".claude/commands/opsx/apply.md"], MAP],
      [],
    ),
  ],
  negative: [
    rejected(
      "names the skill whose files changed alone",
      [["src/a/x.ts", "docs/a.md"], MAP],
      [{ skill: "project-a", files: ["src/a/x.ts", "docs/a.md"] }],
    ),
    rejected(
      "names every skill whose files changed without it",
      [["src/b.ts", "src/a/y.ts"], MAP],
      [
        { skill: "project-a", files: ["src/a/y.ts"] },
        { skill: "project-b", files: ["src/b.ts"] },
      ],
    ),
    rejected(
      "ignores a change to another skill's folder",
      [["src/b.ts", ".claude/skills/project-a/SKILL.md"], MAP],
      [{ skill: "project-b", files: ["src/b.ts"] }],
    ),
    negative("fails on a map that is not a record", [["src/b.ts"], null], { name: "TypeError" }),
  ],
});
