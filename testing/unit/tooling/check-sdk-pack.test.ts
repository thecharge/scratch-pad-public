import { describe, expect, test } from "bun:test";
import { sdkLeaks } from "../../../tooling/scripts/check-sdk-pack.ts";

const CLEAN_MANIFEST = '{"name":"s","dependencies":{"zod":"4.6.7"}}';

describe("packed SDK leak check", () => {
  test.each([
    ["a bundled file importing only zod", { "dist/index.js": 'import { z } from "zod";\n' }],
    ["a declaration file importing only zod", { "dist/index.d.ts": 'import { z } from "zod";\n' }],
    ["a manifest with a registry dependency", { "package.json": CLEAN_MANIFEST }],
    ["a string that only mentions an import", { "dist/index.js": 'const note = "see from x";\n' }],
  ])("accepts %s", async (_name, files) => {
    expect(await sdkLeaks(files)).toEqual([]);
  });

  test.each([
    [
      "a workspace package import",
      { "dist/index.js": 'import { CanonicalCode } from "@platform/constants";\n' },
      "@platform/constants",
    ],
    [
      "a workspace type import in a declaration",
      { "dist/index.d.ts": 'import type { Operation } from "@platform/types";\n' },
      "@platform/types",
    ],
    [
      "a source path import",
      { "dist/index.js": 'import { helper } from "../src/helpers.ts";\n' },
      "../src/helpers.ts",
    ],
    [
      "a dynamic workspace import",
      { "dist/index.js": 'const m = await import("@platform/errors");\n' },
      "@platform/errors",
    ],
    [
      "a re-export from a workspace package",
      { "dist/index.d.ts": 'export * from "@platform/auth";\n' },
      "@platform/auth",
    ],
    [
      "a workspace dependency in the manifest",
      { "package.json": '{"dependencies":{"@platform/types":"0.0.0"}}' },
      "@platform/types",
    ],
    [
      "a workspace protocol range in the manifest",
      { "package.json": '{"dependencies":{"shared":"workspace:*"}}' },
      "shared",
    ],
  ])("rejects %s and names the import", async (_name, files, specifier) => {
    expect((await sdkLeaks(files)).map((leak) => leak.specifier)).toEqual([specifier]);
  });
});
