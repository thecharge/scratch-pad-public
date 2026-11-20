import { join } from "node:path";
import {
  DEVELOPMENT_PAGE_NAMES,
  DOCS_CONTENT_DIR,
  DOCS_CONTENT_GLOB,
  GENERATED_FRONT_MATTER,
  HAND_WRITTEN_ALLOWED,
  MessageId,
  Separator,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync } from "@platform/store";
import { all } from "@platform/util";
import { finish, REPO_ROOT } from "./tools.ts";

const PAGE_EXTENSION = /\.mdx?$/;

async function isDevelopmentPage(file: string): Promise<boolean> {
  const stem = file.replace(PAGE_EXTENSION, Text.Empty);
  const named = stem
    .split(Separator.Resource)
    .some((part) => DEVELOPMENT_PAGE_NAMES.includes(part));
  return named;
}

export async function developmentPages(root: string): Promise<string[]> {
  const found = await Array.fromAsync(
    new Bun.Glob(DOCS_CONTENT_GLOB).scan({ cwd: join(root, DOCS_CONTENT_DIR) }),
  );
  return (await filterAsync(found, isDevelopmentPage))
    .map((file) => join(DOCS_CONTENT_DIR, file))
    .sort();
}

export async function pagesWithoutSource(root: string): Promise<string[]> {
  const directory = join(root, DOCS_CONTENT_DIR);
  const found = await Array.fromAsync(new Bun.Glob(DOCS_CONTENT_GLOB).scan({ cwd: directory }));
  const candidates = found.filter(
    (file) => !HAND_WRITTEN_ALLOWED.includes(file.replace(PAGE_EXTENSION, Text.Empty)),
  );
  const texts = await all(
    candidates.map((file) => async () => Bun.file(join(directory, file)).text()),
  );
  return candidates
    .filter((_file, index) => !GENERATED_FRONT_MATTER.test(texts[index] ?? Text.Empty))
    .map((file) => join(DOCS_CONTENT_DIR, file))
    .sort();
}

export async function checkDocsScope(root: string = REPO_ROOT): Promise<number> {
  const pages = await developmentPages(root);
  const withoutSource = await pagesWithoutSource(root);
  return finish(
    [
      ...withoutSource.map((page) => message(MessageId.DocsNoGeneratedSource, { page })),
      ...pages.map((page) => message(MessageId.DocsScopeViolation, { page })),
    ],
    message(MessageId.DocsScopeOk),
  );
}

if (import.meta.main) process.exit(await checkDocsScope());
