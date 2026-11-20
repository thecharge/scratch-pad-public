import { join } from "node:path";
import {
  FileSuffix,
  MessageId,
  OPENAPI_DEFAULT_TITLE,
  OPENAPI_DEFAULT_VERSION,
  REFERENCE_OUTPUT_DIR,
  ReferenceDescription,
  ReferencePageName,
  ReferenceTitle,
  SchemaIo,
  Separator,
  Text,
  TransportKind,
} from "@platform/constants";
import { message } from "@platform/messages";
import { all } from "@platform/util";
import { REPO_ROOT } from "./tools.ts";

const INDENT = 2;
const MDX = FileSuffix.Markdown;

async function page(title: string, description: string, body: string): Promise<string> {
  return message(MessageId.ReferencePage, {
    title: JSON.stringify(title),
    description: JSON.stringify(description),
    body,
  });
}

async function httpReference(): Promise<string> {
  const { generateOpenApi } = await import("@platform/openapi");
  const { createRegistry } = await import("@platform/api/registry");
  const document = await generateOpenApi(await (await createRegistry()).list(), {
    title: OPENAPI_DEFAULT_TITLE,
    version: OPENAPI_DEFAULT_VERSION,
  });
  const sections = Object.entries(document.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) =>
      message(MessageId.ReferenceOperation, {
        method: method.toUpperCase(),
        path,
        summary: String(operation.operationId),
        auth: JSON.stringify(operation.security ?? []),
        schema: JSON.stringify(
          { parameters: operation.parameters, requestBody: operation.requestBody },
          null,
          INDENT,
        ),
      }),
    ),
  );
  return page(ReferenceTitle.Http, ReferenceDescription.Http, sections.join(Text.Empty));
}

async function mcpReference(): Promise<string> {
  const { createRegistry } = await import("@platform/api/registry");
  const { z } = await import("zod");
  const capabilities = await (await createRegistry()).list();
  const sections = capabilities
    .filter((capability) => capability.onlyOver !== TransportKind.Http)
    .map((capability) =>
      message(MessageId.ReferenceTool, {
        id: capability.id,
        description: capability.description,
        auth: capability.auth,
        schema: JSON.stringify(
          z.toJSONSchema(capability.input, { io: SchemaIo.Input }),
          null,
          INDENT,
        ),
      }),
    );
  return page(ReferenceTitle.Mcp, ReferenceDescription.Mcp, sections.join(Text.Empty));
}

async function skillsReference(): Promise<string> {
  const { groupCapabilities } = await import("@platform/skill-protocol");
  const { createRegistry } = await import("@platform/api/registry");
  const groups = await groupCapabilities(await (await createRegistry()).list());
  const sections = groups.map((group) =>
    message(MessageId.ReferenceSkill, {
      name: group.name,
      count: group.capabilities.length,
      ids: group.capabilities.map((capability) => capability.id).join(Separator.ListSpaced),
    }),
  );
  return page(ReferenceTitle.Skills, ReferenceDescription.Skills, sections.join(Text.Empty));
}

export async function generateReference(outputDir: string): Promise<string[]> {
  const pages = await all([httpReference, mcpReference, skillsReference]);
  const names = [ReferencePageName.Http, ReferencePageName.Mcp, ReferencePageName.Skills];
  const written = names.map((name, index) => ({
    path: join(outputDir, `${name}${MDX}`),
    text: pages[index] as string,
  }));
  await all(
    written.map(
      ({ path, text }) =>
        async () =>
          Bun.write(path, text),
    ),
  );
  return written.map(({ path }) => path);
}

if (import.meta.main) await generateReference(join(REPO_ROOT, REFERENCE_OUTPUT_DIR));
