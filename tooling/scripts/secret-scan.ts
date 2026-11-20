import {
  GIT_STAGED_DIFF,
  GITLEAKS_GIT_COMMAND,
  MessageId,
  Runner,
  SCANNER_ARGS,
  SCANNER_GIT_LOG_OPTS,
  SCANNER_VERBOSE,
  ScanMode,
  Text,
  ToolBinary,
} from "@platform/constants";
import { message } from "@platform/messages";
import { REPO_ROOT, resolveTool, run } from "./tools.ts";

async function report(stdout: string, stderr: string): Promise<void> {
  process.stderr.write(stdout + stderr);
}

export async function scanText(text: string, command?: string): Promise<number> {
  const result = await run(
    [
      command ?? (await resolveTool(ToolBinary.Gitleaks)),
      ScanMode.Stdin,
      ...SCANNER_ARGS,
      SCANNER_VERBOSE,
    ],
    { stdin: text },
  );
  if (result.exitCode !== 0) {
    await report(result.stdout, result.stderr);
  }
  return result.exitCode;
}

async function scanStaged(root: string): Promise<number> {
  const diff = await run([Runner.Git, ...GIT_STAGED_DIFF], { cwd: root });
  if (diff.exitCode !== 0) {
    await report(Text.Empty, diff.stderr);
    return diff.exitCode;
  }
  return diff.stdout.trim() === Text.Empty ? 0 : scanText(diff.stdout);
}

async function scanRepo(root: string): Promise<number> {
  const result = await run(
    [
      await resolveTool(ToolBinary.Gitleaks),
      GITLEAKS_GIT_COMMAND,
      root,
      ...SCANNER_ARGS,
      SCANNER_GIT_LOG_OPTS,
    ],
    { cwd: root },
  );
  if (result.exitCode !== 0) {
    await report(result.stdout, result.stderr);
  }
  return result.exitCode;
}

export async function runSecretScan(
  mode: string | undefined,
  stdin: () => Promise<string> = Bun.stdin.text.bind(Bun.stdin),
  root: string = REPO_ROOT,
): Promise<number> {
  switch (mode) {
    case ScanMode.Staged:
      return scanStaged(root);
    case ScanMode.Repo:
      return scanRepo(root);
    case ScanMode.Stdin:
      return scanText(await stdin());
    default:
      console.error(message(MessageId.ScanUsage));
      return 2;
  }
}

if (import.meta.main) process.exit(await runSecretScan(Bun.argv[2]));
