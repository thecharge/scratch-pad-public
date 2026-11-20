import { afterAll, expect } from "bun:test";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  bundleLeaks,
  packageCycles,
  workspaceGraph,
} from "../../../tooling/scripts/check-package-graph.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

const ENTRY = "entry.ts";
const manifest = (name: string, dependencies: string[]) =>
  JSON.stringify({
    name,
    dependencies: Object.fromEntries([...dependencies, "zod"].map((item) => [item, "1"])),
  });

const cleanRoot = await makeDir();
await writeFiles(cleanRoot, { [ENTRY]: "export const value = 1;\n" });
const envRoot = await makeDir();
await writeFiles(envRoot, { [ENTRY]: "export const value = process.env.SECRET_PLACE;\n" });
const loaderRoot = await makeDir();
await writeFiles(loaderRoot, {
  [ENTRY]: 'import { load } from "./packages/config/src/load.ts";\nexport const value = load;\n',
  "packages/config/src/load.ts": "export const load = 1;\n",
});
const graphRoot = await makeDir();
await writeFiles(graphRoot, {
  "packages/a/package.json": manifest("@platform/a", ["@platform/b", "@platform/missing"]),
  "packages/b/package.json": manifest("@platform/b", []),
  "apps/c/package.json": manifest("@platform/c", ["@platform/a"]),
});
const smallRoot = await makeDir();
await writeFiles(smallRoot, {
  [ENTRY]: 'import { one } from "./one.ts";\nexport const value = one;\n',
  "one.ts": "export const one = 1;\n",
});
const emptyRoot = await makeDir();
const brokenRoot = await makeDir();
await writeFiles(brokenRoot, { "packages/x/package.json": "{" });

unit(packageCycles, {
  positive: [
    positive("the real workspace has no cycle", [await workspaceGraph(REPO_ROOT)], []),
    positive("a chain has no cycle", [{ a: ["b"], b: ["c"], c: [] }], []),
    positive("a diamond has no cycle", [{ a: ["b", "c"], b: ["d"], c: ["d"], d: [] }], []),
  ],
  negative: [
    rejected(
      "two packages that need each other are a cycle",
      [{ a: ["b"], b: ["a"] }],
      ["a -> b -> a"],
    ),
    rejected("a package that needs itself is a cycle", [{ a: ["a"] }], ["a -> a"]),
  ],
});

unit(workspaceGraph, {
  positive: [
    positive("lists the workspace dependencies of each package", [graphRoot], {
      "@platform/a": ["@platform/b"],
      "@platform/b": [],
      "@platform/c": ["@platform/a"],
    }),
    positive("an empty root has an empty graph", [emptyRoot], {}),
  ],
  negative: [
    negative("a manifest that is not JSON is rejected", [brokenRoot], { name: "SyntaxError" }),
    negative("a manifest list that cannot be read is rejected", [`${brokenRoot}/${ENTRY}`], {
      name: "Error",
    }),
  ],
});

unit(bundleLeaks, {
  positive: [
    positive("a clean entry has no leak", [cleanRoot, ENTRY], []),
    positive("an entry that imports a small module has no leak", [smallRoot, ENTRY], []),
  ],
  negative: [
    negative("an entry that does not exist is a failed build", [emptyRoot, "none.ts"], {
      message: expect.stringContaining("did not build"),
    }),
    rejected("an entry that reads process.env leaks it", [envRoot, ENTRY], ["process.env"]),
    rejected(
      "an entry that loads the config loader leaks it",
      [loaderRoot, ENTRY],
      ["packages/config/src/load.ts"],
    ),
  ],
});
