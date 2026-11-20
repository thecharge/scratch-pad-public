import { BATCH_MAX_ITEMS, CanonicalCode, ErrorReason, MessageId } from "@platform/constants";
import { ApiError } from "@platform/errors";
import type { JsonObject, SoftDeleteFields } from "@platform/types";
import { all } from "@platform/util";

export async function softDelete<T extends JsonObject>(
  resource: T,
  now: Date,
  retentionMs: number,
): Promise<T & SoftDeleteFields> {
  return {
    ...resource,
    deleteTime: now.toISOString(),
    purgeTime: new Date(now.getTime() + retentionMs).toISOString(),
  };
}

export async function isDeleted(resource: JsonObject): Promise<boolean> {
  return resource.deleteTime !== undefined;
}

export async function undelete<T extends JsonObject>(
  resource: T,
  name: string,
): Promise<Omit<T, keyof SoftDeleteFields>> {
  if (!(await isDeleted(resource))) {
    throw new ApiError(
      CanonicalCode.AlreadyExists,
      ErrorReason.ResourceExists,
      MessageId.AlreadyExists,
      { name },
    );
  }
  const { deleteTime: _deleteTime, purgeTime: _purgeTime, ...rest } = resource;
  return rest as Omit<T, keyof SoftDeleteFields>;
}

export async function transition<S extends string>(
  current: S,
  to: S,
  allowedFrom: readonly S[],
): Promise<S> {
  if (!allowedFrom.includes(current)) {
    throw new ApiError(
      CanonicalCode.FailedPrecondition,
      ErrorReason.InvalidTransition,
      MessageId.InvalidTransition,
      { from: current, to },
    );
  }
  return to;
}

export async function assertBatchSize(count: number): Promise<void> {
  if (count === 0) {
    throw new ApiError(
      CanonicalCode.InvalidArgument,
      ErrorReason.ValidationFailed,
      MessageId.EmptyBatch,
    );
  }
  if (count > BATCH_MAX_ITEMS) {
    throw new ApiError(
      CanonicalCode.InvalidArgument,
      ErrorReason.BatchTooLarge,
      MessageId.BatchTooLarge,
      { max: BATCH_MAX_ITEMS },
    );
  }
}

async function missing(name: string): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.NotFound,
    ErrorReason.ResourceNotFound,
    MessageId.ResourceNotFound,
    { name },
  );
}

export async function batchGet<T>(
  names: readonly string[],
  load: (name: string) => Promise<T | undefined>,
): Promise<T[]> {
  await assertBatchSize(names.length);
  const items = await all(names.map((item) => async () => load(item)));
  const absent = items.indexOf(undefined);
  if (absent >= 0) {
    throw await missing(names[absent] as string);
  }
  return items as T[];
}

export async function atomically<I, R>(
  items: readonly I[],
  apply: (item: I) => Promise<R>,
  undo: (item: I, result: R) => Promise<void>,
): Promise<R[]> {
  await assertBatchSize(items.length);
  const applied: Array<[I, R]> = [];
  try {
    for (const item of items) {
      applied.push([item, await apply(item)]);
    }
    return applied.map(([, result]) => result);
  } catch (error) {
    for (const [item, result] of applied.reverse()) {
      await undo(item, result);
    }
    throw error;
  }
}
