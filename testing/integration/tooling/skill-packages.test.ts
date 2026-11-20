import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { DEFAULT_SKILL_DIRS, EnvVar } from "@platform/constants";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { run } from "../../../tooling/scripts/tools.ts";

const TIMEOUT_MS = 60_000;
const COMMAND = ["bun", "run", "tooling/scripts/check-skill-packages.ts"];
const VALID = "---\nname: one\ndescription: Does a thing.\n---\n\nbody\n";

afterAll(removeAll);

async function checked(files: Record<string, string>) {
  const dir = await makeDir();
  await writeFiles(dir, files);
  const env = { [EnvVar.SkillDirs]: dir };
  return { dir, result: await run(COMMAND, { env }) };
}

describe("the skill-packages check", () => {
  test(
    "passes on the skills shipped in the repository",
    async () => {
      const result = await run(COMMAND, { env: { [EnvVar.SkillDirs]: DEFAULT_SKILL_DIRS } });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+ package skill\(s\) comply/);
    },
    TIMEOUT_MS,
  );

  test(
    "passes on a compliant skill",
    async () => {
      const { result } = await checked({ "one/SKILL.md": VALID });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+ package skill\(s\) comply/);
    },
    TIMEOUT_MS,
  );

  test(
    "fails and names the file when the frontmatter name differs from the directory",
    async () => {
      const { dir, result } = await checked({ "other/SKILL.md": VALID });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(join(dir, "other", "SKILL.md"));
    },
    TIMEOUT_MS,
  );

  test(
    "fails and names the file when the description is missing",
    async () => {
      const { dir, result } = await checked({ "one/SKILL.md": "---\nname: one\n---\n\nbody\n" });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(join(dir, "one", "SKILL.md"));
    },
    TIMEOUT_MS,
  );
});
