import { join } from "node:path";
import {
  ASTRO_BUILD_ARGS,
  DOCS_CONTENT_DIR,
  DOCS_DIST,
  DOCS_E2E_DIR,
  DOCS_E2E_REPORT,
  DOCS_PUBLICATION_BAD,
  DOCS_TIMINGS_FILE,
  DocumentationPhase,
  INTERNAL_DOCS_DIR,
  MessageId,
  REFERENCE_OUTPUT_DIR,
  RepoPath,
  Runner,
  SDK_PROTOCOL_DOC_PATH,
  SDK_PROTOCOL_RECORD_PATH,
  StdioMode,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { DocsPageResult, StepTiming } from "@platform/types";
import { all } from "@platform/util";
import { checkConcreteDocs } from "./check-concrete-docs.ts";
import { checkDocsScope } from "./check-docs-scope.ts";
import { checkErrorCases, generatedPagesText } from "./check-error-cases.ts";
import { checkPlainLanguage } from "./check-plain-language.ts";
import { withDocsPublication } from "./docs-publication.ts";
import { gettingStartedPage, markMissingUrls } from "./docs-urls.ts";
import { generateApiDocs } from "./generate-api-docs.ts";
import { generateAssetDocs } from "./generate-asset-docs.ts";
import { generateHttpApiDocs } from "./generate-http-api-docs.ts";
import { generateMcpDocs } from "./generate-mcp-docs.ts";
import { generatePerformanceDocs } from "./generate-performance-docs.ts";
import { generateProtocolDocs } from "./generate-protocol-docs.ts";
import { generateReference } from "./generate-reference.ts";
import { generateSdkDocs } from "./generate-sdk-docs.ts";
import { recordInto } from "./record-kb.ts";
import { scanText } from "./secret-scan.ts";
import { REPO_ROOT } from "./tools.ts";
import { measurePhase, writeTimings } from "./verification-timing.ts";

export async function astroBuild(
  root: string,
  command: readonly string[] = [Runner.Bunx, ...ASTRO_BUILD_ARGS],
): Promise<number> {
  const proc = Bun.spawn([...command], {
    cwd: join(root, RepoPath.DocsApp),
    stdout: StdioMode.Inherit,
    stderr: StdioMode.Inherit,
  });
  return proc.exited;
}

export async function browseAndReport(
  root: string,
  browse?: (dist: string, output: string) => Promise<DocsPageResult[]>,
): Promise<void> {
  const { docsReport, runDocsE2e } = await import("@platform/kb-recorder");
  const results = await (browse ?? runDocsE2e)(join(root, DOCS_DIST), join(root, DOCS_E2E_DIR));
  await Bun.write(join(root, DOCS_E2E_REPORT), docsReport(results));
}

async function validateDocs(root: string): Promise<void> {
  const codes = await all([
    async () => checkDocsScope(root),
    async () => checkPlainLanguage(root),
    async () => checkConcreteDocs(root),
    async () => checkErrorCases(root),
    async () => scanText(await generatedPagesText(root)),
  ]);
  if (codes.some((code) => code !== 0)) throw new Error(DOCS_PUBLICATION_BAD);
}

async function produceDocs(
  root: string = REPO_ROOT,
  record: typeof recordInto = recordInto,
  build: (root: string) => Promise<number> = astroBuild,
  browse: (root: string) => Promise<void> = browseAndReport,
  sdk: typeof generateSdkDocs = generateSdkDocs,
  api: typeof generateApiDocs = generateApiDocs,
  validate: (root: string) => Promise<void> = validateDocs,
): Promise<number> {
  const { resolveDocsUrls } = await import("@platform/config/factual");
  const docsUrls = await resolveDocsUrls();
  const content = join(root, DOCS_CONTENT_DIR);
  const timings: StepTiming[] = [];
  await writeTimings(timings, root, DOCS_TIMINGS_FILE);
  try {
    await measurePhase(
      DocumentationPhase.Record,
      async () => record(content, docsUrls.urls),
      timings,
    );
    await measurePhase(
      DocumentationPhase.Reference,
      async () => generateReference(join(root, REFERENCE_OUTPUT_DIR)),
      timings,
    );
    await measurePhase(DocumentationPhase.Sdk, async () => sdk(content), timings);
    await measurePhase(
      DocumentationPhase.Api,
      async () => {
        const pages = await api(content);
        await generateAssetDocs(content, root, docsUrls.urls);
        await generateMcpDocs(content, root, docsUrls.urls);
        await generateHttpApiDocs(content, root, docsUrls.urls);
        await generateHttpApiDocs(
          content,
          root,
          docsUrls.urls,
          SDK_PROTOCOL_RECORD_PATH,
          SDK_PROTOCOL_DOC_PATH,
        );
        return pages;
      },
      timings,
    );
    await measurePhase(
      DocumentationPhase.Performance,
      async () => generatePerformanceDocs(join(root, INTERNAL_DOCS_DIR), root),
      timings,
    );
    await measurePhase(
      DocumentationPhase.Protocol,
      async () => generateProtocolDocs(join(root, INTERNAL_DOCS_DIR), root),
      timings,
    );
    await measurePhase(
      DocumentationPhase.GettingStarted,
      async () => gettingStartedPage(content, docsUrls),
      timings,
    );
    await measurePhase(
      DocumentationPhase.Urls,
      async () => markMissingUrls(content, docsUrls),
      timings,
    );
    await measurePhase(DocumentationPhase.Validate, async () => validate(root), timings);
    const code = await measurePhase(
      DocumentationPhase.Build,
      async () => build(root),
      timings,
      true,
    );
    if (code === 0) {
      await measurePhase(DocumentationPhase.Browser, async () => browse(root), timings);
    }
    console.log(
      message(code === 0 ? MessageId.DocsBuilt : MessageId.DocsStepFailed, { step: Runner.Bunx }),
    );
    return code;
  } finally {
    await writeTimings(timings, root, DOCS_TIMINGS_FILE);
  }
}

export async function buildDocs(
  root: string = REPO_ROOT,
  record: typeof recordInto = recordInto,
  build: (root: string) => Promise<number> = astroBuild,
  browse: (root: string) => Promise<void> = browseAndReport,
  sdk: typeof generateSdkDocs = generateSdkDocs,
  api: typeof generateApiDocs = generateApiDocs,
  validate: (root: string) => Promise<void> = validateDocs,
): Promise<number> {
  return withDocsPublication(root, async (workspace) =>
    produceDocs(workspace, record, build, browse, sdk, api, validate),
  );
}

if (import.meta.main) process.exit(await buildDocs());
