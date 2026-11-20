import { join } from "node:path";
import {
  API_VERSION_STABILITY,
  ApiVersion,
  DocCategory,
  FeatureFlag,
  FileSuffix,
  FLAG_DEFAULTS,
  FLAG_SCENARIOS,
  GeneratedPage,
  Glyph,
  MessageId,
  OPENAPI_STABILITY_KEY,
  RepoPath,
  SDK_BUILT_ENTRY,
  Separator,
  Text,
  TYPEOF_FUNCTION,
} from "@platform/constants";
import { fetchLiveInterfaces, guidePage, recordPages, scenarios } from "@platform/kb-recorder";
import { message } from "@platform/messages";
import { flatMapAsync } from "@platform/store";
import {
  type LiveInterfaces,
  type OpenApiDocument,
  OpenApiDocumentSchema,
  type OpenApiEntry,
  OpenApiOperationDocSchema,
  type StepResult,
} from "@platform/types";
import { all } from "@platform/util";
import { operationBody } from "./operation-docs.ts";
import { REPO_ROOT } from "./tools.ts";

const MDX = FileSuffix.Markdown;

async function page(title: string, description: string, body: string): Promise<string> {
  return message(MessageId.ReferencePage, {
    title: JSON.stringify(title),
    description: JSON.stringify(description),
    body,
  });
}

async function loadDocument() {
  const text = await Bun.file(join(REPO_ROOT, RepoPath.OpenApiBaseline)).text();
  return OpenApiDocumentSchema.parse(JSON.parse(text));
}

async function reasonsByCapability(): Promise<Readonly<Record<string, string[]>>> {
  const { scenarios } = await import("@platform/kb-recorder");
  const steps = scenarios().flatMap((scenario) => scenario.steps);
  const failing = steps.filter((step) => step.reason !== undefined);
  const capabilities = [...new Set(failing.map((step) => step.capability))];
  return Object.fromEntries(
    capabilities.map((id) => [
      id,
      [
        ...new Set(failing.filter((step) => step.capability === id).map((step) => step.reason)),
      ] as string[],
    ]),
  );
}

async function entriesOf(document: Awaited<ReturnType<typeof loadDocument>>, version: ApiVersion) {
  const prefix = [Text.Empty, version, Text.Empty].join(Separator.Resource);
  return Object.entries(document.paths)
    .filter(([path]) => path.startsWith(prefix))
    .flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, raw]) => ({
        method: method.toUpperCase(),
        path,
        operation: OpenApiOperationDocSchema.parse(raw),
      })),
    );
}

async function operationSection(
  entry: OpenApiEntry,
  reasons: Readonly<Record<string, string[]>>,
): Promise<string> {
  const { operation } = entry;
  const known = reasons[operation.operationId] ?? [];
  return message(MessageId.OpenApiOperationDoc, {
    method: entry.method,
    path: entry.path,
    id: operation.operationId,
    stability: String(operation[OPENAPI_STABILITY_KEY] ?? Text.Empty),
    auth:
      (operation.security ?? []).length === 0
        ? message(MessageId.WordNone)
        : message(MessageId.WordBearer),
    summary: operation.summary ?? operation.operationId,
    parameters:
      (operation.parameters ?? [])
        .map((parameter) =>
          message(MessageId.ParameterItem, { name: parameter.name, place: parameter.in }),
        )
        .join(Separator.ListSpaced) || message(MessageId.WordNone),
    cases:
      known.length === 0
        ? Text.Empty
        : message(MessageId.OpenApiCases, { reasons: known.join(Separator.ListSpaced) }),
  });
}

async function openApiPages(
  outputDir: string,
  live: LiveInterfaces,
  results: readonly StepResult[],
): Promise<string[]> {
  const document = live.document;
  const reasons = await reasonsByCapability();
  const writes = Object.values(ApiVersion).map((version) => async () => {
    const entries = await entriesOf(document, version);
    const stability = API_VERSION_STABILITY[version];
    const body = [
      message(MessageId.OpenApiIntro, { version, stability }),
      message(MessageId.GuideDisplayValues),
      entries.length === 0
        ? message(MessageId.OpenApiNone)
        : (
            await all(
              entries.map(
                (entry) => async () =>
                  (await operationSection(entry, reasons)) +
                  (await operationBody(
                    entry,
                    live.tools.find((tool) => tool.name === entry.operation.operationId),
                    results,
                  )),
              ),
            )
          ).join(Text.Empty),
    ].join(`${Text.Newline}${Text.Newline}`);
    const path = join(outputDir, DocCategory.OpenApi, `${version}${MDX}`);
    await Bun.write(
      path,
      await page(
        message(MessageId.OpenApiTitle, { version }),
        message(MessageId.OpenApiDescription, { version }),
        body,
      ),
    );
    return path;
  });
  return all(writes);
}

async function diagram(document: OpenApiDocument): Promise<string> {
  const edges = await flatMapAsync(Object.values(ApiVersion), async (version, v) =>
    (await entriesOf(document, version)).map((entry, o) =>
      message(MessageId.VersionsEdge, {
        v,
        o,
        version,
        stability: API_VERSION_STABILITY[version],
        id: entry.operation.operationId,
      }),
    ),
  );
  return message(MessageId.VersionsDiagram, { edges: edges.join(Text.Empty) });
}

async function versionsPage(outputDir: string, document: OpenApiDocument): Promise<string> {
  const rows = await all(
    Object.values(ApiVersion).map(
      (version) => async () =>
        message(MessageId.VersionsRow, {
          version,
          stability: API_VERSION_STABILITY[version],
          ids:
            (await entriesOf(document, version))
              .map((entry) => entry.operation.operationId)
              .join(Separator.ListSpaced) || message(MessageId.WordNone),
        }),
    ),
  );
  const path = join(outputDir, DocCategory.OpenApi, `${GeneratedPage.Versions}${MDX}`);
  await Bun.write(
    path,
    await page(
      message(MessageId.VersionsTitle),
      message(MessageId.VersionsDescription),
      [message(MessageId.VersionsIntro), rows.join(Text.Empty), await diagram(document)].join(
        `${Text.Newline}${Text.Newline}`,
      ),
    ),
  );
  return path;
}

async function sdkName(operationId: string): Promise<string> {
  return operationId
    .split(Glyph.Dot)
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(Text.Empty);
}

async function sdkPage(outputDir: string, entry: string): Promise<string> {
  const document = await loadDocument();
  const sdk = (await import(entry)) as Record<string, unknown>;
  const versioned = await flatMapAsync(Object.values(ApiVersion), async (version) =>
    (await entriesOf(document, version)).map((entry) => ({ entry, version })),
  );
  const sections = await all(
    versioned.map(({ entry, version }) => async () => {
      const id = entry.operation.operationId;
      const name = await sdkName(id);
      if (typeof sdk[name] !== TYPEOF_FUNCTION) {
        throw new Error(message(MessageId.SdkRefMissing, { name, id }));
      }
      return message(MessageId.SdkRefOperation, {
        name,
        method: entry.method,
        path: entry.path,
        id,
        version,
      });
    }),
  );
  const path = join(outputDir, DocCategory.SdkUsage, `${GeneratedPage.SdkReference}${MDX}`);
  await Bun.write(
    path,
    await page(
      message(MessageId.SdkRefTitle),
      message(MessageId.SdkRefDescription),
      [message(MessageId.SdkRefIntro), sections.join(Text.Empty)].join(
        `${Text.Newline}${Text.Newline}`,
      ),
    ),
  );
  return path;
}

async function flagsPage(outputDir: string): Promise<string> {
  const { createRegistry } = await import("@platform/api/registry");
  const capabilities = await (await createRegistry()).list();
  const rows = Object.values(FeatureFlag).map((key) =>
    message(MessageId.FlagsRow, {
      key,
      state: FLAG_DEFAULTS[key] ? message(MessageId.WordOn) : message(MessageId.WordOff),
      capability: capabilities
        .filter((capability) => capability.flag === key)
        .map((capability) => capability.id)
        .join(Separator.ListSpaced),
      title: message(MessageId.FlagsTitle),
      scenario: FLAG_SCENARIOS[key],
    }),
  );
  const path = join(outputDir, DocCategory.ApiHandling, `${GeneratedPage.FeatureFlags}${MDX}`);
  await Bun.write(
    path,
    await page(
      message(MessageId.FlagsTitle),
      message(MessageId.FlagsDescription),
      [message(MessageId.FlagsIntro), rows.join(Text.Empty)].join(`${Text.Newline}${Text.Newline}`),
    ),
  );
  return path;
}

export async function generateApiDocs(
  outputDir: string,
  sdkEntry: string = join(REPO_ROOT, SDK_BUILT_ENTRY),
  interfaces: typeof fetchLiveInterfaces = fetchLiveInterfaces,
  record: typeof recordPages = recordPages,
): Promise<string[]> {
  const live = await interfaces();
  const recorded = await all(
    (await record(scenarios())).map((item) => async () => guidePage(item)),
  );
  const results = recorded.flatMap((item) => item.results);
  const pages = await all([
    async () => openApiPages(outputDir, live, results),
    async () => [await versionsPage(outputDir, live.document)],
    async () => [await sdkPage(outputDir, sdkEntry)],
    async () => [await flagsPage(outputDir)],
  ]);
  return pages.flat();
}
