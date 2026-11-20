import { join } from "node:path";
import {
  DOCS_CONTENT_GLOB,
  DOCS_NOTICE_PATTERN,
  DOCS_TOKEN_PLACEHOLDER,
  DocCategory,
  FileSuffix,
  FRONT_MATTER_END,
  GENERATED_FRONT_MATTER,
  GeneratedPage,
  HAND_WRITTEN_ALLOWED,
  MessageId,
  Separator,
  Surface,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { DocsUrls } from "@platform/types";
import { all } from "@platform/util";

const PAGE_EXTENSION = /\.mdx?$/;

export async function markMissingUrls(contentDir: string, docs: DocsUrls): Promise<number> {
  const files = await Array.fromAsync(new Bun.Glob(DOCS_CONTENT_GLOB).scan({ cwd: contentDir }));
  const pages = files.filter(
    (file) => !HAND_WRITTEN_ALLOWED.includes(file.replace(PAGE_EXTENSION, Text.Empty)),
  );
  const notice =
    docs.missing.length === 0
      ? Text.Empty
      : message(MessageId.UrlNotice, { surfaces: docs.missing.join(Separator.ListSpaced) });
  const marked = await all(
    pages.map((file) => async () => {
      const path = join(contentDir, file);
      const text = await Bun.file(path).text();
      const front = FRONT_MATTER_END.exec(text)?.[0];
      if (front === undefined || !GENERATED_FRONT_MATTER.test(text)) {
        return 0;
      }
      const body = text.slice(front.length).replace(DOCS_NOTICE_PATTERN, Text.Empty);
      await Bun.write(path, `${front}${notice}${body}`);
      return 1;
    }),
  );
  return marked.reduce<number>((total, count) => total + count, 0);
}

export async function gettingStartedPage(contentDir: string, docs: DocsUrls): Promise<string> {
  const rows = Object.values(Surface)
    .map((surface) =>
      message(MessageId.StartRow, {
        surface,
        url: docs.urls[surface],
        source: docs.missing.includes(surface)
          ? message(MessageId.StartLocal)
          : message(MessageId.StartSet),
      }),
    )
    .join(Text.Empty);
  const body = message(MessageId.StartBody, { placeholder: DOCS_TOKEN_PLACEHOLDER, rows });
  const text = message(MessageId.ReferencePage, {
    title: JSON.stringify(message(MessageId.StartTitle)),
    description: JSON.stringify(message(MessageId.StartDescription)),
    body,
  });
  const path = join(
    contentDir,
    DocCategory.General,
    `${GeneratedPage.GettingStarted}${FileSuffix.Markdown}`,
  );
  await Bun.write(path, text);
  return path;
}
