import { CanonicalCode, ErrorReason, MessageId } from "@platform/constants";
import { ApiError } from "@platform/errors";
import type { JsonObject } from "@platform/types";
import { all } from "@platform/util";

const SNAKE_SEGMENT = /_([a-z0-9])/g;

export async function snakeToCamel(key: string): Promise<string> {
  return key.replace(SNAKE_SEGMENT, (_match, next: string) => next.toUpperCase());
}

function isPlainObject(value: unknown): value is JsonObject {
  if (value === null || Object(value) !== value || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

async function ambiguous(key: string): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.InvalidArgument,
    ErrorReason.ValidationFailed,
    MessageId.UnknownField,
    { field: key },
  );
}

export async function normalizeInput(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) {
    return all(value.map((item) => async () => normalizeInput(item)));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const keys = await all(Object.keys(value).map((item) => async () => snakeToCamel(item)));
  const duplicate = Object.keys(value).find(
    (key, index) => keys.indexOf(keys[index] ?? key) !== index,
  );
  if (duplicate !== undefined) {
    throw await ambiguous(duplicate);
  }
  return Object.fromEntries(
    await all(
      Object.entries(value).map(([key, child]) => async () => [
        await snakeToCamel(key),
        await normalizeInput(child),
      ]),
    ),
  );
}

export async function toWire(value: unknown): Promise<unknown> {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return all(value.map((item) => async () => toWire(item)));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.fromEntries(
    await all(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => async () => [await snakeToCamel(key), await toWire(child)]),
    ),
  );
}
