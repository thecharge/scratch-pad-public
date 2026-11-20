import { afterAll, expect } from "bun:test";
import { join } from "node:path";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { gitRepo, makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { DocsPageResult } from "@platform/types";
import { astroBuild, browseAndReport } from "../../../tooling/scripts/build-docs.ts";
import { checkSkillsFresh } from "../../../tooling/scripts/check-skills-fresh.ts";
import { produceDocs } from "../../../tooling/scripts/run-tier.ts";
import { runSecretScan } from "../../../tooling/scripts/secret-scan.ts";
import { stripFiles } from "../../../tooling/scripts/strip-comments.ts";

afterAll(removeAll);

async function tree(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await makeDir();
  await writeFiles(root, files);
  return root;
}

const docsApp = await tree({ "apps/docs/.keep": "" });
const noApp = await tree({});
const commandOf =
  (...words: string[]) =>
  async () =>
    words;

unit(produceDocs, {
  positive: [
    positive("a docs command that succeeds gives 0", [commandOf("true")], 0),
    positive("a docs command that prints and succeeds gives 0", [commandOf("echo", "built")], 0),
  ],
  negative: [
    rejected("a docs command that fails gives its code", [commandOf("false")], 1),
    rejected(
      "a docs command with another code gives that code",
      [commandOf("sh", "-c", "exit 3")],
      3,
    ),
  ],
});

unit(astroBuild, {
  positive: [
    positive("a build that succeeds gives 0", [docsApp, ["true"]], 0),
    positive("a build that prints and succeeds gives 0", [docsApp, ["echo", "built"]], 0),
  ],
  negative: [
    rejected("a build that fails gives its code", [docsApp, ["sh", "-c", "exit 4"]], 4),
    negative("a root without the docs app cannot start the build", [noApp, ["true"]], {
      code: "ENOENT",
    }),
  ],
});

const PAGE: DocsPageResult = {
  path: "/guides/start/",
  title: "Start here",
  diagrams: 1,
  images: 2,
  screenshot: "screenshots/shot.png",
};
const reportRoot = await makeDir();
const secondReportRoot = await makeDir();
const blockedRoot = await tree({ blocker: "not a folder" });
const reportOf = (root: string) => async () => Bun.file(join(root, "docs/e2e/report.md")).text();
const browsing = (results: DocsPageResult[]) => async (_dist: string, output: string) => {
  await writeFiles(output, { "shot.png": "image" });
  return results;
};
const browseFails = async () => {
  throw new RangeError("browser crashed");
};

unit(browseAndReport, {
  positive: [
    positive(
      "the report names every checked page",
      [reportRoot, browsing([PAGE])],
      seen(
        async () => [
          await reportOf(reportRoot)(),
          await Bun.file(join(reportRoot, "docs/e2e/screenshots/shot.png")).exists(),
          await Bun.file(join(reportRoot, "apps/docs/src/content/docs/e2e/report.md")).exists(),
        ],
        [expect.stringContaining("![Start here](screenshots/shot.png)"), true, false],
      ),
    ),
    positive(
      "a site without pages gives a report with a zero count",
      [secondReportRoot, browsing([])],
      seen(reportOf(secondReportRoot), expect.stringContaining("0")),
    ),
  ],
  negative: [
    negative("a browser that crashes stops the report", [reportRoot, browseFails], {
      name: "RangeError",
    }),
    negative(
      "a root under a file cannot take the report",
      [join(blockedRoot, "blocker"), browsing([PAGE])],
      {
        code: "ENOTDIR",
      },
    ),
  ],
});

const SKILL_MAP = '{"demo":["src/*.ts"]}';
const stagedStale = await gitRepo(
  { ".claude/skills/skill-paths.json": SKILL_MAP, "src/a.ts": "export const a = 1;\n" },
  true,
  false,
);
const stagedFresh = await gitRepo(
  {
    ".claude/skills/skill-paths.json": SKILL_MAP,
    ".claude/skills/demo/SKILL.md": "---\nname: demo\n---\n",
    "src/a.ts": "export const a = 1;\n",
  },
  true,
  false,
);
const stagedNothing = await gitRepo({ ".claude/skills/skill-paths.json": SKILL_MAP }, false, false);

unit(checkSkillsFresh, {
  positive: [
    positive("staged files with their skill staged too pass", [[], stagedFresh], 0),
    positive("nothing staged passes", [[], stagedNothing], 0),
  ],
  negative: [
    rejected("a staged file without its skill staged fails", [[], stagedStale], 1),
    rejected(
      "a root that is not a repository stages nothing and passes the map check",
      [["src/x.ts"], stagedStale],
      1,
    ),
  ],
});

const stripRepo = await gitRepo(
  { "commented.ts": "export const a = 1; // note\n", "clean.ts": "export const b = 2;\n" },
  false,
  false,
);
const textOf = (name: string) => async () => Bun.file(join(stripRepo, name)).text();
const nowhere = async () => "";
const withComment = async () => "export const a = 1; // note\n";
const notARepo = await tree({ "a.ts": "export const a = 1; // note\n" });

unit(stripFiles, {
  positive: [
    positive(
      "the standard input mode strips a comment and succeeds",
      [["--stdin", "a.ts"], withComment],
      0,
    ),
    positive(
      "without arguments every tracked file of the root is stripped",
      [[], nowhere, stripRepo],
      seen(textOf("commented.ts"), "export const a = 1;\n"),
    ),
  ],
  negative: [
    rejected(
      "a file without comments stays as it is",
      [[], nowhere, stripRepo],
      seen(textOf("clean.ts"), "export const b = 2;\n"),
    ),
    rejected("a root that is not a repository has nothing to strip", [[], nowhere, notARepo], 0),
  ],
});

const outsideGit = await tree({ "a.txt": "text\n" });

unit(runSecretScan, {
  positive: [
    positive("clean text on stdin passes", ["stdin", async () => "plain text\n"], 0),
    positive("another clean text on stdin passes", ["stdin", async () => "more text\n"], 0),
  ],
  negative: [
    rejected(
      "staged mode outside a repository fails with the usage code of the version tool",
      ["staged", nowhere, outsideGit],
      129,
    ),
    rejected("an unknown mode is a usage error", ["other"], 2),
  ],
});
