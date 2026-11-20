import { afterAll, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { thrownBy } from "@platform/test-framework";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { all } from "@platform/util";
import { runBuildSdk } from "../../../tooling/scripts/build-sdk.ts";
import { packedFiles, sdkLeaks } from "../../../tooling/scripts/check-sdk-pack.ts";
import { packSdk } from "../../../tooling/scripts/sdk-pack.ts";

const roots: string[] = [];

afterAll(async () => {
  await removeAll();
  await all(roots.map((root) => async () => rm(root, { recursive: true, force: true })));
});

async function packed() {
  const result = await packSdk();
  roots.push(dirname(result.directory));
  return result;
}

const manifest = await packed();
const clean = await packed();
const contaminated = await packed();

describe("the real packed SDK", () => {
  test("holds a manifest, the license, the readme and the built files", async () => {
    const { directory } = manifest;
    expect(Object.keys(await packedFiles(directory)).sort()).toEqual([
      "LICENSE",
      "README.md",
      "dist/index.d.ts",
      "dist/index.js",
      "package.json",
    ]);
  });

  test("imports no workspace package and no source file", async () => {
    const { directory } = clean;
    expect(await sdkLeaks(await packedFiles(directory))).toEqual([]);
  });

  test("a workspace import added to the packed output is reported", async () => {
    const { directory } = contaminated;
    const file = join(directory, "dist/index.js");
    await Bun.write(file, `import "@platform/constants";\n${await Bun.file(file).text()}`);
    expect(await sdkLeaks(await packedFiles(directory))).toEqual([
      { file: "dist/index.js", specifier: "@platform/constants" },
    ]);
  });
});

const buildFirst = await makeDir();
const buildSecond = await makeDir();
const blockedRoot = await makeDir();
await writeFiles(blockedRoot, { blocker: "not a folder" });
const blocked = join(blockedRoot, "blocker", "out");
const builtCode = await runBuildSdk(buildFirst);
await runBuildSdk(buildSecond);
const blockedFailure = await thrownBy(() => runBuildSdk(blocked));
const forbiddenFailure = await thrownBy(() => runBuildSdk("/proc/unit-nope/out"));

test.each([
  { name: "the SDK is built into the folder", actual: builtCode, expected: 0 },
  {
    name: "the bundle is there afterwards",
    actual: await Bun.file(join(buildSecond, "index.js")).exists(),
    expected: true,
  },
  {
    name: "an output folder under a file cannot be written",
    actual: (blockedFailure as Error).message.includes("Build failed"),
    expected: true,
  },
  {
    name: "an output folder nobody may create fails",
    actual: (forbiddenFailure as Error).message.includes("Build failed"),
    expected: true,
  },
])("real SDK command: $name", async ({ actual, expected }) => {
  expect(actual).toEqual(expected);
});
