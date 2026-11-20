import { afterAll, expect, test } from "bun:test";
import { positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  checkDocumentLinks,
  documentLinkProblems,
} from "../../../tooling/scripts/check-document-links.ts";

afterAll(removeAll);
const load = async (path: string) => ({
  exists: path === "docs/target.md",
  markdown: "# Target\n\n## Same\n\n## Same\n",
});
const missing = async () => ({ exists: false });
unit(documentLinkProblems, {
  positive: [
    positive(
      "default loader resolves an actual repository file",
      ["README.md", "[config](packages/config/README.md)"],
      [],
    ),
    positive(
      "relative target and duplicate heading",
      ["docs/from.md", "[go](target.md#same-1)", load],
      [],
    ),
    positive(
      "same-page heading and code examples",
      ["docs/from.md", "# Own\n[go](#own)\n\n`[example](absent.md)`", missing],
      [],
    ),
    positive(
      "reference definition",
      ["docs/from.md", "[go][ref]\n\n[ref]: target.md#target", load],
      [],
    ),
  ],
  negative: [
    rejected(
      "missing target",
      ["docs/from.md", "[go](gone.md)", missing],
      ["Invalid repository document link: docs/from.md -> gone.md"],
    ),
    rejected(
      "missing heading",
      ["docs/from.md", "[go](target.md#absent)", load],
      ["Invalid repository document link: docs/from.md -> target.md#absent"],
    ),
  ],
});

test.each([
  "../../outside.md",
  "%2e%2e/%2e%2e/outside.md",
  "javascript:alert(1)",
  "//other.test/file",
  "target.md#%GG",
  "target.md#wrong",
  "missing.png",
])("link mutation fails: %s", async (target) => {
  expect(await documentLinkProblems("docs/source.md", `[link](${target})`, load)).toHaveLength(1);
});

const root = await makeDir();
await writeFiles(root, {
  "docs/guide.md": "[go](target.md#target)",
  "docs/target.md": "# Target",
  "docs/broken.md": "[go](removed.md)",
});
const listing = async () => ({
  exitCode: 0,
  stdout: "docs/guide.md\0docs/target.md\0",
  stderr: "",
});
const empty = async () => ({ exitCode: 0, stdout: "", stderr: "" });
const broken = async () => ({ exitCode: 0, stdout: "docs/broken.md\0", stderr: "" });
const failed = async () => ({ exitCode: 1, stdout: "", stderr: "git failed" });
unit(checkDocumentLinks, {
  positive: [
    positive("existing links", [root, listing], 0),
    positive("empty inventory", [root, empty], 0),
  ],
  negative: [
    rejected("deleted target", [root, broken], 1),
    rejected("failed inventory blocks", [root, failed], 1),
  ],
});
