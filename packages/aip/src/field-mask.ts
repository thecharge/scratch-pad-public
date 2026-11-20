import { behaviorOf } from "@platform/capability";
import {
  CanonicalCode,
  ErrorReason,
  FieldBehavior,
  FULL_REPLACEMENT_MASK,
  MessageId,
  ResourceView,
  Separator,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { filterAsync, flatMapAsync } from "@platform/store";
import type { JsonObject, UpdateRules } from "@platform/types";
import { z } from "zod";

const INDEX_SEGMENT = /^\d+$/;

async function invalidMask(detail: string): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.InvalidArgument,
    ErrorReason.InvalidFieldMask,
    MessageId.InvalidFieldMask,
    { detail },
  );
}

async function join(prefix: string, name: string): Promise<string> {
  return prefix.length === 0 ? name : [prefix, name].join(Separator.FieldPath);
}

export async function parseFieldMask(text: string | undefined): Promise<string[] | undefined> {
  if (text === undefined || text.trim().length === 0) {
    return undefined;
  }
  const paths = text
    .split(Separator.List)
    .map((path) => path.trim())
    .filter((path) => path.length > 0);
  return [...new Set(paths)];
}

async function unwrap(schema: z.ZodType): Promise<z.ZodType> {
  const wrapped =
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault;
  return wrapped ? await unwrap(schema.unwrap() as z.ZodType) : schema;
}

async function childSchema(field: unknown): Promise<z.ZodObject | undefined> {
  const inner = await unwrap(field as z.ZodType);
  return inner instanceof z.ZodObject ? inner : undefined;
}

export async function maskPathsOf(
  schema: z.ZodObject,
  prefix: string = Text.Empty,
): Promise<Set<string>> {
  const paths = await flatMapAsync(Object.entries(schema.shape), async ([name, field]) => {
    const path = await join(prefix, name);
    const child = await childSchema(field);
    return child === undefined ? [path] : [path, ...(await maskPathsOf(child, path))];
  });
  return new Set(paths);
}

export async function validateFieldMask(
  paths: readonly string[],
  allowed: ReadonlySet<string>,
): Promise<void> {
  const bad = paths
    .filter((path) => path !== FULL_REPLACEMENT_MASK)
    .find(
      (path) =>
        path.split(Separator.FieldPath).some((segment) => INDEX_SEGMENT.test(segment)) ||
        !allowed.has(path),
    );
  if (bad !== undefined) {
    throw await invalidMask(bad);
  }
}

export async function collectBehaviors(
  schema: z.ZodObject,
  prefix: string = Text.Empty,
): Promise<Map<string, FieldBehavior>> {
  const entries = await flatMapAsync(Object.entries(schema.shape), async ([name, field]) => {
    const path = await join(prefix, name);
    const behavior = await behaviorOf(field as z.ZodType);
    const own = behavior === undefined ? [] : [[path, behavior] as const];
    const child = await childSchema(field);
    return child === undefined ? own : [...own, ...(await collectBehaviors(child, path))];
  });
  return new Map(entries);
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && Object(value) === value && !Array.isArray(value);
}

async function getPath(source: unknown, path: string): Promise<unknown> {
  return path
    .split(Separator.FieldPath)
    .reduce<unknown>(
      (current, segment) => (isObject(current) ? current[segment] : undefined),
      source,
    );
}

async function setPath(target: JsonObject, path: string, value: unknown): Promise<void> {
  const segments = path.split(Separator.FieldPath);
  const parent = segments.slice(0, -1).reduce<JsonObject>((current, segment) => {
    current[segment] = isObject(current[segment]) ? current[segment] : {};
    return current[segment] as JsonObject;
  }, target);
  parent[segments.at(-1) as string] = value;
}

async function leafPaths(value: unknown, prefix: string = Text.Empty): Promise<string[]> {
  if (!isObject(value)) {
    return prefix.length === 0 ? [] : [prefix];
  }
  return await flatMapAsync(
    Object.entries(value).filter(([, child]) => child !== undefined),
    async ([name, child]) => leafPaths(child, await join(prefix, name)),
  );
}

export async function selectFields(
  resource: JsonObject,
  paths: readonly string[] | undefined,
): Promise<JsonObject> {
  if (paths === undefined || paths.length === 0) {
    return resource;
  }
  const result: JsonObject = {};
  for (const path of await filterAsync(
    paths,
    async (candidate) => (await getPath(resource, candidate)) !== undefined,
  )) {
    await setPath(result, path, structuredClone(await getPath(resource, path)));
  }
  return result;
}

export async function applyView(
  resource: JsonObject,
  view: ResourceView,
  basicFields: readonly string[],
): Promise<JsonObject> {
  return view === ResourceView.Full ? resource : await selectFields(resource, basicFields);
}

async function immutableViolation(path: string): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.InvalidArgument,
    ErrorReason.FieldImmutable,
    MessageId.FieldImmutable,
    { field: path },
  );
}

async function applyPath(
  result: JsonObject,
  current: JsonObject,
  patch: JsonObject,
  path: string,
  rules: UpdateRules,
): Promise<void> {
  const behavior = rules.behaviors.get(path);
  const next = await getPath(patch, path);
  if (behavior === FieldBehavior.OutputOnly) {
    return;
  }
  if (behavior === FieldBehavior.Immutable) {
    const existing = await getPath(current, path);
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(next)) {
      throw await immutableViolation(path);
    }
    return;
  }
  if (next !== undefined) {
    await setPath(result, path, structuredClone(next));
  }
}

export async function applyUpdateMask(
  current: JsonObject,
  patch: JsonObject,
  mask: readonly string[] | undefined,
  rules: UpdateRules,
): Promise<JsonObject> {
  const result = structuredClone(current);
  const fullReplacement = mask?.includes(FULL_REPLACEMENT_MASK) === true;
  const paths = fullReplacement || mask === undefined ? await leafPaths(patch) : [...mask];
  for (const path of paths) {
    await applyPath(result, current, patch, path, rules);
  }
  return result;
}
