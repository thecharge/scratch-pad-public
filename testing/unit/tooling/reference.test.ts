import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { all } from "@platform/util";
import { generateReference } from "../../../tooling/scripts/generate-reference.ts";

const directories: string[] = [];

afterAll(async () => {
  await all(
    directories.map((directory) => async () => rm(directory, { recursive: true, force: true })),
  );
});

async function generated(): Promise<string[]> {
  const directory = await mkdtemp(join(tmpdir(), "reference-"));
  directories.push(directory);
  const paths = await generateReference(directory);
  return all(paths.map((path) => async () => Bun.file(path).text()));
}

describe("generated reference", () => {
  test("the HTTP page lists public colon paths from the OpenAPI document", async () => {
    const [http] = await generated();
    expect(http).toContain("/v1/publishers/{publisher}/books/{book}:archive");
  });

  test("the MCP page lists every tool with its schema", async () => {
    const [, mcp] = await generated();
    expect(mcp).toContain("books.batchGet");
  });

  test("the skills page lists a skill per resource collection", async () => {
    const [, , skills] = await generated();
    expect(skills).toContain("### books");
  });

  test("no page is hand-written: each starts with generated front matter", async () => {
    const pages = await generated();
    expect(pages.map((page) => page.startsWith("---\ntitle: "))).toEqual([true, true, true]);
  });
});
