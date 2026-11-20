import { afterAll, describe, expect, test } from "bun:test";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { all } from "@platform/util";
import {
  generatedCodeTypechecks,
  sdkMatchesOpenApi,
} from "../../../tooling/scripts/generate-sdk.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

const GENERATED = join(REPO_ROOT, "packages/sdk/generated");
const directories: string[] = [];

afterAll(async () => {
  await all(
    directories.map((directory) => async () => rm(directory, { recursive: true, force: true })),
  );
});

async function copy(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "sdk-copy-"));
  directories.push(directory);
  await cp(GENERATED, directory, { recursive: true });
  return directory;
}

describe("SDK drift gate", () => {
  test("the committed SDK is what the OpenAPI document generates", async () => {
    expect(await sdkMatchesOpenApi()).toBe(true);
  });

  test("the generated code type-checks", async () => {
    expect(await generatedCodeTypechecks()).toBe(true);
  });

  test("a hand edit to a generated file is detected", async () => {
    const directory = await copy();
    const file = join(directory, "sdk.gen.ts");
    await Bun.write(file, `${await Bun.file(file).text()}\nexport const handWritten = 1;\n`);
    expect(await sdkMatchesOpenApi(directory)).toBe(false);
  });

  test("a deleted generated file is detected", async () => {
    const directory = await copy();
    await rm(join(directory, "zod.gen.ts"));
    expect(await sdkMatchesOpenApi(directory)).toBe(false);
  });
});
