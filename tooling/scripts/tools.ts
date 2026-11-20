import { delimiter, join, resolve } from "node:path";
import {
  GIT_ENV_PREFIX,
  MessageId,
  RepoPath,
  StdioMode,
  Text,
  type ToolBinary,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { RunOptions, RunResult } from "@platform/types";
import { all } from "@platform/util";
import type { FileSink } from "bun";

export const REPO_ROOT = resolve(import.meta.dir, RepoPath.RootFromScripts);
export const LOCAL_TOOL_DIR = join(REPO_ROOT, RepoPath.ToolsDir, RepoPath.Bin);
export const LOCAL_BUNDLE_DIR = join(REPO_ROOT, RepoPath.ToolsDir);
const NODE_BIN_DIR = join(REPO_ROOT, RepoPath.NodeModules, RepoPath.NodeBin);

export async function resolveTool(name: ToolBinary): Promise<string> {
  const searchDirs = [
    NODE_BIN_DIR,
    LOCAL_TOOL_DIR,
    ...(Bun.env.PATH ?? Text.Empty).split(delimiter),
  ];
  const candidates = searchDirs.map((dir) => join(dir, name));
  const present = await all(
    candidates.map((candidate) => async () => Bun.file(candidate).exists()),
  );
  const found = candidates.find((_candidate, index) => present[index]);
  if (found === undefined) {
    throw new Error(message(MessageId.ToolMissing, { tool: name }));
  }
  return found;
}

async function inheritedEnv(cwd: string | undefined): Promise<Record<string, string | undefined>> {
  return cwd === undefined || cwd === REPO_ROOT
    ? Bun.env
    : Object.fromEntries(
        Object.entries(Bun.env).filter(([name]) => !name.startsWith(GIT_ENV_PREFIX)),
      );
}

export async function run(
  command: readonly string[],
  options: RunOptions = {},
): Promise<RunResult> {
  const proc = Bun.spawn([...command], {
    cwd: options.cwd ?? REPO_ROOT,
    env: { ...(await inheritedEnv(options.cwd)), ...options.env },
    stdin: options.stdin === undefined ? StdioMode.Ignore : StdioMode.Pipe,
    stdout: StdioMode.Pipe,
    stderr: StdioMode.Pipe,
  });
  if (options.stdin !== undefined) {
    const input = proc.stdin as unknown as FileSink;
    input.write(options.stdin);
    await input.end();
  }
  const output = await all([
    async () => new Response(proc.stdout).text(),
    async () => new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout: output[0] as string, stderr: output[1] as string };
}

export async function finish(problems: readonly string[], ok: string): Promise<number> {
  for (const problem of problems) {
    console.error(problem);
  }
  console.log(
    problems.length === 0 ? ok : message(MessageId.StructureSummary, { count: problems.length }),
  );
  return problems.length === 0 ? 0 : 1;
}
