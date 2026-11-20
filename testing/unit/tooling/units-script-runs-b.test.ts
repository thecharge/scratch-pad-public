import { afterAll, expect, mock, test } from "bun:test";
import "@platform/kb-recorder";
import { chmod, cp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { LOCAL_URLS } from "@platform/config/urls";
import {
  API_RECORDING_LABEL,
  OpenApiMode,
  Separator,
  ToolBinary,
  UI_RECORDING_LABEL,
  UI_RECORDING_RESULTS_FILE,
} from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { all } from "@platform/util";
import { buildDocs } from "../../../tooling/scripts/build-docs.ts";
import { runBuildSdk } from "../../../tooling/scripts/build-sdk.ts";
import { runBuildSkills } from "../../../tooling/scripts/build-skills.ts";
import { checkMigrations } from "../../../tooling/scripts/check-migrations.ts";
import { publishedDocs, withDocsPublication } from "../../../tooling/scripts/docs-publication.ts";
import { runGenerateSdk } from "../../../tooling/scripts/generate-sdk.ts";
import { runGenerateSdkDocs } from "../../../tooling/scripts/generate-sdk-docs.ts";
import { installTools } from "../../../tooling/scripts/install-tools.ts";
import { runOpenApi } from "../../../tooling/scripts/openapi-check.ts";
import {
  recordApi,
  recordStaged,
  recordUiOnly,
  runRecordKb,
  uiCommand,
} from "../../../tooling/scripts/record-kb.ts";
import { REPO_ROOT, run } from "../../../tooling/scripts/tools.ts";
import {
  docsPublicationFixture,
  publicationAttempt,
} from "../../packages/scenarios/src/docs-publication-fixtures.ts";

const GENERATED = join(REPO_ROOT, "packages/sdk/generated");
const RECORDING_TIMEOUT_MS = 240_000;

afterAll(async () => {
  await removeAll();
  const logs = await Array.fromAsync(
    new Bun.Glob("openapi-ts-error-*.log").scan({
      cwd: join(REPO_ROOT, "packages/sdk"),
      absolute: true,
    }),
  );
  await all(logs.map((log) => async () => rm(log, { force: true })));
});

async function tree(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await makeDir();
  await writeFiles(root, files);
  return root;
}

const blocked = await tree({ blocker: "not a folder" });
const BLOCKED = join(blocked, "blocker", "out");
const exists = (path: string) => async () => Bun.file(path).exists();

const copyOfGenerated = async () => {
  const directory = await makeDir();
  await cp(GENERATED, directory, { recursive: true });
  return directory;
};
const editedCopy = async () => {
  const directory = await copyOfGenerated();
  const file = join(directory, "sdk.gen.ts");
  await Bun.write(file, `${await Bun.file(file).text()}\nexport const handWritten = 1;\n`);
  return directory;
};
const untouched = await copyOfGenerated();
const handEdited = await editedCopy();
const generatedTo = join(await makeDir(), "out");

unit(
  runGenerateSdk,
  {
    positive: [
      positive("the committed sdk is in sync", [OpenApiMode.Check, untouched], 0),
      positive("without a mode the sdk is generated into the target", [undefined, generatedTo], 0),
      positive(
        "the generated sdk has its client file",
        [undefined, generatedTo],
        seen(exists(join(generatedTo, "sdk.gen.ts")), true),
      ),
    ],
    negative: [
      rejected("a hand edited sdk is not in sync", [OpenApiMode.Check, handEdited], 1),
      negative("a target under a file cannot be generated into", [undefined, BLOCKED], {
        message: expect.stringContaining("SDK generation failed"),
      }),
    ],
  },
  undefined,
  240_000,
);

const skillsA = await makeDir();
const skillsB = await makeDir();

unit(runBuildSkills, {
  positive: [
    positive("the skills are written", [skillsA], 0),
    positive("another folder gets them too", [skillsB], 0),
  ],
  negative: [
    negative("an output folder under a file cannot be written", [BLOCKED], { code: "ENOTDIR" }),
    negative("an output folder under another file cannot be written", [join(blocked, "blocker")], {
      code: expect.stringMatching(/^E(NO|EX)/),
    }),
  ],
});

const sdkDocsA = await makeDir();
const sdkDocsB = await makeDir();
const sdkDocsRecording = async (directory: string) => {
  const path = join(directory, "sdk.mdx");
  await Bun.write(path, "recorded sdk page");
  return [path];
};

unit(runGenerateSdkDocs, {
  positive: [
    positive("the sdk pages are written", [sdkDocsA, sdkDocsRecording], 0),
    positive(
      "another folder gets them too",
      [sdkDocsB, sdkDocsRecording],
      seen(exists(join(sdkDocsB, "sdk.mdx")), true),
    ),
  ],
  negative: [
    negative("an output folder under a file cannot be written", [BLOCKED, sdkDocsRecording], {
      code: "ENOTDIR",
    }),
    negative(
      "an output folder under another file cannot be written",
      [join(blocked, "blocker", "x"), sdkDocsRecording],
      {
        code: "ENOTDIR",
      },
    ),
  ],
});

const buildA = await makeDir();
const buildB = await makeDir();
const buildFirst = mock(async () => undefined);
const buildSecond = mock(async () => undefined);
const failedBuild = async () => {
  throw new Error("Build failed");
};
const failedDeclarations = async () => {
  throw new RangeError("declarations failed");
};

unit(runBuildSdk, {
  positive: [
    positive(
      "the requested output is passed to the builder",
      [buildA, buildFirst],
      seen(async (code: number) => ({ code, calls: buildFirst.mock.calls }), {
        code: 0,
        calls: [[buildA]],
      }),
    ),
    positive(
      "another output is passed without replacement",
      [buildB, buildSecond],
      seen(async (code: number) => ({ code, calls: buildSecond.mock.calls }), {
        code: 0,
        calls: [[buildB]],
      }),
    ),
  ],
  negative: [
    negative("build failure propagates", [buildA, failedBuild], { message: "Build failed" }),
    negative("declaration failure propagates", [buildB, failedDeclarations], {
      name: "RangeError",
      message: "declarations failed",
    }),
  ],
});

const stagedA = await makeDir();
const stagedB = await makeDir();
const stagedC = await makeDir();
const stagedD = await makeDir();
const stagedE = await makeDir();
const wroteSome = (paths: string[]) => paths.length > 0;
const apiStub = async (staging: string) => {
  await writeFiles(staging, { "api.md": "api" });
  return [join(staging, "api.md")];
};
const listing = (staging: string) =>
  `console.log("stack test: ready"); await Bun.write(${JSON.stringify(join(staging, UI_RECORDING_RESULTS_FILE))}, JSON.stringify([${JSON.stringify(join(staging, "ui.md"))}]));`;
const uiStub = async (staging: string) => ["bun", "-e", listing(staging)];
const failingUi = async () => ["bun", "-e", "process.exit(1)"];
const hangingUi = async () => ["bun", "-e", "setInterval(() => undefined, 1000)"];
const hangingApi = async () => new Promise<string[]>(() => undefined);
const invalidUi = async (staging: string) => [
  "bun",
  "-e",
  `await Bun.write(${JSON.stringify(join(staging, UI_RECORDING_RESULTS_FILE))}, "{}");`,
];
const missingUi = async () => ["bun", "-e", 'console.log("stack test: no result")'];
const stagedInvalid = await makeDir();
const stagedMissing = await makeDir();
await writeFiles(stagedMissing, { [UI_RECORDING_RESULTS_FILE]: JSON.stringify(["old-page.md"]) });
const allUnder = (directory: string) => (paths: string[]) =>
  paths.length > 0 && paths.every((path) => path.startsWith(directory));

unit(
  recordStaged,
  {
    positive: [
      positive(
        "the scenarios are recorded",
        [stagedA, undefined, undefined, undefined, apiStub, uiStub],
        seen(wroteSome, true),
      ),
      positive(
        "the recording with known addresses writes pages under the folder",
        [stagedB, LOCAL_URLS, undefined, undefined, apiStub, uiStub],
        seen(allUnder(stagedB), true),
      ),
    ],
    negative: [
      negative(
        "a successful child without a fresh structured result cannot publish",
        [stagedMissing, undefined, undefined, undefined, apiStub, missingUi],
        { code: "ENOENT" },
      ),
      negative(
        "a structured result of the wrong shape cannot publish",
        [stagedInvalid, undefined, undefined, undefined, apiStub, invalidUi],
        { name: "ZodError" },
      ),
      negative(
        "a ui recording the child cannot read fails",
        [stagedE, undefined, undefined, undefined, apiStub, failingUi],
        {
          message: expect.stringContaining("did not finish"),
        },
      ),
      negative(
        "an api recording that takes too long is stopped",
        [stagedC, undefined, 1, undefined, hangingApi, uiStub],
        { message: expect.stringContaining(API_RECORDING_LABEL) },
      ),
      negative(
        "a ui recording that takes too long is stopped",
        [stagedD, undefined, 600_000, 1, apiStub, hangingUi],
        { message: expect.stringContaining(UI_RECORDING_LABEL) },
      ),
    ],
  },
  undefined,
  RECORDING_TIMEOUT_MS,
);

const stagedF = await makeDir();
const noScenarios = async () => [];
const urlsJson = JSON.stringify(LOCAL_URLS);

unit(recordApi, {
  positive: [
    positive("an empty list of scenarios records nothing", [stagedF, undefined, noScenarios], []),
    positive("known addresses are accepted", [stagedF, LOCAL_URLS, noScenarios], []),
  ],
  negative: [
    negative(
      "a list that cannot be read fails",
      [stagedF, undefined, async () => Promise.reject(new TypeError("no list"))],
      {
        message: "no list",
      },
    ),
    negative("needs a list that can be called", [stagedF, undefined, "no" as never], {
      name: "TypeError",
    }),
  ],
});

unit(uiCommand, {
  positive: [
    positive(
      "ends with the folder and no addresses",
      ["/staging"],
      seen((command: string[]) => command.slice(-2), ["/staging", "null"]),
    ),
    positive(
      "ends with the folder and the addresses as JSON",
      ["/staging", LOCAL_URLS],
      seen((command: string[]) => command.slice(-2), ["/staging", urlsJson]),
    ),
  ],
  negative: [
    rejected(
      "without a folder the command still has its parts",
      [undefined],
      seen((command: string[]) => command.length, 6),
    ),
    rejected(
      "the mode is the ui mode",
      ["/staging"],
      seen((command: string[]) => command.at(-3), "ui"),
    ),
  ],
});

unit(recordUiOnly, {
  positive: [
    positive("an empty list of scenarios records nothing", [stagedF, "null", noScenarios], 0),
    positive("known addresses are accepted", [stagedF, urlsJson, noScenarios], 0),
  ],
  negative: [
    negative("addresses that are not JSON fail", [stagedF, "not json", noScenarios], {
      name: "SyntaxError",
    }),
    negative("addresses of the wrong shape fail", [stagedF, '{"console":5}', noScenarios], {
      name: "ZodError",
    }),
  ],
});

const CLEAN_PAGE = "A page without secrets.\n";
const random = (alphabet: string, length: number) =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(length)),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
const LEAKING_PAGE = [
  `aws_access_key_id = AKIA${random("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", 16)}`,
  `aws_secret_access_key = ${random("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 40)}`,
  "",
].join("\n");
const writingPage = (text: string) => async (directory: string) => {
  await writeFiles(directory, { "page.md": text });
  return [join(directory, "page.md")];
};
const docsDirA = await makeDir();
const docsDirB = await makeDir();
const uiDirA = await makeDir();
const drawing = async (directory: string) => {
  await writeFiles(directory, { "ui.md": "ui" });
  return 0;
};

unit(
  runRecordKb,
  {
    positive: [
      positive(
        "the check mode records clean pages",
        [[OpenApiMode.Check], writingPage(CLEAN_PAGE)],
        0,
      ),
      positive(
        "the write mode records into the docs folder",
        [[], writingPage(CLEAN_PAGE), docsDirA],
        0,
      ),
      positive(
        "the ui mode records the interface scenarios",
        [[OpenApiMode.Ui, uiDirA, "null"], undefined, undefined, drawing],
        seen(async () => (await readdir(uiDirA, { recursive: true })).length > 0, true),
      ),
    ],
    negative: [
      rejected(
        "a page with a secret fails the check mode",
        [[OpenApiMode.Check], writingPage(LEAKING_PAGE)],
        1,
      ),
      rejected(
        "a page with a secret fails the write mode",
        [[], writingPage(LEAKING_PAGE), docsDirB],
        1,
      ),
      negative(
        "addresses that are not json fail the ui mode",
        [[OpenApiMode.Ui, uiDirA, "not json"]],
        {
          name: "SyntaxError",
        },
      ),
    ],
  },
  undefined,
  RECORDING_TIMEOUT_MS,
);

const platform = [process.platform, process.arch].join(Separator.Platform);
const ARCHIVE_FILE = "tool.tar.gz";
const payload = await makeDir();
await writeFiles(payload, {
  [ToolBinary.Gitleaks]: "#!/bin/sh\nexit 0\n",
  [ToolBinary.Oasdiff]: "#!/bin/sh\nexit 0\n",
});
await chmod(join(payload, ToolBinary.Gitleaks), 0o755);
await run([
  "tar",
  "czf",
  join(payload, ARCHIVE_FILE),
  "-C",
  payload,
  ToolBinary.Gitleaks,
  ToolBinary.Oasdiff,
]);
const archive = new Uint8Array(await Bun.file(join(payload, ARCHIVE_FILE)).arrayBuffer());
const sha = (bytes: Uint8Array) => new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
const releaseFor = (
  bytes: Uint8Array,
  files: Record<string, string> = { [platform]: ARCHIVE_FILE },
) => ({
  version: "1.0.0",
  files,
  sha256: { [platform]: sha(bytes) },
});
const releasesFor = (bytes: Uint8Array, files?: Record<string, string>) =>
  ({
    [ToolBinary.Gitleaks]: releaseFor(bytes, files),
    [ToolBinary.Oasdiff]: releaseFor(bytes, files),
  }) as never;
const serving = (bytes: Uint8Array, status = 200) => {
  const calls: string[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(bytes as never, { status });
  };
  return { calls, fetcher: fetcher as never };
};
const GOOD = releasesFor(archive);
const BAD_ARCHIVE = new TextEncoder().encode("this is not an archive");
const installA = await makeDir();
const installB = await makeDir();
await writeFiles(installB, { [ToolBinary.Gitleaks]: "", [ToolBinary.Oasdiff]: "" });
const installC = await makeDir();
const installD = await makeDir();
const installE = await makeDir();
const installF = await makeDir();
const served = serving(archive);
const unneeded = serving(archive);

unit(installTools, {
  positive: [
    positive(
      "both tools are downloaded, verified and unpacked",
      [installA, served.fetcher, undefined, GOOD],
      0,
    ),
    positive(
      "the unpacked tool is on disk",
      [installA, served.fetcher, undefined, GOOD],
      seen(exists(join(installA, ToolBinary.Gitleaks)), true),
    ),
    positive(
      "tools that are already there are not downloaded again",
      [installB, unneeded.fetcher, undefined, GOOD],
      seen(async () => unneeded.calls.length, 0),
    ),
  ],
  negative: [
    negative(
      "an archive that does not match its checksum is refused",
      [installC, serving(archive).fetcher, undefined, releasesFor(BAD_ARCHIVE)],
      { message: expect.stringContaining(ARCHIVE_FILE) },
    ),
    negative(
      "a download that fails is reported with its status",
      [installD, serving(archive, 404).fetcher, undefined, GOOD],
      { message: expect.stringContaining("404") },
    ),
    negative(
      "an archive that cannot be unpacked is reported",
      [installE, serving(BAD_ARCHIVE).fetcher, undefined, releasesFor(BAD_ARCHIVE)],
      { message: expect.stringContaining("Extraction failed") },
    ),
    rejected(
      "a platform without an archive fails",
      [installF, served.fetcher, undefined, releasesFor(archive, {})],
      1,
    ),
  ],
});

const BASELINE_PATH = join(REPO_ROOT, "openapi/baseline.json");
const baselineText = await Bun.file(BASELINE_PATH).text();
const withExtraPath = JSON.parse(baselineText);
withExtraPath.paths["/v1/unit-extra"] =
  withExtraPath.paths[Object.keys(withExtraPath.paths)[0] as string];
const baselineDir = await tree({
  "extra.json": JSON.stringify(withExtraPath),
});
const updatedBaseline = join(await makeDir(), "baseline.json");
const missingBaseline = join(await makeDir(), "absent.json");

unit(
  runOpenApi,
  {
    positive: [
      positive("the committed baseline is compatible", [OpenApiMode.Check], 0),
      positive("the update mode writes the baseline", [OpenApiMode.Update, updatedBaseline], 0),
      positive(
        "the written baseline is the current document",
        [OpenApiMode.Update, updatedBaseline],
        seen(async () => (await Bun.file(updatedBaseline).text()) === baselineText, true),
      ),
    ],
    negative: [
      rejected("an unknown mode is a usage error", [undefined], 1),
      rejected("a missing baseline fails the check", [OpenApiMode.Check, missingBaseline], 1),
      rejected(
        "a removed endpoint breaks compatibility",
        [OpenApiMode.Check, join(baselineDir, "extra.json")],
        1,
      ),
    ],
  },
  undefined,
  120_000,
);

const docsRoot = await makeDir();
await writeFiles(docsRoot, {
  ".stack/e2e/protocols.jsonl":
    '{"id":"protocol","title":"Protocol check","checked":"HTTP version","version":"2","detail":"","passed":true}\n',
});
const buildCalls: string[] = [];
const browseCalls: string[] = [];
const recordNothing = async () => [];
const apiCalls: string[] = [];
const apiDocsRecording = async (content: string) => {
  apiCalls.push(content);
  return [join(content, "api.md")];
};
const apiDocsBroken = async (): Promise<string[]> => {
  throw new SyntaxError("API recording failed");
};
const buildPassing = async (root: string) => {
  await Bun.write(join(root, "apps/docs/dist/index.html"), "<html>candidate</html>");
  buildCalls.push("build");
  return 0;
};
const buildFailing = async () => {
  buildCalls.push("failed");
  return 1;
};
const browsed = async (root: string) => {
  await Bun.write(join(root, "docs/e2e/report.md"), "verified browser report");
  browseCalls.push("browse");
};
const validationPassed = async () => {};
const recorderBroken = async () => {
  throw new RangeError("recorder crashed");
};
const failingDocsRoot = await makeDir();
const crashDocsRoot = await makeDir();
const secondDocsRoot = await makeDir();

unit(
  buildDocs,
  {
    positive: [
      positive(
        "the site builds and protocol verification stays in repository docs",
        [
          docsRoot,
          recordNothing,
          buildPassing,
          browsed,
          sdkDocsRecording,
          apiDocsRecording,
          validationPassed,
        ],
        seen(
          async (code: number) => [
            code,
            await Bun.file(join(docsRoot, "docs/e2e/protocols.md")).exists(),
            await Bun.file(join(docsRoot, "apps/docs/src/content/docs/e2e/protocols.md")).exists(),
            buildCalls.length,
            apiCalls[0]?.startsWith(join(docsRoot, ".stack/docs-publications")) &&
              apiCalls[0]?.endsWith("apps/docs/src/content/docs"),
          ],
          [0, true, false, 1, true],
        ),
      ),
      positive(
        "the browser check ran once",
        [
          secondDocsRoot,
          recordNothing,
          buildPassing,
          browsed,
          sdkDocsRecording,
          apiDocsRecording,
          validationPassed,
        ],
        seen(async () => browseCalls.length, 2),
      ),
    ],
    negative: [
      negative(
        "an API page recording failure stops the build",
        [
          crashDocsRoot,
          recordNothing,
          buildPassing,
          browsed,
          sdkDocsRecording,
          apiDocsBroken,
          validationPassed,
        ],
        { name: "SyntaxError", message: "API recording failed" },
      ),
      rejected(
        "a failing build stops before the browser check",
        [
          failingDocsRoot,
          recordNothing,
          buildFailing,
          browsed,
          sdkDocsRecording,
          apiDocsRecording,
          validationPassed,
        ],
        1,
      ),
      negative(
        "a recorder that crashes stops the build",
        [
          crashDocsRoot,
          recorderBroken,
          buildPassing,
          browsed,
          sdkDocsRecording,
          apiDocsRecording,
          validationPassed,
        ],
        {
          name: "RangeError",
        },
      ),
    ],
  },
  undefined,
  120_000,
);

test.each([
  { phase: "validation", build: buildPassing, browse: browsed, validate: recorderBroken },
  { phase: "build", build: buildFailing, browse: browsed, validate: validationPassed },
  { phase: "browser", build: buildPassing, browse: recorderBroken, validate: validationPassed },
])("a $phase refusal preserves the last accepted site", async (step) => {
  const fixture = await docsPublicationFixture();
  await withDocsPublication(fixture.root, fixture.produce);
  const previous = await publishedDocs(fixture.root);
  const attempt = await publicationAttempt(async () =>
    buildDocs(
      fixture.root,
      recordNothing,
      step.build,
      step.browse,
      sdkDocsRecording,
      apiDocsRecording,
      step.validate,
    ),
  );
  expect(attempt.code).not.toBe(0);
  expect(await publishedDocs(fixture.root)).toBe(previous);
  expect(await Bun.file(join(previous, "index.html")).text()).toBe("first site");
});

unit(checkMigrations, {
  positive: [
    positive("the committed migrations match the schema", [], 0),
    positive(
      "the schema index matches too",
      [join(REPO_ROOT, "packages/db/src/schema/index.ts")],
      0,
    ),
  ],
  negative: [
    negative("a schema file that is not there is an error", [join(REPO_ROOT, "absent.ts")], {
      message: expect.stringContaining("No schema files found"),
    }),
    rejected(
      "a schema with only some of the tables drifts from the migrations",
      [join(REPO_ROOT, "packages/db/src/schema/auth.generated.ts")],
      1,
    ),
  ],
});

test.each(["first", "second"])(
  "default validation refuses unlabelled SDK fixture before publication %s",
  async () => {
    const root = await makeDir();
    await Bun.write(join(root, "openapi/baseline.json"), JSON.stringify({ paths: {} }));
    await expect(
      buildDocs(root, recordNothing, buildPassing, browsed, sdkDocsRecording, apiDocsRecording),
    ).rejects.toThrow("Documentation publication candidate is invalid");
  },
);
