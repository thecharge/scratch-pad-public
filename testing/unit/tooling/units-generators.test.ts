import { afterAll, expect } from "bun:test";
import { cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { all } from "@platform/util";
import { migrationsMatchSchema } from "../../../tooling/scripts/check-migrations.ts";
import { generateReference } from "../../../tooling/scripts/generate-reference.ts";
import {
  generatedCodeTypechecks,
  sdkMatchesOpenApi,
} from "../../../tooling/scripts/generate-sdk.ts";
import { currentDocument } from "../../../tooling/scripts/openapi-check.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

const PROBE = join(await makeDir(), "unit-drift-probe.ts");
const PROBE_SOURCE = `export * from ${JSON.stringify(join(REPO_ROOT, "packages/db/src/schema/index.ts"))};
import { sqliteTable, text } from ${JSON.stringify(await Bun.resolve("drizzle-orm/sqlite-core", join(REPO_ROOT, "packages/db")))};
export const probe = sqliteTable("probe", { id: text("id").primaryKey() });
`;
const GENERATED = join(REPO_ROOT, "packages/sdk/generated");

afterAll(async () => {
  await rm(PROBE, { force: true });
  await removeAll();
});

await Bun.write(PROBE, PROBE_SOURCE);

unit(migrationsMatchSchema, {
  positive: [
    positive("the committed migrations match the schema", [], true),
    positive(
      "the committed schema file matches too",
      [join(REPO_ROOT, "packages/db/src/schema/index.ts")],
      true,
    ),
  ],
  negative: [
    rejected("a schema change without a migration is detected", [PROBE], false),
    negative("a schema file that is not there is an error", [join(REPO_ROOT, "absent.ts")], {
      message: expect.stringContaining("No schema files found"),
    }),
  ],
});

async function copyOfGenerated(mutate: (directory: string) => Promise<void>): Promise<string> {
  const directory = await makeDir();
  await cp(GENERATED, directory, { recursive: true });
  await mutate(directory);
  return directory;
}

const edited = await copyOfGenerated(async (directory) => {
  const file = join(directory, "sdk.gen.ts");
  await Bun.write(file, `${await Bun.file(file).text()}\nexport const handWritten = 1;\n`);
});
const trimmed = await copyOfGenerated(async (directory) => {
  await rm(join(directory, "zod.gen.ts"));
});
const untouched = await copyOfGenerated(async () => undefined);
const extra = await copyOfGenerated(async (directory) => {
  await Bun.write(join(directory, "extra.gen.ts"), "export const extra = 1;\n");
});

unit(sdkMatchesOpenApi, {
  positive: [
    positive("the committed sdk is what the document generates", [], true),
    positive("an untouched copy of the committed sdk matches", [untouched], true),
  ],
  negative: [
    rejected("a hand edit to a generated file is detected", [edited], false),
    rejected("a deleted generated file is detected", [trimmed], false),
    rejected("an extra generated file is detected", [extra], false),
  ],
});

const projects = await makeDir();
await writeFiles(projects, {
  "good/tsconfig.json": '{"compilerOptions":{"noEmit":true,"strict":true},"include":["ok.ts"]}',
  "good/ok.ts": "export const ok: number = 1;\n",
  "bad/tsconfig.json": '{"compilerOptions":{"noEmit":true,"strict":true},"include":["bad.ts"]}',
  "bad/bad.ts": 'export const bad: number = "text";\n',
  "other/tsconfig.json": '{"compilerOptions":{"noEmit":true,"strict":true},"include":["bad.ts"]}',
  "other/bad.ts": "export const bad: string = 1;\n",
});

unit(generatedCodeTypechecks, {
  positive: [
    positive("the generated sdk type checks", [], true),
    positive("a clean project type checks", [join(projects, "good", "tsconfig.json")], true),
  ],
  negative: [
    rejected("a type error is detected", [join(projects, "bad", "tsconfig.json")], false),
    rejected("another type error is detected", [join(projects, "other", "tsconfig.json")], false),
    rejected(
      "a project that is not there fails",
      [join(projects, "absent", "tsconfig.json")],
      false,
    ),
  ],
});

const documentTitle = (text: string) => JSON.parse(text).info.title;
const documentVersion = (text: string) => JSON.parse(text).info.version;
const paths = (text: string) => Object.keys(JSON.parse(text).paths);

unit(currentDocument, {
  positive: [
    positive(
      "the default title is the platform name",
      [],
      seen(documentTitle, "Capability Platform API"),
    ),
    positive("a title can be given", ["Library", "3"], seen(documentTitle, "Library")),
    positive("a version can be given", ["Library", "3"], seen(documentVersion, "3")),
  ],
  negative: [
    rejected(
      "the document lists the book paths",
      [],
      seen((text: string) => paths(text).includes("/v1/publishers/{publisher}/books/{book}"), true),
    ),
    negative("a title that is not text is refused", [5, "3"], { name: "ZodError" }),
    negative("a version that is not text is refused", ["Library", 3], { name: "ZodError" }),
  ],
});

const outputs = await makeDir();
const blocked = await makeDir();
await writeFiles(blocked, { blocker: "not a folder" });
const frontMatterOf = async (paths: string[]) =>
  all(paths.map((path) => async () => (await Bun.file(path).text()).startsWith("---\ntitle: ")));
const names = (paths: string[]) => paths.map((path) => path.split("/").at(-1));

unit(generateReference, {
  positive: [
    positive(
      "three reference pages are written",
      [outputs],
      seen((paths: string[]) => paths.length, 3),
    ),
    positive(
      "the pages are the http, mcp and skills references",
      [outputs],
      seen(names, ["http.md", "mcp.md", "skills.md"]),
    ),
  ],
  negative: [
    rejected(
      "every page starts with front matter",
      [outputs],
      seen(frontMatterOf, [true, true, true]),
    ),
    negative("an output folder under a file cannot be written", [join(blocked, "blocker")], {
      code: "ENOTDIR",
    }),
  ],
});
