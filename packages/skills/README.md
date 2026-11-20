# @platform/skills

Agent skills written by hand and served by the API next to the skills generated from the capability registry.

Each skill is a directory under `skills/` with a `SKILL.md`. The frontmatter holds `name`, which equals the directory name, and `description`. Other files in the directory are served as supporting files. The default location is `./packages/skills/skills`; set `SKILL_DIRS` to a comma-separated list of directories to serve skills from other packages.

Access is declared in the frontmatter `metadata`: `auth` (`none`, `optional` or `required`), `scopes`, `roles` and `kinds` as comma-separated lists. A caller that the policy does not allow does not see the skill in `skills/list`, in `skills/get` or in the `skills.list` and `skills.get` tools.

`check-skill-packages.ts` fails a commit when a skill in these directories does not follow the format. A skill with the same name as a generated skill replaces it.
