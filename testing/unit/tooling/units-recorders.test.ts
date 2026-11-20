import { afterAll, expect } from "bun:test";
import { symlink } from "node:fs/promises";
import { join } from "node:path";
import { DocCategory } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { REPO_ROOT } from "@platform/test-framework";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { OpenApiDocumentSchema, type PackedSdk, type RecordedPage } from "@platform/types";
import { buildSdk } from "../../../tooling/scripts/build-sdk.ts";
import { generateApiDocs } from "../../../tooling/scripts/generate-api-docs.ts";
import { recordInto } from "../../../tooling/scripts/record-kb.ts";
import { packSdk } from "../../../tooling/scripts/sdk-pack.ts";

afterAll(removeAll);
const sdkFixture = await packSdk();
const sdkEntry = join(sdkFixture.directory, "dist/index.js");
await symlink(
  join(REPO_ROOT, "packages/sdk/node_modules"),
  join(sdkFixture.directory, "node_modules"),
);

const exists = (path: string) => async () => Bun.file(path).exists();
const blocked = await makeDir();
await writeFiles(blocked, { blocker: "not a folder" });
const BLOCKED = join(blocked, "blocker", "out");
const BUILD_FAILED = { message: expect.stringContaining("Build failed") };

const firstBuild = await makeDir();
const secondBuild = await makeDir();

unit(buildSdk, {
  positive: [
    positive(
      "the bundle is written to the output folder",
      [firstBuild],
      seen(exists(join(firstBuild, "index.js")), true),
    ),
    positive(
      "the type declarations are written too",
      [secondBuild],
      seen(exists(join(secondBuild, "index.d.ts")), true),
    ),
  ],
  negative: [
    negative("an output folder under a file cannot be written", [BLOCKED], BUILD_FAILED),
    negative(
      "an output folder that cannot be created fails",
      ["/proc/unit-nope/out"],
      BUILD_FAILED,
    ),
  ],
});

const noBuild = async () => undefined;
const emptyPackage = await makeDir();
const failingBuild = async () => {
  throw new RangeError("build failed upstream");
};
const manifestOf = (packed: PackedSdk) => Bun.file(join(packed.directory, "package.json")).json();
const nameOf = async (packed: PackedSdk) => (await manifestOf(packed)).name;
const hasTarball = async (packed: PackedSdk) => Bun.file(packed.tarball).exists();
const hasBundle = async (packed: PackedSdk) =>
  Bun.file(join(packed.directory, "dist", "index.js")).exists();

unit(packSdk, {
  positive: [
    positive(
      "the package is packed and extracted",
      [noBuild, undefined, sdkFixture.directory],
      seen(nameOf, "@platform/sdk"),
    ),
    positive(
      "the tarball exists",
      [noBuild, undefined, sdkFixture.directory],
      seen(hasTarball, true),
    ),
    positive(
      "the bundle is part of the package",
      [noBuild, undefined, sdkFixture.directory],
      seen(hasBundle, true),
    ),
  ],
  negative: [
    negative("a failing build stops the pack", [failingBuild], { name: "RangeError" }),
    negative(
      "a tar that cannot unpack the tarball is reported",
      [noBuild, "false", sdkFixture.directory],
      {
        message: expect.stringContaining("Packing the SDK failed"),
      },
    ),
    negative(
      "a folder that is not a package cannot be packed",
      [noBuild, undefined, emptyPackage],
      {
        message: expect.stringContaining("Packing the SDK failed"),
      },
    ),
    negative("the build failure keeps its message", [failingBuild], {
      message: "build failed upstream",
    }),
  ],
});

const countOf = (paths: string[]) => paths.length;
const underOutput = (directory: string) => (paths: string[]) =>
  paths.every((path) => path.startsWith(directory));

const apiDocs = await makeDir();
const apiDocsC = await makeDir();
const sdkStub = await makeDir();
await writeFiles(sdkStub, { "index.js": "export const nothing = 1;\n" });
const moreApiDocs = await makeDir();

const apiDocument = OpenApiDocumentSchema.parse(
  await Bun.file(join(REPO_ROOT, "openapi/baseline.json")).json(),
);
const stubTools = [{ name: "config.get", description: "Read configuration", inputSchema: {} }];
const stubInterfaces = async () => ({ document: apiDocument, tools: stubTools });
const stubPages = async (): Promise<RecordedPage[]> => [
  {
    id: "fixture",
    title: "Fixture",
    intent: "Record an exchange",
    category: DocCategory.ApiCalls,
    results: [],
  },
];

unit(generateApiDocs, {
  positive: [
    positive(
      "the api pages are written",
      [apiDocs, sdkEntry, stubInterfaces, stubPages],
      seen(countOf, 6),
    ),
    positive(
      "every page is under the output folder",
      [moreApiDocs, sdkEntry, stubInterfaces, stubPages],
      seen(underOutput(moreApiDocs), true),
    ),
  ],
  negative: [
    negative(
      "an output folder under a file cannot be written",
      [BLOCKED, sdkEntry, stubInterfaces, stubPages],
      {
        code: "ENOTDIR",
      },
    ),
    negative(
      "a missing output folder argument throws",
      [undefined, sdkEntry, stubInterfaces, stubPages],
      {
        name: "TypeError",
      },
    ),
    negative(
      "an sdk without the operations cannot be referenced",
      [apiDocsC, join(sdkStub, "index.js"), stubInterfaces, stubPages],
      {
        message: expect.stringContaining("does not export"),
      },
    ),
  ],
});

const staging =
  (...names: string[]) =>
  async (directory: string) => {
    await writeFiles(directory, Object.fromEntries(names.map((name) => [name, name])));
    return names.map((name) => join(directory, name));
  };
const firstKb = await makeDir();
const secondKb = await makeDir();
const failedKb = await makeDir();
const RECORDING_TIMEOUT_MS = 180_000;
const stagedNames = (directory: string) => (paths: string[]) =>
  paths.map((path) => path.replace(`${directory}/`, "")).sort();
const fileText = (path: string) => async () => Bun.file(path).text();
const recorderFailure = async () => {
  throw new RangeError("recorder crashed");
};

unit(
  recordInto,
  {
    positive: [
      positive(
        "staged files are copied into the directory",
        [firstKb, undefined, staging("a.md", "b.md")],
        seen(stagedNames(firstKb), ["a.md", "b.md"]),
      ),
      positive(
        "the copied file has the staged text",
        [secondKb, undefined, staging("c.md")],
        seen(fileText(join(secondKb, "c.md")), "c.md"),
      ),
    ],
    negative: [
      negative(
        "a recorder that fails surfaces its failure",
        [failedKb, undefined, recorderFailure],
        {
          name: "RangeError",
        },
      ),
      negative(
        "a directory under a file cannot receive the pages",
        [BLOCKED, undefined, staging("d.md")],
        {
          code: "ENOTDIR",
        },
      ),
    ],
  },
  undefined,
  RECORDING_TIMEOUT_MS,
);
