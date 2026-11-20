import { join } from "node:path";
import {
  COMMENT_FILE_LIST,
  CONFIG_PACKAGE_PATH,
  FileSuffix,
  MessageId,
  Runner,
  Text,
  URL_LITERAL_CONFIG,
  URL_LITERAL_PATTERN,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync } from "@platform/store";
import {
  type UrlLiteralConfig,
  UrlLiteralConfigSchema,
  type UrlLiteralFinding,
} from "@platform/types";
import { all } from "@platform/util";
import { isSkipped } from "./strip-comments.ts";
import { finish, REPO_ROOT, run } from "./tools.ts";

export async function urlLiteralsIn(file: string, source: string): Promise<UrlLiteralFinding[]> {
  return source.split(Text.Newline).flatMap((line, index) =>
    [...line.matchAll(URL_LITERAL_PATTERN)].map((match) => ({
      file,
      line: index + 1,
      literal: match[0],
    })),
  );
}

export async function isAllowed(file: string, config: UrlLiteralConfig): Promise<boolean> {
  return (
    file.startsWith(CONFIG_PACKAGE_PATH) ||
    config.allowedPaths.some((allowed) => file.includes(allowed))
  );
}

async function sourceFiles(root: string): Promise<string[]> {
  const listed = await run([Runner.Git, ...COMMENT_FILE_LIST], { cwd: root });
  return await filterAsync(
    listed.stdout
      .split(Text.Newline)
      .filter((path) =>
        [FileSuffix.TypeScript, FileSuffix.Tsx].some((suffix) => path.endsWith(suffix)),
      ),
    async (path) => !(await isSkipped(path)),
  );
}

export async function findUrlLiterals(
  files: readonly string[],
  config: UrlLiteralConfig,
  root: string = REPO_ROOT,
): Promise<UrlLiteralFinding[]> {
  const checked = await filterAsync(files, async (file) => !(await isAllowed(file, config)));
  const found = await all(
    checked.map((file) => async () => urlLiteralsIn(file, await Bun.file(join(root, file)).text())),
  );
  return found.flat();
}

export async function checkUrlLiterals(root: string = REPO_ROOT): Promise<number> {
  const config = UrlLiteralConfigSchema.parse(
    await Bun.file(join(root, URL_LITERAL_CONFIG)).json(),
  );
  const findings = await findUrlLiterals(await sourceFiles(root), config, root);
  return finish(
    findings.map((found) => message(MessageId.UrlLiteral, { ...found })),
    message(MessageId.UrlLiteralsOk),
  );
}

if (import.meta.main) process.exit(await checkUrlLiterals());
