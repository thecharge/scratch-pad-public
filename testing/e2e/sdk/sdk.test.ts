import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  DEVELOPMENT_IMAGE,
  DocCategory,
  EnvironmentName,
  RepoFile,
  SDK_CONSUMER_MANIFEST,
  SDK_INSTALL_ARGS,
  SDK_PROJECT_PREFIX,
  SDK_PROTOCOL_RECORD_PATH,
  SDK_TYPECHECK_ARGS,
  StepFlag,
  ToolBinary,
} from "@platform/constants";
import { recordSdkPages, runSdkScenario, sdkScenarios } from "@platform/kb-recorder";
import { lazy } from "@platform/store";
import { REPO_ROOT, thrownBy } from "@platform/test-framework";
import type { RecordedPage, SdkScenario, SdkStep } from "@platform/types";
import { all } from "@platform/util";
import { stackDown, stackUp } from "../../../apps/infra/src/cli.ts";
import { generateSdkDocs } from "../../../tooling/scripts/generate-sdk-docs.ts";
import { packSdk } from "../../../tooling/scripts/sdk-pack.ts";
import { resolveTool } from "../../../tooling/scripts/tools.ts";
import { prepareHttpCurl } from "../../packages/scenarios/src/http-api-fixtures.ts";
import {
  OBJECT_STORE_TEST_ENV,
  setObjectStoreEnvironment,
} from "../../packages/scenarios/src/object-store-fixtures.ts";
import {
  publishSdkProtocols,
  runSdkProtocol,
} from "../../packages/scenarios/src/sdk-protocol-fixtures.ts";
import {
  sdkProxyRunner,
  sdkProxySession,
} from "../../packages/scenarios/src/sdk-proxy-fixtures.ts";

setDefaultTimeout(60_000);

const previousAccess = Bun.env.RUSTFS_ACCESS_KEY;
const previousSecret = Bun.env.RUSTFS_SECRET_KEY;
let curl = "";
const protocolPages: RecordedPage[] = [];

beforeAll(async () => {
  await rm(join(REPO_ROOT, SDK_PROTOCOL_RECORD_PATH), { force: true });
  await setObjectStoreEnvironment(OBJECT_STORE_TEST_ENV);
  expect(await stackUp(EnvironmentName.Test)).toBe(0);
  curl = await prepareHttpCurl();
}, 240_000);

const packed = lazy(packSdk);
const projects: string[] = [];

afterAll(async () => {
  const { directory } = await packed();
  await all(
    [dirname(directory), ...projects].map(
      (path) => async () => rm(path, { recursive: true, force: true }),
    ),
  );
  const stopped = await stackDown(EnvironmentName.Test);
  await rm(curl, { force: true });
  await setObjectStoreEnvironment({
    RUSTFS_ACCESS_KEY: previousAccess,
    RUSTFS_SECRET_KEY: previousSecret,
  });
  expect(stopped).toBe(0);
});

async function consumerProject(source: string) {
  const { tarball } = await packed();
  const project = await mkdtemp(join(tmpdir(), SDK_PROJECT_PREFIX));
  projects.push(project);
  await Bun.write(join(project, RepoFile.PackageJson), SDK_CONSUMER_MANIFEST);
  await Bun.write(join(project, "check.ts"), source);
  const execute = await sdkProxyRunner(tarball);
  await execute([...SDK_INSTALL_ARGS, tarball], project);
  const tsc = await resolveTool(ToolBinary.Tsc);
  const { runPodman } = await import("../../packages/scenarios/src/proxy-fixtures.ts");
  return runPodman([
    "run",
    "--rm",
    "--network=none",
    "-v",
    `${project}:${project}:ro`,
    "-v",
    `${process.cwd()}:${process.cwd()}:ro`,
    "-w",
    project,
    DEVELOPMENT_IMAGE,
    "bun",
    tsc,
    ...SDK_TYPECHECK_ARGS,
    "check.ts",
  ]);
}

const MISSING_BOOK = { publisher: "acme", book: "nothing" };

const wrongStep: SdkStep = {
  description: "Claim that reading a missing book succeeds",
  place: "Your own code",
  summary: "get a book",
  call: "booksGet",
  params: { path: MISSING_BOOK },
  scopes: ["read"],
};

const failing: SdkScenario = {
  id: "sdk-wrong-expectation",
  title: "A step that does not behave as declared",
  intent: "The recorder must refuse to publish a page whose claims are false.",
  category: DocCategory.SdkUsage,
  steps: [wrongStep],
};

describe("every SDK scenario passes against the installed package", () => {
  test.each(sdkScenarios().map((scenario) => [scenario.id, scenario] as const))(
    "%s",
    async (_id, scenario) => {
      const { tarball } = await packed();
      const results = await runSdkScenario(
        scenario,
        tarball,
        sdkProxySession,
        await sdkProxyRunner(tarball),
      );
      expect([results.length, results.every((result) => result.flag === StepFlag.Passed)]).toEqual([
        scenario.steps.length + 1,
        true,
      ]);
    },
  );
});

describe("the installed package is the built output", () => {
  test("the first step of a run proves the package resolves inside node_modules", async () => {
    const { tarball } = await packed();
    const [install] = await runSdkScenario(
      sdkScenarios()[0] as SdkScenario,
      tarball,
      sdkProxySession,
      await sdkProxyRunner(tarball),
    );
    expect(install?.checks.map((check) => check.passed)).toEqual([true]);
  });

  test("the declarations type-check in an empty project with no workspace package", async () => {
    const source = [
      'import { ApiClientError, CanonicalCode, booksCreate, createSdkClient, unwrap } from "@platform/sdk";',
      'const client = await createSdkClient({ origin: "http://localhost", token: "t" });',
      'const book = await unwrap(booksCreate({ client, path: { publisher: "a" }, query: { bookId: "b" }, body: { title: "T" } }));',
      "const title: string = book.title;",
      "const status: CanonicalCode = new ApiClientError(CanonicalCode.NotFound, title).status;",
      "export { status };",
    ].join("\n");
    const result = await consumerProject(source);
    expect(result.exitCode).toBe(0);
  });

  test("a wrong type in the consuming project is a compile error", async () => {
    const source = [
      'import { booksCreate, createSdkClient, unwrap } from "@platform/sdk";',
      'const client = await createSdkClient({ origin: "http://localhost", token: "t" });',
      'const book = await unwrap(booksCreate({ client, path: { publisher: "a" }, query: { bookId: "b" }, body: { title: "T" } }));',
      "export const title: number = book.title;",
    ].join("\n");
    const result = await consumerProject(source);
    expect([result.exitCode, result.stdout]).toEqual([1, expect.stringContaining("TS2322")]);
  });

  test("using the client without awaiting the factory is a compile error", async () => {
    const source = [
      'import { booksCreate, createSdkClient, unwrap } from "@platform/sdk";',
      'const client = createSdkClient({ origin: "http://localhost", token: "t" });',
      'export const call = unwrap(booksCreate({ client, path: { publisher: "a" }, query: { bookId: "b" }, body: { title: "T" } }));',
    ].join("\n");
    const result = await consumerProject(source);
    expect([result.exitCode, result.stdout]).toEqual([1, expect.stringContaining("TS2")]);
  });
});

describe("a failing SDK step publishes nothing", () => {
  test("the run flags the step failed with expected and actual outcome", async () => {
    const { tarball } = await packed();
    const results = await runSdkScenario(
      failing,
      tarball,
      sdkProxySession,
      await sdkProxyRunner(tarball),
    );
    expect([results[1]?.flag, results[1]?.evidence.expected, results[1]?.evidence.actual]).toEqual([
      StepFlag.Failed,
      "success",
      "an error",
    ]);
  });

  test("recording it throws naming the scenario and writes no page", async () => {
    const { tarball } = await packed();
    const directory = await mkdtemp(join(tmpdir(), SDK_PROJECT_PREFIX));
    projects.push(directory);
    const failure = await thrownBy(() =>
      recordSdkPages([failing], tarball, directory, sdkProxySession, async (command, project) =>
        (await sdkProxyRunner(tarball))(command, project),
      ),
    );
    expect([
      (failure as Error).message.includes(failing.id),
      await Bun.file(join(directory, failing.category, `${failing.id}.mdx`)).exists(),
    ]).toEqual([true, false]);
  });
});

async function existingSdkProxy(tarball: string) {
  return {
    connect: sdkProxySession,
    execute: await sdkProxyRunner(tarball),
    stop: async () => undefined,
  };
}

describe("real SDK documentation assertions through the proxy", () => {
  test.each(["writes the three SDK pages", "keeps every page under its output folder"])(
    "%s",
    async () => {
      const directory = await mkdtemp(join(tmpdir(), SDK_PROJECT_PREFIX));
      projects.push(directory);
      const paths = await generateSdkDocs(directory, undefined, undefined, existingSdkProxy);
      expect([paths.length, paths.every((path) => path.startsWith(directory))]).toEqual([3, true]);
    },
  );

  test("an output folder under a file cannot be written", async () => {
    const directory = await mkdtemp(join(tmpdir(), SDK_PROJECT_PREFIX));
    projects.push(directory);
    await Bun.write(join(directory, "blocker"), "not a folder");
    const failure = await thrownBy(() =>
      generateSdkDocs(join(directory, "blocker", "out"), undefined, undefined, existingSdkProxy),
    );
    expect((failure as NodeJS.ErrnoException).code).toBe("ENOTDIR");
  });

  test("a missing output folder argument throws", async () => {
    const failure = await thrownBy(() =>
      generateSdkDocs(undefined as unknown as string, undefined, undefined, existingSdkProxy),
    );
    expect((failure as Error).name).toBe("TypeError");
  });
});

test.each([
  ["--http1.1", "1.1"],
  ["--http2", "2"],
  ["--http3-only", "3"],
])(
  "installed SDK stream forms and typed errors pass through Caddy with %s as HTTP %s",
  async (flag, version) => {
    const { tarball } = await packed();
    const page = await runSdkProtocol(tarball, curl, flag, version);
    expect(page.results.length).toBeGreaterThan(15);
    protocolPages.push(page);
    await publishSdkProtocols(protocolPages);
  },
);
