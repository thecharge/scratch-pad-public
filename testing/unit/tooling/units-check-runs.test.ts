import { afterAll } from "bun:test";
import { positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { checkAgentKnowledge } from "../../../tooling/scripts/check-agent-knowledge.ts";
import { checkAsyncFunctions } from "../../../tooling/scripts/check-async-functions.ts";
import { checkPromiseAll } from "../../../tooling/scripts/check-promise-all.ts";
import { checkSchemas } from "../../../tooling/scripts/check-schemas.ts";
import { checkTestingArea } from "../../../tooling/scripts/check-testing-area.ts";
import { checkTiers } from "../../../tooling/scripts/check-tiers.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

async function tree(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await makeDir();
  await writeFiles(root, files);
  return root;
}

const SKILL = "---\nname: demo\ndescription: A demo skill.\n---\n\nBody.\n";
const SKILLS_FOLDER = { ".claude/skills/.keep": "" };
const GUIDES = {
  "AGENTS.md": "See DEV_RULES.md\n",
  "CLAUDE.md": "Read AGENTS.md and the demo skill\n",
};
const KNOWLEDGE_OK = await tree({
  ...GUIDES,
  ".claude/skills/demo/SKILL.md": SKILL,
  ".claude/skills/skill-paths.json": '{"demo":["AGENTS.md"]}',
});
const KNOWLEDGE_BARE = await tree({ ...GUIDES, ...SKILLS_FOLDER });
const KNOWLEDGE_EMPTY = await tree({ ...SKILLS_FOLDER });
const KNOWLEDGE_UNLINKED = await tree({
  "AGENTS.md": "nothing\n",
  "CLAUDE.md": "nothing\n",
  ...SKILLS_FOLDER,
});
const KNOWLEDGE_UNLISTED = await tree({
  "AGENTS.md": "See DEV_RULES.md\n",
  "CLAUDE.md": "Read AGENTS.md\n",
  ".claude/skills/demo/SKILL.md": SKILL,
  ".claude/skills/skill-paths.json": '{"demo":["AGENTS.md"]}',
});

unit(checkAgentKnowledge, {
  positive: [
    positive("the repository guides and skills are consistent", [REPO_ROOT], 0),
    positive("guides that link each other with a listed skill pass", [KNOWLEDGE_OK], 0),
    positive("guides without skills pass", [KNOWLEDGE_BARE], 0),
  ],
  negative: [
    rejected("missing guides fail", [KNOWLEDGE_EMPTY], 1),
    rejected("guides that do not link each other fail", [KNOWLEDGE_UNLINKED], 1),
    rejected("a skill that CLAUDE.md does not list fails", [KNOWLEDGE_UNLISTED], 1),
  ],
});

const ASYNC_FILE = "export async function f(): Promise<number> {\n  return 1;\n}\n";
const SYNC_FILE = "export function g(): number {\n  return 1;\n}\n";
const STALE_IGNORE = JSON.stringify({
  entries: [{ path: "packages/a/src/gone.ts", reason: "old" }],
});
const ASYNC_OK = await tree({ "packages/a/src/x.ts": ASYNC_FILE });
const ASYNC_EMPTY = await tree({});
const ASYNC_BAD = await tree({ "packages/a/src/x.ts": SYNC_FILE });
const ASYNC_STALE = await tree({
  "packages/a/src/x.ts": ASYNC_FILE,
  "async-ignore.json": STALE_IGNORE,
});

unit(checkAsyncFunctions, {
  positive: [
    positive("the repository has only async functions", [REPO_ROOT], 0),
    positive("an async function passes", [ASYNC_OK], 0),
    positive("a root without sources passes", [ASYNC_EMPTY], 0),
  ],
  negative: [
    rejected("a sync function fails", [ASYNC_BAD], 1),
    rejected("an ignore entry that matches nothing fails", [ASYNC_STALE], 1),
  ],
});

const ALL_FILE = "export async function f(): Promise<unknown> {\n  return Promise.all([]);\n}\n";
const ALL_OK = await tree({ "packages/a/src/x.ts": ASYNC_FILE });
const ALL_BAD = await tree({ "packages/a/src/x.ts": ALL_FILE });
const ALL_STALE = await tree({
  "packages/a/src/x.ts": ASYNC_FILE,
  "promise-all-ignore.json": STALE_IGNORE,
});

unit(checkPromiseAll, {
  positive: [
    positive("the repository never uses Promise.all", [REPO_ROOT], 0),
    positive("a source without it passes", [ALL_OK], 0),
  ],
  negative: [
    rejected("a use of Promise.all fails", [ALL_BAD], 1),
    rejected("an ignore entry that matches nothing fails", [ALL_STALE], 1),
  ],
});

const TYPES_OK = await tree({
  "packages/types/src/ok.ts":
    "export const ASchema = {};\nexport type A = z.infer<typeof ASchema>;\n",
});
const TYPES_BAD = await tree({ "packages/types/src/bad.ts": "export interface A { a: string }\n" });
const TYPES_EMPTY = await tree({});
const TYPES_ALIAS = await tree({ "packages/types/src/bad.ts": "export type B = { b: number };\n" });

unit(checkSchemas, {
  positive: [
    positive("the types package holds only schemas", [REPO_ROOT], 0),
    positive("a schema-only package passes", [TYPES_OK], 0),
    positive("a root without a types package passes", [TYPES_EMPTY], 0),
  ],
  negative: [
    rejected("a plain data interface fails", [TYPES_BAD], 1),
    rejected("a plain data type literal fails", [TYPES_ALIAS], 1),
  ],
});

const AREA_OK = await tree({ "packages/a/src/x.ts": ASYNC_FILE });
const AREA_BAD = await tree({ "packages/a/src/x.test.ts": "export const t = 1;\n" });
const AREA_STACK = await tree({
  "testing/packages/framework/package.json":
    '{"name":"@platform/test-framework","dependencies":{"@platform/test-scenarios":"workspace:*"}}',
});

unit(checkTestingArea, {
  positive: [
    positive("every test of the repository is in the testing area", [REPO_ROOT], 0),
    positive("a product source passes", [AREA_OK], 0),
  ],
  negative: [
    rejected("a test file outside the testing area fails", [AREA_BAD], 1),
    rejected("a testing package that depends on a later one fails", [AREA_STACK], 1),
  ],
});

const TIER_OK = await tree({ "testing/unit/a/a.test.ts": "export const a = 1;\n" });
const TIER_OPENS = await tree({
  "testing/unit/a/a.test.ts": ["Bun", "serve({ port: 0 });\n"].join("."),
});
const TIER_STRAY = await tree({ "other/a.test.ts": "export const a = 1;\n" });
const TIER_EMPTY = await tree({});

unit(checkTiers, {
  positive: [
    positive("the repository tests are in tiers", [REPO_ROOT], 0),
    positive("a unit test that opens nothing passes", [TIER_OK], 0),
    positive("a root without tests passes", [TIER_EMPTY], 0),
  ],
  negative: [
    rejected("a unit test that opens a port fails", [TIER_OPENS], 1),
    rejected("a test outside every tier fails", [TIER_STRAY], 1),
  ],
});
