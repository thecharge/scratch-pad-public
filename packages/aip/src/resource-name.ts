import {
  CanonicalCode,
  COLLECTION_ID_PATTERN,
  ErrorReason,
  MessageId,
  PARAM_SEGMENT_PATTERN,
  RESOURCE_ID_PATTERN,
  Separator,
  Text,
  UnicodeForm,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { everyAsync, filterAsync, flatMapAsync } from "@platform/store";
import type { StringRecord } from "@platform/types";
import { all } from "@platform/util";

export async function isValidResourceId(id: string): Promise<boolean> {
  return RESOURCE_ID_PATTERN.test(id);
}

export async function assertResourceId(id: string): Promise<void> {
  if (!(await isValidResourceId(id))) {
    throw new ApiError(
      CanonicalCode.InvalidArgument,
      ErrorReason.InvalidResourceId,
      MessageId.InvalidResourceId,
      { id },
    );
  }
}

export async function normalizeNfc(text: string): Promise<string> {
  return text.normalize(UnicodeForm.Nfc);
}

export async function codePointLength(text: string): Promise<number> {
  return [...text].length;
}

export async function sameText(a: string, b: string): Promise<boolean> {
  return (await normalizeNfc(a)) === (await normalizeNfc(b));
}

async function paramName(part: string): Promise<string | undefined> {
  return PARAM_SEGMENT_PATTERN.exec(part)?.[1];
}

async function segmentMatches(part: string, value: string): Promise<boolean> {
  return (await paramName(part)) === undefined ? part === value : await isValidResourceId(value);
}

export async function parseResourceName(
  pattern: string,
  name: string,
): Promise<StringRecord | undefined> {
  const patternParts = pattern.split(Separator.Resource);
  const nameParts = name.split(Separator.Resource);
  const matches =
    patternParts.length === nameParts.length &&
    (await everyAsync(patternParts, async (part, index) =>
      segmentMatches(part, nameParts[index] ?? Text.Empty),
    ));
  if (!matches) {
    return undefined;
  }
  const entries = await flatMapAsync(patternParts, async (part, index) => {
    const key = await paramName(part);
    return key === undefined ? [] : [[key, nameParts[index] ?? Text.Empty] as const];
  });
  return Object.fromEntries(entries);
}

async function invalidName(name: string, pattern: string): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.InvalidArgument,
    ErrorReason.InvalidResourceName,
    MessageId.InvalidResourceName,
    { name, pattern },
  );
}

export async function requireResourceName(pattern: string, name: string): Promise<StringRecord> {
  const params = await parseResourceName(pattern, name);
  if (params === undefined) {
    throw await invalidName(name, pattern);
  }
  return params;
}

export async function buildResourceName(pattern: string, params: StringRecord): Promise<string> {
  return (
    await all(
      pattern.split(Separator.Resource).map((part) => async () => {
        const key = await paramName(part);
        if (key === undefined) {
          return part;
        }
        const value = params[key];
        if (value === undefined) {
          throw await invalidName(part, pattern);
        }
        await assertResourceId(value);
        return value;
      }),
    )
  ).join(Separator.Resource);
}

export async function hasValidCollections(pattern: string): Promise<boolean> {
  return (
    await filterAsync(
      pattern.split(Separator.Resource),
      async (part) => (await paramName(part)) === undefined,
    )
  ).every((part) => COLLECTION_ID_PATTERN.test(part));
}
