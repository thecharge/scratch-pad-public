import { afterAll, expect } from "bun:test";
import { positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { checkRepo, repoProblems } from "../../../tooling/scripts/check-repo.ts";

const PRIVATE = '{"name":"x","private":true}';
const SDK_MANIFEST =
  '{"name":"s","version":"1.0.0","license":"Apache-2.0","files":["dist"],"types":"./dist/index.d.ts","exports":{},"dependencies":{"zod":"4.6.7"}}';
const SDK_LICENSE = "Apache License\nVersion 2.0, January 2004";
const GOOD: Record<string, string> = {
  "package.json": PRIVATE,
  "README.md": "# root",
  "DEV_RULES.md": "# rules",
  "docs/quickstart-developer.md": "# developer",
  "docs/quickstart-api-consumer.md": "# consumer",
  "docs/quickstart-agent.md": "# agent",
  "packages/a/package.json": PRIVATE,
  "packages/a/README.md": "# a",
  "apps/b/package.json": PRIVATE,
  "packages/sdk/package.json": SDK_MANIFEST,
  "packages/sdk/README.md": "# sdk",
  "packages/sdk/LICENSE": SDK_LICENSE,
};

async function repo(extra: Record<string, string>, omit: string[] = []): Promise<string> {
  const root = await makeDir();
  const files = Object.entries({ ...GOOD, ...extra }).filter(([name]) => !omit.includes(name));
  await writeFiles(root, Object.fromEntries(files));
  return root;
}

const complete = await repo({});
const extended = await repo({ "packages/c/package.json": PRIVATE, "packages/c/README.md": "# c" });
const publicRoot = await repo({ "package.json": '{"private":false}' });
const noLicense = await repo({}, ["packages/sdk/LICENSE"]);
const noReadme = await repo({}, ["packages/a/README.md"]);
afterAll(removeAll);

unit(repoProblems, {
  positive: [
    positive("a complete repository has no problems", [complete], []),
    positive("an extra documented package has no problems", [extended], []),
  ],
  negative: [
    rejected(
      "a root manifest that is not private",
      [publicRoot],
      [expect.stringContaining("package.json must set private")],
    ),
    rejected(
      "an SDK without a LICENSE file",
      [noLicense],
      [expect.stringContaining("packages/sdk/LICENSE")],
    ),
    rejected("a package without a README", [noReadme], [expect.stringContaining("Package a")]),
  ],
});

unit(checkRepo, {
  positive: [
    positive("a complete repository exits with 0", [complete], 0),
    positive("the real repository exits with 0", [process.cwd()], 0),
  ],
  negative: [
    rejected("a public root exits with 1", [publicRoot], 1),
    rejected("a missing license exits with 1", [noLicense], 1),
  ],
});
