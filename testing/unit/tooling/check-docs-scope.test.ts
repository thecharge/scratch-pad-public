import { afterAll, describe, expect, test } from "bun:test";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { developmentPages, pagesWithoutSource } from "../../../tooling/scripts/check-docs-scope.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

const SITE = "apps/docs/src/content/docs";

async function pagesOf(files: readonly string[]): Promise<string[]> {
  const dir = await makeDir();
  await writeFiles(dir, Object.fromEntries(files.map((file) => [`${SITE}/${file}`, "# page"])));
  return developmentPages(dir);
}

describe("documentation scope", () => {
  test("the real documentation site holds no development page", async () => {
    expect(await developmentPages(REPO_ROOT)).toEqual([]);
  });

  test("product pages pass", async () => {
    expect(
      await pagesOf(["guides/sdk.md", "kb/masking.mdx", "reference/http.md", "ui/console.mdx"]),
    ).toEqual([]);
  });

  test.each([
    ["an architecture page", "guides/architecture.md"],
    ["a standards page", "standards.md"],
    ["a running-verify page", "development/running-verify.mdx"],
    ["an enabling-ci page", "enabling-ci.md"],
    ["a guidelines page", "guidelines.md"],
    ["a hand-written end-to-end page", "e2e/how-we-test.md"],
    ["a generated browser report", "e2e/report.md"],
    ["a generated performance report", "e2e/performance.md"],
    ["a generated protocol report", "e2e/protocols.md"],
  ])("rejects %s and names it", async (_name, file) => {
    expect(await pagesOf(["guides/sdk.md", file])).toContain(`${SITE}/${file}`);
  });
});

const GENERATED = "---\ntitle: T\ndescription: D\ngenerated: true\n---\n\nbody\n";
const HAND_WRITTEN = "---\ntitle: T\ndescription: D\n---\n\nbody\n";

async function withoutSourceIn(files: Readonly<Record<string, string>>): Promise<string[]> {
  const dir = await makeDir();
  await writeFiles(
    dir,
    Object.fromEntries(Object.entries(files).map(([file, text]) => [`${SITE}/${file}`, text])),
  );
  return pagesWithoutSource(dir);
}

describe("behavior pages have a generated source", () => {
  test("the real documentation site has none without one", async () => {
    expect(await pagesWithoutSource(REPO_ROOT)).toEqual([]);
  });

  test.each([
    ["a hand-written md page", { "general/auth.md": HAND_WRITTEN }],
    ["a hand-written mdx page", { "api-calls/x.mdx": HAND_WRITTEN }],
    [
      "a page whose body only mentions the key",
      { "ui/y.md": "---\ntitle: T\n---\ngenerated: true\n" },
    ],
  ])("rejects %s", async (_name, files) => {
    expect((await withoutSourceIn(files)).length).toBe(1);
  });

  test("accepts a generated page and the landing page", async () => {
    expect(await withoutSourceIn({ "ui/a.mdx": GENERATED, "index.mdx": HAND_WRITTEN })).toEqual([]);
  });
});
