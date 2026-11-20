import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { E2E_TEST_TIMEOUT_MS } from "@platform/constants";
import { all } from "@platform/util";

setDefaultTimeout(E2E_TEST_TIMEOUT_MS);

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DOCS_DIST } from "@platform/constants";
import { REPO_ROOT } from "../../packages/recorder/src/repo.ts";
import { docsReport, pathsOf, runDocsE2e } from "../../packages/recorder/src/ui/docs-e2e.ts";

const DIST = join(REPO_ROOT, DOCS_DIST);
const directories: string[] = [];

afterAll(async () => {
  await all(
    directories.map((directory) => async () => rm(directory, { recursive: true, force: true })),
  );
});

describe("the built documentation site in a real browser", () => {
  test("every page loads cleanly, loads its images and draws its diagrams; search finds a page", async () => {
    const shots = await mkdtemp(join(tmpdir(), "docs-e2e-"));
    directories.push(shots);
    const results = await runDocsE2e(DIST, shots);
    expect([results.length, results.some((page) => page.diagrams > 0)]).toEqual([
      (await pathsOf(DIST)).length,
      true,
    ]);
  });

  test("the report lists every page with its screenshot", () => {
    const report = docsReport([
      { path: "/guides/a/", title: "A", diagrams: 1, images: 0, screenshot: "screenshots/a.png" },
    ]);
    expect(report).toContain("![A](screenshots/a.png)");
  });
});
