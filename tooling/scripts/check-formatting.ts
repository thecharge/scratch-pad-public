import { COMMENT_CHECK_FLAG, FORMATTING_COMMAND } from "@platform/constants";
import { stripFiles } from "./strip-comments.ts";
import { REPO_ROOT, run } from "./tools.ts";

export async function checkFormatting(
  root = REPO_ROOT,
  execute = run,
  comments = stripFiles,
): Promise<number> {
  const checked = await comments([COMMENT_CHECK_FLAG], undefined, root);
  const formatted = await execute(FORMATTING_COMMAND, { cwd: root });
  process.stdout.write(formatted.stdout);
  process.stderr.write(formatted.stderr);
  return checked === 0 && formatted.exitCode === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(await checkFormatting());
