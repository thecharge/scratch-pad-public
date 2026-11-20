import { collectionOf, normalizeInput, pathInput } from "@platform/aip";
import {
  CanonicalCode,
  ErrorReason,
  FilterLiteral,
  HttpHeader,
  HttpMethod,
  MEDIA_PARAM_SEPARATOR,
  MediaType,
  MessageId,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { message } from "@platform/messages";
import { drain, readNdjson } from "@platform/streams";
import {
  type Collection,
  type JsonObject,
  JsonObjectSchema,
  type RawMedia,
  type RouteSpec,
  type StringRecord,
} from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";

const NO_BODY: readonly HttpMethod[] = [HttpMethod.Get, HttpMethod.Delete];
const NUMERIC_TEXT = /^-?\d+(\.\d+)?$/;

async function invalidBody(detail: string): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.InvalidArgument,
    ErrorReason.ValidationFailed,
    MessageId.ValidationFailed,
    { detail },
  );
}

async function parseJson(text: string): Promise<unknown> {
  try {
    return JSON.parse(text);
  } catch {
    throw await invalidBody(message(MessageId.InvalidJsonBody));
  }
}

async function readLines(request: Request, collection: Collection): Promise<JsonObject> {
  try {
    const items = await Array.fromAsync(
      readNdjson(request.body as ReadableStream<Uint8Array>, collection.element),
    );
    return JsonObjectSchema.parse(await normalizeInput({ [collection.field]: items }));
  } catch (error) {
    await drain(request.body);
    throw await invalidBody((error as Error).message);
  }
}

async function readBody(
  request: Request,
  route: RouteSpec,
  schema: z.ZodType,
): Promise<JsonObject> {
  if (NO_BODY.includes(route.method)) {
    return {};
  }
  const collection = await collectionOf(schema);
  const type = (request.headers.get(HttpHeader.ContentType) ?? Text.Empty)
    .split(MEDIA_PARAM_SEPARATOR)[0]
    ?.trim()
    .toLowerCase();
  if (collection !== undefined && type === MediaType.Ndjson && request.body !== null) {
    return readLines(request, collection);
  }
  const text = await request.text();
  if (text.trim() === Text.Empty) {
    return {};
  }
  const parsed = JsonObjectSchema.safeParse(await normalizeInput(await parseJson(text)));
  if (!parsed.success) {
    throw await invalidBody(message(MessageId.InvalidJsonBody));
  }
  return parsed.data;
}

async function candidatesFor(raw: string): Promise<unknown[]> {
  const numeric = NUMERIC_TEXT.test(raw) ? [Number(raw)] : [];
  return [raw, ...numeric, raw === FilterLiteral.True, raw === FilterLiteral.False];
}

async function coerceValue(field: z.ZodType | undefined, raw: string): Promise<unknown> {
  if (field === undefined) {
    return raw;
  }
  const accepted = (await candidatesFor(raw)).find(
    (candidate) => field.safeParse(candidate).success,
  );
  return accepted ?? raw;
}

async function isList(field: z.ZodType | undefined): Promise<boolean> {
  const inner = field instanceof z.ZodOptional ? field.unwrap() : field;
  return inner instanceof z.ZodArray;
}

async function coerceEntry(field: z.ZodType | undefined, values: string[]): Promise<unknown> {
  return (await isList(field)) ? values : await coerceValue(field, values.at(-1) ?? Text.Empty);
}

async function coerceQuery(schema: z.ZodType, query: URLSearchParams): Promise<JsonObject> {
  const shape = schema instanceof z.ZodObject ? schema.shape : {};
  const keys = [...new Set(query.keys())];
  const entries = await all(
    keys.map((key) => async () => [key, await coerceEntry(shape[key], query.getAll(key))] as const),
  );
  return JsonObjectSchema.parse(await normalizeInput(Object.fromEntries(entries)));
}

export async function buildInput(
  request: Request,
  route: RouteSpec,
  schema: z.ZodType,
  params: StringRecord,
  media?: RawMedia,
): Promise<JsonObject> {
  const query = await coerceQuery(schema, new URL(request.url).searchParams);
  const body =
    media === undefined
      ? await readBody(request, route, schema)
      : {
          [media.bodyField]: request.body,
          [media.mediaTypeField]: request.headers
            .get(HttpHeader.ContentType)
            ?.split(MEDIA_PARAM_SEPARATOR)[0]
            ?.trim()
            .toLowerCase(),
          [media.checksumField]: request.headers.get(media.checksumHeader),
        };
  return { ...query, ...body, ...(await pathInput(route, params)) };
}
