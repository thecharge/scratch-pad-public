import { afterAll } from "bun:test";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  checkDocsScope,
  developmentPages,
  pagesWithoutSource,
} from "../../../tooling/scripts/check-docs-scope.ts";

const SITE = "apps/docs/src/content/docs";
const GENERATED = "---\ntitle: T\ndescription: D\ngenerated: true\n---\n\nbody\n";
const HAND_WRITTEN = "---\ntitle: T\ndescription: D\n---\n\nbody\n";
const ARCHITECTURE_PAGE = `${SITE}/guides/architecture.md`;
const AUTH_PAGE = `${SITE}/general/auth.md`;

async function site(files: Record<string, string>): Promise<string> {
  const root = await makeDir();
  await writeFiles(
    root,
    Object.fromEntries(Object.entries(files).map(([file, text]) => [`${SITE}/${file}`, text])),
  );
  return root;
}

const clean = await site({ "guides/sdk.md": GENERATED, "index.mdx": HAND_WRITTEN });
const development = await site({ "guides/sdk.md": GENERATED, "guides/architecture.md": GENERATED });
const handWritten = await site({ "general/auth.md": HAND_WRITTEN, "guides/sdk.md": GENERATED });
const bare = await makeDir();
afterAll(removeAll);

unit(developmentPages, {
  positive: [
    positive("product pages are not development pages", [clean], []),
    positive("a hand-written landing page is not a development page", [handWritten], []),
  ],
  negative: [
    rejected("an architecture page is named", [development], [ARCHITECTURE_PAGE]),
    negative("a root without a site throws", [bare], { code: "ENOENT" }),
  ],
});

unit(pagesWithoutSource, {
  positive: [
    positive("generated pages and the landing page need no source", [clean], []),
    positive("a generated architecture page has a source", [development], []),
  ],
  negative: [
    rejected("a hand-written behavior page is named", [handWritten], [AUTH_PAGE]),
    negative("a root without a site throws", [bare], { code: "ENOENT" }),
  ],
});

unit(checkDocsScope, {
  positive: [
    positive("a clean site exits with 0", [clean], 0),
    positive(
      "a site of generated product pages exits with 0",
      [await site({ "ui/a.md": GENERATED })],
      0,
    ),
  ],
  negative: [
    rejected("a development page exits with 1", [development], 1),
    rejected("a page without a generated source exits with 1", [handWritten], 1),
    negative("a root without a site throws", [bare], { code: "ENOENT" }),
  ],
});
