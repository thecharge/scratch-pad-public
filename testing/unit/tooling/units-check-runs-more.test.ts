import { afterAll, expect } from "bun:test";
import { join } from "node:path";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { gitRepo, makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { PackedSdk } from "@platform/types";
import { checkMermaid } from "../../../tooling/scripts/check-mermaid.ts";
import { checkPackageGraph } from "../../../tooling/scripts/check-package-graph.ts";
import { checkSdkPack } from "../../../tooling/scripts/check-sdk-pack.ts";
import { checkSkillPackages } from "../../../tooling/scripts/check-skill-packages.ts";
import { checkSkillsFresh } from "../../../tooling/scripts/check-skills-fresh.ts";
import { checkStructure } from "../../../tooling/scripts/check-structure.ts";
import { checkUnitCases } from "../../../tooling/scripts/check-unit-cases.ts";
import { checkUrlLiterals } from "../../../tooling/scripts/check-url-literals.ts";
import { lintWorkflows } from "../../../tooling/scripts/lint-workflows.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

async function tree(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await makeDir();
  await writeFiles(root, files);
  return root;
}

const MAP = '{"demo":["src/*.ts"],"other":["docs/*.md"]}';
const MAP_ROOT = await tree({ ".claude/skills/skill-paths.json": MAP });

unit(checkSkillsFresh, {
  positive: [
    positive("files no skill describes pass", [["unrelated.txt"], MAP_ROOT], 0),
    positive(
      "a changed file with its skill changed passes",
      [["src/a.ts", ".claude/skills/demo/SKILL.md"], MAP_ROOT],
      0,
    ),
    positive(
      "a command change counts for every skill",
      [["src/a.ts", ".claude/commands/x.md"], MAP_ROOT],
      0,
    ),
  ],
  negative: [
    rejected("a changed file without its skill fails", [["src/a.ts"], MAP_ROOT], 1),
    rejected("two stale skills fail", [["src/a.ts", "docs/x.md"], MAP_ROOT], 1),
  ],
});

const GOOD_SKILL = "---\nname: demo\ndescription: A demo skill.\n---\n\nBody.\n";
const ROOT_WITH_SKILL = await tree({ "skills/demo/SKILL.md": GOOD_SKILL });
const ROOT_WITHOUT_SKILLS = await tree({ "skills/.keep": "" });
const ROOT_BAD_SKILL = await tree({ "skills/demo/SKILL.md": "no front matter\n" });
const ROOT_EMPTY_SKILL = await tree({ "skills/demo/.keep": "" });
const skillList = (root: string) => join(root, "skills");

unit(checkSkillPackages, {
  positive: [
    positive("the configured skill folders of the repository pass", [], 0),
    positive("a folder with a valid skill passes", [skillList(ROOT_WITH_SKILL)], 0),
    positive("a folder without skills passes", [skillList(ROOT_WITHOUT_SKILLS)], 0),
  ],
  negative: [
    rejected("a skill without front matter fails", [skillList(ROOT_BAD_SKILL)], 1),
    rejected("a skill folder without files fails", [skillList(ROOT_EMPTY_SKILL)], 1),
  ],
});

const manifest = (name: string, dependency?: string) =>
  JSON.stringify({
    name,
    dependencies: dependency === undefined ? {} : { [dependency]: "workspace:*" },
  });
const ENTRY_CLEAN = "export const entry = 1;\n";
const ENTRY_LEAKING = "export const entry = process.env.A;\n";
const GRAPH_OK = await tree({
  "packages/a/package.json": manifest("@platform/a", "@platform/b"),
  "packages/b/package.json": manifest("@platform/b"),
  "apps/console/src/main.tsx": ENTRY_CLEAN,
});
const GRAPH_IMPORT = await tree({
  "packages/a/package.json": manifest("@platform/a"),
  "apps/console/src/main.tsx": 'import { value } from "./value.ts";\nexport const entry = value;\n',
  "apps/console/src/value.ts": "export const value = 2;\n",
});
const GRAPH_CYCLE = await tree({
  "packages/a/package.json": manifest("@platform/a", "@platform/b"),
  "packages/b/package.json": manifest("@platform/b", "@platform/a"),
  "apps/console/src/main.tsx": ENTRY_CLEAN,
});
const GRAPH_LEAK = await tree({
  "packages/a/package.json": manifest("@platform/a"),
  "apps/console/src/main.tsx": ENTRY_LEAKING,
});
const GRAPH_NO_ENTRY = await tree({ "packages/a/package.json": manifest("@platform/a") });

unit(checkPackageGraph, {
  positive: [
    positive("a bundle with an import of its own passes", [GRAPH_IMPORT], 0),
    positive("a chain of packages passes", [GRAPH_OK], 0),
  ],
  negative: [
    rejected("a cycle fails", [GRAPH_CYCLE], 1),
    rejected("a bundle that reads the environment fails", [GRAPH_LEAK], 1),
    negative("a root without the console entry throws", [GRAPH_NO_ENTRY], {
      message: expect.stringContaining("FileNotFound"),
    }),
  ],
});

const packedWith = async (
  files: Readonly<Record<string, string>>,
): Promise<() => Promise<PackedSdk>> => {
  const directory = await tree(files);
  return async () => ({ directory, tarball: join(directory, "x.tgz") });
};
const CLEAN_PACK = await packedWith({
  "package.json": '{"name":"sdk","version":"1.0.0","dependencies":{"zod":"^4.0.0"}}',
  "index.js": 'import { z } from "zod";\nexport const a = z;\n',
});
const LEAKING_IMPORT = await packedWith({ "index.js": 'import { a } from "@platform/types";\n' });
const LEAKING_MANIFEST = await packedWith({
  "package.json":
    '{"name":"sdk","version":"1.0.0","dependencies":{"@platform/types":"workspace:*"}}',
});

unit(checkSdkPack, {
  positive: [
    positive("the packed sdk of the repository leaks nothing", [], 0),
    positive("a clean pack passes", [CLEAN_PACK], 0),
  ],
  negative: [
    rejected("an import of a workspace package fails", [LEAKING_IMPORT], 1),
    rejected("a workspace dependency in the manifest fails", [LEAKING_MANIFEST], 1),
  ],
});

const CLEAN_SOURCE = "export async function f(): Promise<number> {\n  return 1;\n}\n";
const COMMENTED_SOURCE = "export const a = 1; // note\n";
const DEEP_SOURCE =
  "function f(a) { if (a) { for (const x of a) { for (const y of x) { use(y); } } } }\n";
const WARNED_SOURCE = "const value = compute();\n";
const structureFiles = await tree({
  "clean.ts": CLEAN_SOURCE,
  "commented.ts": COMMENTED_SOURCE,
  "deep.ts": DEEP_SOURCE,
  "warned.ts": WARNED_SOURCE,
  "notes.md": "text\n",
});

unit(checkStructure, {
  positive: [
    positive("a clean file passes", [[join(structureFiles, "clean.ts")]], 0),
    positive(
      "a file with only a lazy loading warning passes",
      [[join(structureFiles, "warned.ts")]],
      0,
    ),
    positive("no arguments check the repository", [], 0),
  ],
  negative: [
    rejected("a comment fails", [[join(structureFiles, "commented.ts")]], 1),
    rejected("deep nesting fails", [[join(structureFiles, "deep.ts")]], 1),
    rejected("a markdown file with a comment fails", [[await markdownWithComment()]], 1),
  ],
});

async function markdownWithComment(): Promise<string> {
  const root = await tree({ "page.md": "text\n\n<!-- hidden -->\n" });
  return join(root, "page.md");
}

const UNIT_SOURCE = "export async function f(): Promise<number> {\n  return 1;\n}\n";
const FULL_SUITE =
  'import { f } from "@platform/a";\nunit(f, {\n  positive: [positive("a", [], 1), positive("b", [], 1)],\n  negative: [negative("c", [], {}), negative("d", [], {})],\n});\n';
const SHORT_SUITE =
  'import { f } from "@platform/a";\nunit(f, {\n  positive: [positive("a", [], 1)],\n  negative: [negative("c", [], {}), negative("d", [], {})],\n});\n';
const UNITS_COVERED = await tree({
  "packages/a/src/x.ts": UNIT_SOURCE,
  "testing/unit/a/x.test.ts": FULL_SUITE,
  "testing/unit-debt.json": "[]",
});
const UNITS_MISSING = await tree({
  "packages/a/src/x.ts": UNIT_SOURCE,
  "testing/unit-debt.json": "[]",
});
const UNITS_SHORT = await tree({
  "packages/a/src/x.ts": UNIT_SOURCE,
  "testing/unit/a/x.test.ts": SHORT_SUITE,
  "testing/unit-debt.json": "[]",
});
const UNITS_DEBT = await tree({
  "packages/a/src/x.ts": UNIT_SOURCE,
  "testing/unit-debt.json": '["a/f"]',
});

unit(checkUnitCases, {
  positive: [
    positive("every unit of the repository has its cases", [REPO_ROOT], 0),
    positive("a unit with two and two cases passes", [UNITS_COVERED], 0),
    positive("a listed debt is allowed", [UNITS_DEBT], 0),
  ],
  negative: [
    rejected("a unit without cases fails", [UNITS_MISSING], 1),
    rejected("a unit with one positive case fails", [UNITS_SHORT], 1),
  ],
});

const URL_CONFIG = '{"allowedPaths":[]}';
const URLS_CLEAN = await gitRepo(
  { "url-literals.json": URL_CONFIG, "src/a.ts": "export const a = 1;\n" },
  false,
  false,
);
const URLS_EMPTY = await gitRepo({ "url-literals.json": URL_CONFIG }, false, false);
const URLS_ADDRESS = await gitRepo(
  { "url-literals.json": URL_CONFIG, "src/a.ts": 'export const a = "https://example.test";\n' },
  false,
  false,
);
const URLS_HOST = await gitRepo(
  { "url-literals.json": URL_CONFIG, "src/a.ts": 'export const a = "localhost";\n' },
  false,
  false,
);

unit(checkUrlLiterals, {
  positive: [
    positive("the repository holds no address outside the config package", [REPO_ROOT], 0),
    positive("a source without an address passes", [URLS_CLEAN], 0),
    positive("a repository without sources passes", [URLS_EMPTY], 0),
  ],
  negative: [
    rejected("an address in a source fails", [URLS_ADDRESS], 1),
    rejected("the loopback host name in a source fails", [URLS_HOST], 1),
  ],
});

const fenced = (body: string) => `text\n\`\`\`mermaid\n${body}\`\`\`\n`;
const DIAGRAM_ROOT = await tree({
  "good.md": fenced("graph TD\n  A --> B\n"),
  "plain.md": "no diagram\n",
  "bad.md": fenced("graph TD\n  A -->\n"),
  "notes.txt": "ignored\n",
});

unit(checkMermaid, {
  positive: [
    positive("a valid diagram passes", [[join(DIAGRAM_ROOT, "good.md")]], 0),
    positive("a page without diagrams passes", [[join(DIAGRAM_ROOT, "plain.md")]], 0),
    positive(
      "arguments that are not markdown are ignored in favor of the repository",
      [[join(DIAGRAM_ROOT, "notes.txt")]],
      0,
    ),
  ],
  negative: [
    rejected("an invalid diagram fails", [[join(DIAGRAM_ROOT, "bad.md")]], 1),
    rejected(
      "one invalid diagram among valid ones fails",
      [[join(DIAGRAM_ROOT, "good.md"), join(DIAGRAM_ROOT, "bad.md")]],
      1,
    ),
  ],
});

const WORKFLOW_FILE = "on:\n  push:\n";
const WORKFLOWS_NONE = await tree({ ".github/workflows/.keep": "" });
const WORKFLOWS_PUSH = await tree({ ".github/workflows/ci.yml": WORKFLOW_FILE });
const WORKFLOWS_LONG = await tree({ ".github/workflows/ci.yaml": WORKFLOW_FILE });
const WORKFLOWS_ABSENT = await tree({});

unit(lintWorkflows, {
  positive: [
    positive("the repository has no workflow", [REPO_ROOT], 0),
    positive("a folder without workflow files passes", [WORKFLOWS_NONE], 0),
    positive("a root without the workflow folder passes", [WORKFLOWS_ABSENT], 0),
  ],
  negative: [
    rejected("a .yml workflow fails", [WORKFLOWS_PUSH], 1),
    rejected("a .yaml workflow fails", [WORKFLOWS_LONG], 1),
  ],
});
