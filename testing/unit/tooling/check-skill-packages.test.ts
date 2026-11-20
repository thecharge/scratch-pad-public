import { afterAll, expect } from "bun:test";
import { resolve } from "node:path";
import { positive, rejected, unit } from "@platform/test-factories";
import { REPO_ROOT } from "@platform/test-framework";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  configuredSkillRoots,
  skillPackageViolations,
} from "../../../tooling/scripts/check-skill-packages.ts";

afterAll(removeAll);

const VALID = "---\nname: one\ndescription: Does a thing.\n---\n\nbody\n";

async function rootOf(files: Record<string, string>): Promise<string> {
  const dir = await makeDir();
  await writeFiles(dir, files);
  return dir;
}

const compliant = await rootOf({ "one/SKILL.md": VALID });
const wrongName = await rootOf({ "other/SKILL.md": VALID });
const noDescription = await rootOf({ "one/SKILL.md": "---\nname: one\n---\n\nbody\n" });
const noManifest = await rootOf({ "one/notes.md": "no manifest\n" });
const oversized = await rootOf({
  "one/SKILL.md": VALID,
  "one/big.md": "x".repeat(16 * 1024 * 1024 + 1),
});
const scoped = await rootOf({
  "one/SKILL.md": "---\nname: one\ndescription: Does a thing.\nmetadata:\n  scopes: read\n---\n",
});

unit(configuredSkillRoots, {
  positive: [
    positive(
      "resolves a relative directory against the repository root",
      ["./packages/skills"],
      [resolve(REPO_ROOT, "packages/skills")],
    ),
    positive("splits a comma separated list and drops blanks", ["/one, ,/two"], ["/one", "/two"]),
  ],
  negative: [
    rejected("returns nothing for an empty list", [""], []),
    rejected("returns nothing for a list of blanks", [" , "], []),
  ],
});

unit(skillPackageViolations, {
  positive: [
    positive("accepts compliant skills", [[compliant]], []),
    positive("accepts a skill whose metadata declares a policy", [[scoped]], []),
  ],
  negative: [
    rejected(
      "names a skill whose frontmatter name differs from its directory",
      [[wrongName]],
      [expect.stringContaining('must match the last path segment "other"')],
    ),
    rejected(
      "names a skill without a description",
      [[noDescription]],
      [expect.stringContaining("must contain string")],
    ),
    rejected(
      "names a directory without a SKILL.md",
      [[noManifest]],
      [expect.stringContaining("SKILL.md is missing")],
    ),
    rejected(
      "names a skill above the size limit",
      [[oversized]],
      [expect.stringContaining("exceeds 512 files or 16777216 bytes")],
    ),
  ],
});
