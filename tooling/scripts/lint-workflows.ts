import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { FileSuffix, MessageId, RepoPath } from "@platform/constants";
import { message } from "@platform/messages";
import { REPO_ROOT } from "./tools.ts";

async function workflowFiles(directory: string): Promise<string[]> {
  const names = await readdir(directory).catch(async () => [] as string[]);
  return names.filter(
    (file) => file.endsWith(FileSuffix.Yaml) || file.endsWith(FileSuffix.YamlLong),
  );
}

export async function lintWorkflows(root: string = REPO_ROOT): Promise<number> {
  const files = await workflowFiles(join(root, RepoPath.Workflows));
  for (const file of files) {
    console.error(message(MessageId.WorkflowPresent, { file }));
  }
  console.log(
    files.length === 0
      ? message(MessageId.WorkflowsOk)
      : message(MessageId.WorkflowsProblems, { count: files.length }),
  );
  return files.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(await lintWorkflows());
