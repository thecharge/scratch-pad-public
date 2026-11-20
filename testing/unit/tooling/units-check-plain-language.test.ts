import { afterAll, expect } from "bun:test";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  checkPlainLanguage,
  pageProblems,
  plainProblems,
} from "../../../tooling/scripts/check-plain-language.ts";

const SITE = "apps/docs/src/content/docs";
const GOOD =
  '---\ntitle: "A page"\ndescription: "What it holds."\n---\n\nShort sentences are easy to read.\n';
const LONG = Array.from({ length: 40 }, () => "word").join(" ");

async function site(files: Record<string, string>): Promise<string> {
  const root = await makeDir();
  await writeFiles(
    root,
    Object.fromEntries(Object.entries(files).map(([file, text]) => [`${SITE}/${file}`, text])),
  );
  return root;
}

const clean = await site({ "ui/a.md": GOOD });
const longPage = await site({ "ui/good.md": GOOD, "ui/bad.md": `${GOOD}\n${LONG}.\n` });
const banned = await site({ "ui/bad.md": `${GOOD}\nIt is obviously fine.\n` });
const bare = await makeDir();
afterAll(removeAll);

unit(pageProblems, {
  positive: [
    positive("a clean page in a category folder", ["ui/a.md", GOOD], []),
    positive(
      "code blocks are not counted as prose",
      ["ui/a.md", `${GOOD}\n\`\`\`text\n${LONG}.\n\`\`\`\n`],
      [],
    ),
  ],
  negative: [
    rejected(
      "a page without a title",
      ["ui/a.md", GOOD.replace("title", "name")],
      [expect.stringContaining("missing-title")],
    ),
    rejected(
      "a page without a description",
      ["ui/a.md", GOOD.replace("description", "about")],
      [expect.stringContaining("missing-description")],
    ),
    rejected(
      "a page outside a category folder",
      ["loose/a.md", GOOD],
      [expect.stringContaining("missing-category")],
    ),
    rejected(
      "a sentence over the limit",
      ["ui/a.md", `${GOOD}\n${LONG}.\n`],
      [expect.stringContaining("sentence-too-long")],
    ),
    rejected(
      "a banned word",
      ["ui/a.md", `${GOOD}\nIt is obviously fine.\n`],
      [expect.stringContaining("banned-word")],
    ),
  ],
});

unit(plainProblems, {
  positive: [
    positive("a clean site", [clean], []),
    positive("a site of two clean pages", [await site({ "ui/a.md": GOOD, "ui/b.md": GOOD })], []),
  ],
  negative: [
    rejected("a long sentence names its page", [longPage], [expect.stringContaining("ui/bad.md")]),
    rejected("a banned word names its page", [banned], [expect.stringContaining("ui/bad.md")]),
    negative("a root without a site throws", [bare], { code: "ENOENT" }),
  ],
});

unit(checkPlainLanguage, {
  positive: [
    positive("a clean site exits with 0", [clean], 0),
    positive("two clean pages exit with 0", [await site({ "ui/a.md": GOOD, "ui/b.md": GOOD })], 0),
  ],
  negative: [
    rejected("a long sentence exits with 1", [longPage], 1),
    rejected("a banned word exits with 1", [banned], 1),
    negative("a root without a site throws", [bare], { code: "ENOENT" }),
  ],
});
