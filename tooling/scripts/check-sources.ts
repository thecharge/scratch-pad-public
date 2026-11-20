import { dirname, join } from "node:path";
import {
  AuthScheme,
  CANONICAL_CODE_HTTP_STATUS,
  CanonicalCode,
  DigestEncoding,
  Glyph,
  HashAlgorithm,
  HttpHeader,
  MessageId,
  SOURCE_CAPTURE_DIRECTORY,
  SOURCE_DOCUMENT_GLOB,
  SOURCE_FETCH_HEADERS,
  SOURCE_INDEX_FILE,
  SOURCE_INDEX_GLOB,
  SOURCE_NORMALIZE_MARKUP,
  SOURCE_NORMALIZE_PUNCTUATION,
  SOURCE_PIPE,
  SOURCE_PIPE_PATTERN,
  SOURCE_REFERENCE_PATTERN,
  SOURCE_REQUIREMENT_MARKER,
  SOURCE_REVIEW_WHITESPACE,
  SOURCE_ROW_SEPARATOR,
  SOURCE_TABLE_HEADER,
  SOURCE_TABLE_MARKER,
  SOURCE_TASKS_GLOB,
  SOURCE_TIMEOUT_MS,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { SourceDocument, SourceIndex, SourceRecord } from "@platform/types";
import { SourceIndexSchema, SourceRegistryTokenSchema } from "@platform/types";
import { all } from "@platform/util";
import sourceEndpoints from "../../packages/config/source-endpoints.json";
import { finish, REPO_ROOT } from "./tools.ts";

async function normalized(content: string): Promise<string> {
  return content
    .replace(SOURCE_NORMALIZE_MARKUP, Text.Empty)
    .replace(SOURCE_NORMALIZE_PUNCTUATION, Text.Empty)
    .toLowerCase();
}

async function digest(content: string): Promise<string> {
  return new Bun.CryptoHasher(HashAlgorithm.Sha256).update(content).digest(DigestEncoding.Hex);
}

async function sourceResponse(
  url: string,
  fetcher: (url: string, init?: RequestInit) => Promise<Response>,
): Promise<Response> {
  const registry = new URL(url).origin === sourceEndpoints.registryOrigin;
  const headers = registry
    ? { ...SOURCE_FETCH_HEADERS, [HttpHeader.Accept]: sourceEndpoints.registryAccept }
    : SOURCE_FETCH_HEADERS;
  const response = await fetcher(url, { signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS), headers });
  if (!registry || response.status !== CANONICAL_CODE_HTTP_STATUS[CanonicalCode.Unauthenticated])
    return response;
  const tokenResponse = await fetcher(sourceEndpoints.registryToken, {
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });
  if (!tokenResponse.ok) return tokenResponse;
  const { token } = SourceRegistryTokenSchema.parse(await tokenResponse.json());
  return fetcher(url, {
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: {
      ...headers,
      [HttpHeader.Authorization]: [AuthScheme.Bearer, token].join(Glyph.Space),
    },
  });
}

export async function sourceProblems(
  record: SourceRecord,
  fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch,
): Promise<string[]> {
  try {
    const response = await sourceResponse(record.url, fetcher);
    const content = await response.text();
    const text = await normalized(content);
    const quotes = await all(
      record.quotes.map((quote) => async () => text.includes(await normalized(quote))),
    );
    const matches =
      response.status === record.status &&
      (await digest(content)) === record.sha256 &&
      quotes.every(Boolean);
    return matches ? [] : [message(MessageId.SourceChanged, { id: record.id })];
  } catch {
    return [message(MessageId.SourceFetchFailed, { id: record.id })];
  }
}

async function table(records: readonly SourceRecord[]): Promise<string> {
  const rows = records.map((record) =>
    [
      record.id,
      record.url,
      record.fetchedAt,
      record.status,
      record.sha256,
      record.quotes.join(SOURCE_ROW_SEPARATOR),
      [record.attempt, record.output].join(SOURCE_ROW_SEPARATOR),
    ]
      .map((value) =>
        String(value)
          .replace(SOURCE_PIPE_PATTERN, SOURCE_PIPE)
          .replaceAll(Text.Newline, SOURCE_ROW_SEPARATOR),
      )
      .join(SOURCE_ROW_SEPARATOR),
  );
  return (
    SOURCE_TABLE_MARKER +
    Text.Newline +
    SOURCE_TABLE_HEADER +
    rows.map((row) => message(MessageId.SourceTableRow, { row })).join(Text.Newline) +
    Text.Newline
  );
}

export async function documentSourceProblems(
  content: string,
  document: SourceDocument,
  records: readonly SourceRecord[],
): Promise<string[]> {
  const body = content.split(SOURCE_TABLE_MARKER)[0] ?? Text.Empty;
  const references = [...body.matchAll(SOURCE_REFERENCE_PATTERN)].map((match) => match[0]);
  const selected = document.sourceIds.map((id) => records.find((record) => record.id === id));
  const missing =
    selected.some((record) => record === undefined) ||
    references.some((id) => !document.sourceIds.includes(id));
  if (missing) return [message(MessageId.SourceMissing, { file: document.file })];
  const expected =
    document.sourceIds.length === 0 ? Text.Empty : await table(selected as SourceRecord[]);
  const suffix = content.slice(body.length);
  const matches =
    (await digest(body.replace(SOURCE_REVIEW_WHITESPACE, Text.Empty))) === document.sha256 &&
    (await normalized(suffix)) === (await normalized(expected));
  return matches ? [] : [message(MessageId.SourceTableInvalid, { file: document.file })];
}

async function indexProblems(
  root: string,
  file: string,
  fetcher: (url: string, init?: RequestInit) => Promise<Response>,
): Promise<string[]> {
  const directory = join(root, dirname(file));
  const index: SourceIndex = SourceIndexSchema.parse(await Bun.file(join(root, file)).json());
  const files = await Array.fromAsync(new Bun.Glob(SOURCE_DOCUMENT_GLOB).scan({ cwd: directory }));
  const documents = files.filter((path) => !path.startsWith(SOURCE_CAPTURE_DIRECTORY));
  const missing = documents.filter(
    (path) => !index.documents.some((document) => document.file === path),
  );
  const results = await all([
    ...index.records.map((record) => async () => sourceProblems(record, fetcher)),
    ...index.documents.map(
      (document) => async () =>
        documentSourceProblems(
          await Bun.file(join(directory, document.file)).text(),
          document,
          index.records,
        ),
    ),
  ]);
  return [
    ...missing.map((path) => message(MessageId.SourceMissing, { file: join(dirname(file), path) })),
    ...results.flat(),
  ];
}

export async function checkSources(
  root: string = REPO_ROOT,
  fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch,
): Promise<number> {
  try {
    const indexes = await Array.fromAsync(new Bun.Glob(SOURCE_INDEX_GLOB).scan({ cwd: root }));
    const problems = await all(
      indexes.map((file) => async () => indexProblems(root, file, fetcher)),
    );
    const tasks = await Array.fromAsync(new Bun.Glob(SOURCE_TASKS_GLOB).scan({ cwd: root }));
    const required = await all(
      tasks.map((task) => async () => {
        const content = await Bun.file(join(root, task)).text();
        const expected = join(dirname(task), SOURCE_INDEX_FILE);
        return content.includes(SOURCE_REQUIREMENT_MARKER) && !indexes.includes(expected)
          ? [message(MessageId.SourceMissing, { file: expected })]
          : [];
      }),
    );
    return finish([...problems.flat(), ...required.flat()], message(MessageId.SourcesOk));
  } catch (error) {
    console.error(error);
    return 1;
  }
}

if (import.meta.main) process.exit(await checkSources());
