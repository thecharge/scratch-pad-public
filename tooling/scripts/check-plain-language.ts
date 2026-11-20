import { join } from "node:path";
import {
  DOCS_CONTENT_DIR,
  DOCS_CONTENT_GLOB,
  DocCategory,
  MessageId,
  PLAIN_BANNED_WORDS,
  PLAIN_CODE_FENCE,
  PLAIN_DESCRIPTION_FIELD,
  PLAIN_EXTRA_FOLDERS,
  PLAIN_FRONT_MATTER,
  PLAIN_INLINE_CODE,
  PLAIN_LINK,
  PLAIN_LINK_TEXT,
  PLAIN_MAX_SENTENCE_WORDS,
  PLAIN_ROOT_PAGES,
  PLAIN_SENTENCE_END,
  PLAIN_SKIPPED_LINE,
  PLAIN_TITLE_FIELD,
  PlainRule,
  Separator,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync } from "@platform/store";
import { all } from "@platform/util";
import { finish, REPO_ROOT } from "./tools.ts";

const PAGE_EXTENSION = /\.mdx?$/;
const CATEGORY_DIRS: readonly string[] = [...Object.values(DocCategory), ...PLAIN_EXTRA_FOLDERS];

async function problem(
  page: string,
  rule: PlainRule,
  detail: string = Text.Empty,
): Promise<string> {
  return message(MessageId.PlainViolation, { page, rule, detail });
}

async function proseOf(text: string): Promise<string[]> {
  const body = text.replace(PLAIN_FRONT_MATTER, Text.Empty).replace(PLAIN_CODE_FENCE, Text.Empty);
  return body
    .split(Text.Newline)
    .filter((line) => !PLAIN_SKIPPED_LINE.test(line))
    .map((line) => line.replace(PLAIN_INLINE_CODE, Text.Empty).replace(PLAIN_LINK, PLAIN_LINK_TEXT))
    .flatMap((line) => line.split(PLAIN_SENTENCE_END));
}

async function wordCount(sentence: string): Promise<number> {
  return sentence.split(/\s+/).filter((word) => word.length > 0).length;
}

export async function pageProblems(page: string, text: string): Promise<string[]> {
  const front = PLAIN_FRONT_MATTER.exec(text)?.[1] ?? Text.Empty;
  const stem = page.replace(PAGE_EXTENSION, Text.Empty);
  const folder = stem.split(Separator.Resource)[0] ?? Text.Empty;
  const prose = await proseOf(text);
  const lower = prose.join(Text.Newline).toLowerCase();
  const long = await filterAsync(
    prose,
    async (sentence) => (await wordCount(sentence)) > PLAIN_MAX_SENTENCE_WORDS,
  );
  return [
    ...(PLAIN_TITLE_FIELD.test(front) ? [] : [await problem(page, PlainRule.MissingTitle)]),
    ...(PLAIN_DESCRIPTION_FIELD.test(front)
      ? []
      : [await problem(page, PlainRule.MissingDescription)]),
    ...(CATEGORY_DIRS.includes(folder) || PLAIN_ROOT_PAGES.includes(stem)
      ? []
      : [await problem(page, PlainRule.MissingCategory)]),
    ...(await all(
      long.map(
        (sentence) => async () => problem(page, PlainRule.LongSentence, sentence.slice(0, 80)),
      ),
    )),
    ...(await all(
      PLAIN_BANNED_WORDS.filter((word) => lower.includes(word)).map(
        (word) => async () => problem(page, PlainRule.BannedWord, word),
      ),
    )),
  ];
}

export async function plainProblems(root: string): Promise<string[]> {
  const base = join(root, DOCS_CONTENT_DIR);
  const files = await Array.fromAsync(new Bun.Glob(DOCS_CONTENT_GLOB).scan({ cwd: base }));
  const found = await all(
    files
      .sort()
      .map((file) => async () => pageProblems(file, await Bun.file(join(base, file)).text())),
  );
  return found.flat();
}

export async function checkPlainLanguage(root: string = REPO_ROOT): Promise<number> {
  return finish(await plainProblems(root), message(MessageId.PlainOk));
}

if (import.meta.main) process.exit(await checkPlainLanguage());
