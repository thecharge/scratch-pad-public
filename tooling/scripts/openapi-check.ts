import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MessageId,
  OASDIFF_ARGS,
  OPENAPI_DEFAULT_TITLE,
  OPENAPI_DEFAULT_VERSION,
  OPENAPI_TEMP_PREFIX,
  OpenApiMode,
  RepoPath,
  Separator,
  Text,
  ToolBinary,
} from "@platform/constants";
import { message } from "@platform/messages";
import { REPO_ROOT, resolveTool, run } from "./tools.ts";

export async function currentDocument(
  title: string = OPENAPI_DEFAULT_TITLE,
  version: string = OPENAPI_DEFAULT_VERSION,
): Promise<string> {
  const { generateOpenApi } = await import("@platform/openapi");
  const { createRegistry } = await import("@platform/api/registry");
  const capabilities = await (await createRegistry()).list();
  const document = await generateOpenApi(capabilities, { title, version });
  return JSON.stringify(document, null, 2) + Text.Newline;
}

async function update(baseline: string): Promise<number> {
  await Bun.write(baseline, await currentDocument());
  console.log(message(MessageId.OpenApiUpdated, { path: RepoPath.OpenApiBaseline }));
  return 0;
}

export async function compare(baseline: string, current: string): Promise<number> {
  const workDir = await mkdtemp(join(tmpdir(), OPENAPI_TEMP_PREFIX));
  try {
    const baselinePath = join(
      workDir,
      RepoPath.OpenApiBaseline.split(Separator.Resource).at(-1) ?? Text.Empty,
    );
    const currentPath = join(workDir, RepoPath.OpenApiCurrent);
    await Bun.write(baselinePath, baseline);
    await Bun.write(currentPath, current);
    const tool = await resolveTool(ToolBinary.Oasdiff);
    const result = await run([tool, ...OASDIFF_ARGS, baselinePath, currentPath]);
    process.stderr.write(result.stdout + result.stderr);
    return result.exitCode;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function check(baseline: string): Promise<number> {
  if (!(await Bun.file(baseline).exists())) {
    console.error(message(MessageId.OpenApiBaselineMissing, { path: RepoPath.OpenApiBaseline }));
    return 1;
  }
  const code = await compare(await Bun.file(baseline).text(), await currentDocument());
  if (code === 0) {
    console.log(message(MessageId.OpenApiCompatible));
  }
  return code;
}

export async function runOpenApi(
  mode: string | undefined,
  baseline: string = join(REPO_ROOT, RepoPath.OpenApiBaseline),
): Promise<number> {
  if (mode === OpenApiMode.Update) {
    return update(baseline);
  }
  if (mode === OpenApiMode.Check) {
    return check(baseline);
  }
  console.error(message(MessageId.OpenApiUsage));
  return 1;
}

if (import.meta.main) process.exit(await runOpenApi(Bun.argv[2]));
