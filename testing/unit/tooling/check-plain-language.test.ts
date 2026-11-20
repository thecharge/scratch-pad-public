import { afterAll, describe, expect, test } from "bun:test";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { pageProblems, plainProblems } from "../../../tooling/scripts/check-plain-language.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

const GOOD =
  '---\ntitle: "A page"\ndescription: "What it holds."\n---\n\nShort sentences are easy to read.\n';
const LONG = Array.from({ length: 40 }, () => "word").join(" ");

describe("plain-language rules", () => {
  test("the real documentation passes", async () => {
    expect(await plainProblems(REPO_ROOT)).toEqual([]);
  });

  test("a clean page in a category folder passes", async () => {
    expect(await pageProblems("ui/a.md", GOOD)).toEqual([]);
  });

  test.each([
    ["a page without a title", "ui/a.md", GOOD.replace("title", "name"), "missing-title"],
    [
      "a page without a description",
      "ui/a.md",
      GOOD.replace("description", "about"),
      "missing-description",
    ],
    ["a page outside a category folder", "loose/a.md", GOOD, "missing-category"],
    ["a sentence over 30 words", "ui/a.md", `${GOOD}\n${LONG}.\n`, "sentence-too-long"],
    ["a banned word", "ui/a.md", `${GOOD}\nIt is obviously fine.\n`, "banned-word"],
  ])("rejects %s and names the rule", async (_name, page, text, rule) => {
    expect((await pageProblems(page, text)).join("\n")).toContain(rule);
  });

  test("code blocks are not counted as prose", async () => {
    expect(await pageProblems("ui/a.md", `${GOOD}\n\`\`\`text\n${LONG}.\n\`\`\`\n`)).toEqual([]);
  });

  test("a fixture site with one bad page names that page", async () => {
    const dir = await makeDir();
    await writeFiles(dir, {
      "apps/docs/src/content/docs/ui/good.md": GOOD,
      "apps/docs/src/content/docs/ui/bad.md": `${GOOD}\n${LONG}.\n`,
    });
    expect((await plainProblems(dir)).join("\n")).toContain("ui/bad.md");
  });
});

test("an embedded Markdown fence in recorded JSON stays inside its outer code block", async () => {
  const response = JSON.stringify({ content: ["A skill with ```json", LONG, "```"].join("\n") });
  const text = [GOOD, "```json", response, "```", ""].join("\n");
  expect(await pageProblems("api-calls/mcp.mdx", text)).toEqual([]);
});
test("prose after an embedded fence is still checked", async () => {
  const response = JSON.stringify({ content: "```json" });
  const text = [GOOD, "```json", response, "```", `${LONG}.`, ""].join("\n");
  expect((await pageProblems("api-calls/mcp.mdx", text)).join(" ")).toContain("sentence-too-long");
});
