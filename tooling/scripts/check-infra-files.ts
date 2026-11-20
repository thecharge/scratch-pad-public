import { join } from "node:path";
import { CADDY_IMAGE } from "@platform/config/environments";
import {
  COMMENT_FILE_LIST,
  Glyph,
  INFRA_COMMENT_PREFIX,
  INFRA_DIGEST_PATTERN,
  INFRA_DIRECTORY,
  INFRA_FILE_NAME,
  INFRA_FROM_KEYWORD,
  INFRA_FROM_PATTERN,
  INFRA_PORT_PATTERN,
  INFRA_SCRATCH,
  MessageId,
  Runner,
  Text,
  URL_LITERAL_PATTERN,
} from "@platform/constants";
import { message } from "@platform/messages";
import { all } from "@platform/util";
import { finish, REPO_ROOT, run } from "./tools.ts";

export async function infraProblems(
  file: string,
  source: string,
  checkImages: boolean = true,
): Promise<string[]> {
  const lines = source.split(Text.Newline);
  const stages = lines.flatMap((line) => INFRA_FROM_PATTERN.exec(line.trim())?.[2] ?? []);
  return lines.flatMap((text, index) => {
    const line = index + 1;
    const trimmed = text.trim();
    const from = INFRA_FROM_PATTERN.exec(trimmed);
    const image = from?.[1] ?? Text.Empty;
    const unpinned =
      checkImages &&
      from !== null &&
      image !== INFRA_SCRATCH &&
      !stages.includes(image) &&
      !INFRA_DIGEST_PATTERN.test(image);
    return [
      ...(trimmed.startsWith(INFRA_COMMENT_PREFIX)
        ? [message(MessageId.InfraComment, { file, line })]
        : []),
      ...[...trimmed.matchAll(URL_LITERAL_PATTERN)].map((match) =>
        message(MessageId.InfraLiteral, { file, line, literal: match[0] }),
      ),
      ...(INFRA_PORT_PATTERN.test(trimmed)
        ? [message(MessageId.InfraLiteral, { file, line, literal: trimmed })]
        : []),
      ...(unpinned ? [message(MessageId.InfraUnpinned, { file, line, image })] : []),
    ];
  });
}

async function containerfiles(root: string): Promise<string[]> {
  const listed = await run([Runner.Git, ...COMMENT_FILE_LIST], { cwd: root });
  return listed.stdout
    .split(Text.Newline)
    .filter((path) => path.startsWith(INFRA_DIRECTORY) && path.endsWith(INFRA_FILE_NAME));
}

export async function checkInfraFiles(root: string = REPO_ROOT): Promise<number> {
  const files = await containerfiles(root);
  const found = await all(
    files.map((file) => async () => infraProblems(file, await Bun.file(join(root, file)).text())),
  );
  const template = await infraProblems(
    MessageId.CaddyfileTemplate,
    message(MessageId.CaddyfileTemplate),
    false,
  );
  const caddy = await infraProblems(
    MessageId.CaddyfileTemplate,
    [INFRA_FROM_KEYWORD, CADDY_IMAGE].join(Glyph.Space),
  );
  return finish([...found.flat(), ...template, ...caddy], message(MessageId.InfraFilesOk));
}

if (import.meta.main) process.exit(await checkInfraFiles());
