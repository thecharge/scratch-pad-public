import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { thrownBy } from "@platform/test-framework";
import { all } from "@platform/util";
import { loadFactualUrls } from "../../../packages/config/src/factual.ts";

const directories: string[] = [];

afterAll(async () => {
  await all(directories.map((dir) => async () => rm(dir, { recursive: true, force: true })));
});

async function fileWith(content: object): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "factual-"));
  directories.push(dir);
  const path = join(dir, "factual-urls.json");
  await Bun.write(path, JSON.stringify(content));
  return path;
}

const FULL = {
  console: "https://console.example",
  api: "https://api.example",
  mcp: "https://api.example/mcp",
  docs: "https://docs.example",
};

describe("factual urls", () => {
  test("a complete file loads", async () => {
    expect(await loadFactualUrls(await fileWith(FULL))).toEqual(FULL);
  });

  test.each([
    ["one empty value", { ...FULL, mcp: "" }, ["mcp"]],
    [
      "all values empty",
      { console: "", api: "", mcp: "", docs: "" },
      ["console", "api", "mcp", "docs"],
    ],
    ["a value that is not an address", { ...FULL, docs: "docs" }, ["docs"]],
  ])("fails naming the missing setting for %s", async (_name, content, names) => {
    const failure = await thrownBy(async () => loadFactualUrls(await fileWith(content)));
    expect(names.every((name) => (failure as Error).message.includes(name))).toBe(true);
  });

  test("the committed file is empty until the user fills it", async () => {
    const failure = await thrownBy(() => loadFactualUrls());
    expect((failure as Error).message).toContain("factual-urls.json");
  });
});
