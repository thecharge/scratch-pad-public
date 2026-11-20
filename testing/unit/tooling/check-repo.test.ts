import { afterAll, describe, expect, test } from "bun:test";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { repoProblems } from "../../../tooling/scripts/check-repo.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

const PRIVATE = '{"name":"x","private":true}';
const SDK_MANIFEST =
  '{"name":"s","version":"1.0.0","license":"Apache-2.0","files":["dist"],"types":"./dist/index.d.ts","exports":{},"dependencies":{"zod":"4.6.7"}}';
const SDK_LICENSE = "Apache License\nVersion 2.0, January 2004";
const GOOD = {
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

const repo = (extra: Record<string, string>, omit: string[] = []) =>
  Object.fromEntries(
    Object.entries({ ...GOOD, ...extra }).filter(([name]) => !omit.includes(name)),
  );

async function problemsOf(files: Record<string, string>): Promise<string> {
  const dir = await makeDir();
  await writeFiles(dir, files);
  return (await repoProblems(dir)).join("\n");
}

describe("repository hygiene", () => {
  test("the real repository passes", async () => {
    expect(await repoProblems(REPO_ROOT)).toEqual([]);
  });

  test("a complete fixture passes", async () => {
    expect(await problemsOf(repo({}))).toBe("");
  });

  test.each([
    [
      "a root manifest that is not private",
      repo({ "package.json": '{"private":false}' }),
      "package.json must set private",
    ],
    [
      "a package manifest that is not private",
      repo({ "packages/a/package.json": "{}" }),
      "packages/a/package.json must set private",
    ],
    [
      "an app manifest that is not private",
      repo({ "apps/b/package.json": "{}" }),
      "apps/b/package.json must set private",
    ],
    [
      "a license field",
      repo({ "package.json": '{"private":true,"license":"MIT"}' }),
      "must not declare a license",
    ],
    ["a LICENSE file", repo({ LICENSE: "text" }), "LICENSE must not exist"],
    [
      "a LICENSE file in another package",
      repo({ "packages/a/LICENSE": "text" }),
      "packages/a/LICENSE must not exist",
    ],
    [
      "a LICENSE file in an app",
      repo({ "apps/b/LICENSE.md": "text" }),
      "apps/b/LICENSE.md must not exist",
    ],
    [
      "a license field in another package",
      repo({ "packages/a/package.json": '{"private":true,"license":"Apache-2.0"}' }),
      "packages/a/package.json must not declare a license",
    ],
    [
      "a private SDK",
      repo({ "packages/sdk/package.json": SDK_MANIFEST.replace("{", '{"private":true,') }),
      "packages/sdk/package.json must not be private",
    ],
    [
      "an SDK without a license field",
      repo({ "packages/sdk/package.json": SDK_MANIFEST.replace('"license":"Apache-2.0",', "") }),
      "packages/sdk/package.json must declare the license Apache-2.0",
    ],
    [
      "an SDK with another license",
      repo({ "packages/sdk/package.json": SDK_MANIFEST.replace("Apache-2.0", "MIT") }),
      "packages/sdk/package.json must declare the license Apache-2.0",
    ],
    [
      "an SDK without a LICENSE file",
      repo({}, ["packages/sdk/LICENSE"]),
      "packages/sdk/LICENSE must contain the Apache License 2.0",
    ],
    [
      "an SDK LICENSE file with other text",
      repo({ "packages/sdk/LICENSE": "MIT License" }),
      "packages/sdk/LICENSE must contain the Apache License 2.0",
    ],
    [
      "an SDK without a version",
      repo({ "packages/sdk/package.json": SDK_MANIFEST.replace('"version":"1.0.0",', "") }),
      "packages/sdk/package.json must set version",
    ],
    [
      "an SDK without files",
      repo({ "packages/sdk/package.json": SDK_MANIFEST.replace('"files":["dist"],', "") }),
      "packages/sdk/package.json must set files",
    ],
    [
      "an SDK with a workspace dependency",
      repo({
        "packages/sdk/package.json": SDK_MANIFEST.replace(
          '"zod":"4.6.7"',
          '"@platform/types":"workspace:*"',
        ),
      }),
      "packages/sdk/package.json depends on @platform/types through the workspace protocol",
    ],
    [
      "a missing SDK manifest",
      repo({}, ["packages/sdk/package.json"]),
      "packages/sdk/package.json is missing",
    ],
    [
      "a package without a README",
      repo({}, ["packages/a/README.md"]),
      "Package a has no README.md",
    ],
    [
      "a missing agent quickstart",
      repo({}, ["docs/quickstart-agent.md"]),
      "docs/quickstart-agent.md is missing",
    ],
    [
      "a missing developer quickstart",
      repo({}, ["docs/quickstart-developer.md"]),
      "docs/quickstart-developer.md is missing",
    ],
    [
      "a missing consumer quickstart",
      repo({}, ["docs/quickstart-api-consumer.md"]),
      "docs/quickstart-api-consumer.md is missing",
    ],
    ["a missing root README", repo({}, ["README.md"]), "README.md is missing"],
    ["a missing DEV_RULES", repo({}, ["DEV_RULES.md"]), "DEV_RULES.md is missing"],
  ])("rejects %s", async (_name, files, fragment) => {
    expect(await problemsOf(files)).toContain(fragment);
  });
});
