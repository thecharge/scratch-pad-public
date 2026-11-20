import { GIT_UNTRACKED_COMMAND, MessageId, NUL, Text } from "@platform/constants";
import { message } from "@platform/messages";
import { finish, REPO_ROOT, run } from "./tools.ts";

export async function untrackedProblems(output: string): Promise<string[]> {
  return output
    .split(NUL)
    .filter((file) => file !== Text.Empty)
    .map((file) => message(MessageId.UntrackedFile, { file }));
}

export async function checkUntracked(
  root: string = REPO_ROOT,
  execute: typeof run = run,
): Promise<number> {
  const result = await execute(GIT_UNTRACKED_COMMAND, { cwd: root });
  if (result.exitCode !== 0) {
    return finish([message(MessageId.UntrackedReadFailed, { detail: result.stderr })], Text.Empty);
  }
  return finish(await untrackedProblems(result.stdout), message(MessageId.UntrackedOk));
}

if (import.meta.main) process.exit(await checkUntracked());
