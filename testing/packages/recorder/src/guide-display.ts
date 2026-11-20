import { join } from "node:path";
import {
  AipParam,
  DigestEncoding,
  DOCS_PAGE_TOKEN,
  FileSuffix,
  Glyph,
  GUIDE_CHUNKS_KEY,
  GUIDE_FIRST_GROUP,
  GUIDE_JSON_BLOCK,
  GUIDE_JSON_START,
  GUIDE_MEASUREMENT,
  GUIDE_METRIC_LINE,
  GUIDE_NAME_KEY,
  GUIDE_NUMBER_TYPE,
  GUIDE_PARAMS_KEY,
  GUIDE_PROGRESS_KEY,
  GUIDE_PROGRESS_SAMPLE,
  GUIDE_RAW_DIRECTORY,
  GUIDE_STATS_NAME,
  GUIDE_STRING_TYPE,
  HashAlgorithm,
  JsonToken,
  MCP_PROGRESS_METHOD,
  MCP_TASK_GET,
  McpTaskStatus,
  MessageId,
  SSE_FIELD_SEPARATOR,
  SSE_FRAME_END,
  SseField,
  StepFlag,
  Text,
  TYPEOF_OBJECT,
} from "@platform/constants";
import { message } from "@platform/messages";
import { REPO_ROOT } from "@platform/test-framework";
import {
  JsonObjectSchema,
  McpTaskInputSchema,
  McpTaskSchema,
  type RecordedPage,
  RecordedPageSchema,
  type StepResult,
} from "@platform/types";
import { all } from "@platform/util";
import { assertPassed } from "./record.ts";
import { stabilizeResults } from "./stabilize.ts";

async function displayValue(value: unknown, measured = false): Promise<unknown> {
  if (typeof value === GUIDE_NUMBER_TYPE) return measured ? GUIDE_MEASUREMENT : value;
  if (typeof value === GUIDE_STRING_TYPE) return displayText(String(value));
  if (Array.isArray(value))
    return all(value.map((item) => async () => displayValue(item, measured)));
  if (value === null || typeof value !== TYPEOF_OBJECT) return value;
  return displayObject(value as object, measured);
}

async function displayObject(value: object, measured: boolean): Promise<unknown> {
  const entries = Object.entries(value);
  const stats = entries.some(([key, item]) => key === GUIDE_NAME_KEY && item === GUIDE_STATS_NAME);
  const fields = Object.fromEntries(entries);
  return Object.fromEntries(
    await all(
      Object.keys(fields)
        .sort()
        .map((key) => async () => [key, await displayField(key, fields[key], measured || stats)]),
    ),
  );
}

async function displayField(key: string, value: unknown, measured: boolean): Promise<unknown> {
  const token = key === AipParam.PageToken || key === AipParam.NextPageToken;
  if (token && typeof value === GUIDE_STRING_TYPE && value !== Text.Empty) return DOCS_PAGE_TOKEN;
  return key === GUIDE_CHUNKS_KEY && Array.isArray(value)
    ? displayChunks(value)
    : displayValue(value, measured);
}

async function displayChunks(chunks: unknown[]): Promise<unknown> {
  if (!chunks.every((chunk) => typeof chunk === GUIDE_STRING_TYPE)) return displayValue(chunks);
  return chunks.length === 0 ? [] : [await displayText(chunks.join(Text.Empty))];
}

async function progressFrame(frame: string): Promise<boolean> {
  const prefix = SseField.Data + SSE_FIELD_SEPARATOR;
  const line = frame.split(Text.Newline).find((part) => part.startsWith(prefix));
  if (line === undefined) return false;
  try {
    const value = JsonObjectSchema.safeParse(JSON.parse(line.slice(prefix.length)));
    const params = JsonObjectSchema.safeParse(
      value.success ? value.data[GUIDE_PARAMS_KEY] : undefined,
    );
    return (
      value.success &&
      value.data.method === MCP_PROGRESS_METHOD &&
      params.success &&
      typeof params.data[GUIDE_PROGRESS_KEY] === GUIDE_NUMBER_TYPE
    );
  } catch {
    return false;
  }
}

async function displayFrames(text: string): Promise<string> {
  const frames = text.split(SSE_FRAME_END);
  const kinds = await all(frames.map((frame) => async () => progressFrame(frame)));
  const progress = kinds.flatMap((kind, index) => (kind ? [index] : []));
  const selected = frames.filter(
    (_, index) => !progress.includes(index) || index === progress[0] || index === progress.at(-1),
  );
  return (
    await all(selected.map((frame) => async () => displayLines(frame, await progressFrame(frame))))
  ).join(SSE_FRAME_END);
}

async function displayProgress(value: unknown): Promise<unknown> {
  const packet = JsonObjectSchema.parse(value);
  const params = JsonObjectSchema.parse(packet[GUIDE_PARAMS_KEY]);
  return {
    ...packet,
    [GUIDE_PARAMS_KEY]: { ...params, [GUIDE_PROGRESS_KEY]: GUIDE_PROGRESS_SAMPLE },
  };
}

async function displayLines(frame: string, progress = false): Promise<string> {
  return (
    await all(
      frame.split(Text.Newline).map((line) => async () => {
        const start = line.indexOf(JsonToken.ObjectOpen);
        if (start < 0) return line;
        try {
          const value = JSON.parse(line.slice(start));
          const shown = progress ? await displayProgress(value) : value;
          return line.slice(0, start) + JSON.stringify(await displayValue(shown));
        } catch {
          return line;
        }
      }),
    )
  ).join(Text.Newline);
}

async function displayText(text: string): Promise<string> {
  if (GUIDE_JSON_START.test(text)) {
    try {
      return JSON.stringify(await displayValue(JSON.parse(text)), null, 2);
    } catch {
      return text;
    }
  }
  let shown = text.replace(
    GUIDE_METRIC_LINE,
    [GUIDE_FIRST_GROUP, GUIDE_MEASUREMENT].join(Glyph.Space),
  );
  for (const match of [...shown.matchAll(GUIDE_JSON_BLOCK)])
    shown = shown.replace(
      match[0],
      `${match[1]}${await displayText(match[2] ?? Text.Empty)}${match[3]}`,
    );
  return shown.includes(SSE_FRAME_END) ? displayFrames(shown) : shown;
}

async function workingPollKey(result: StepResult): Promise<string | undefined> {
  if (result.flag !== StepFlag.Passed || result.evidence.rpc?.method !== MCP_TASK_GET)
    return undefined;
  if (!result.checks.every((check) => check.passed)) return undefined;
  const request = McpTaskInputSchema.safeParse(result.evidence.rpc?.params);
  if (!request.success) return undefined;
  try {
    const packet = JsonObjectSchema.parse(JSON.parse(result.evidence.response ?? Text.Empty));
    if (packet.error !== undefined) return undefined;
    const task = McpTaskSchema.safeParse(packet.result);
    return task.success &&
      task.data.status === McpTaskStatus.Working &&
      task.data.taskId === request.data.taskId
      ? task.data.taskId
      : undefined;
  } catch {
    return undefined;
  }
}

export async function guideResults(results: readonly StepResult[]): Promise<StepResult[]> {
  const keys = await all(results.map((result) => async () => workingPollKey(result)));
  const selected = results.filter(
    (_result, index) => keys[index] === undefined || keys.indexOf(keys[index]) === index,
  );
  const copies = await all(
    selected.map((result) => async () => ({
      ...result,
      evidence: {
        ...result.evidence,
        response:
          result.evidence.response === undefined
            ? undefined
            : await displayText(result.evidence.response),
        note:
          result.evidence.note === undefined ? undefined : await displayText(result.evidence.note),
      },
    })),
  );
  return stabilizeResults(copies);
}

export async function guidePage(
  page: RecordedPage,
  write: (path: string, content: string) => Promise<unknown> = async (path, content) =>
    Bun.write(path, content),
): Promise<RecordedPage> {
  RecordedPageSchema.parse(page);
  assertPassed(page.id, page.results);
  const raw = JSON.stringify(page);
  const digest = new Bun.CryptoHasher(HashAlgorithm.Sha256).update(raw).digest(DigestEncoding.Hex);
  await write(
    join(REPO_ROOT, GUIDE_RAW_DIRECTORY, [page.id, digest].join(Glyph.Minus) + FileSuffix.Json),
    raw,
  );
  return {
    ...page,
    intent: [page.intent, message(MessageId.GuideDisplayValues)].join(Glyph.Space),
    results: await guideResults(page.results),
  };
}
