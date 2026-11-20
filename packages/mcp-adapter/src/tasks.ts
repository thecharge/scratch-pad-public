import {
  CanonicalCode,
  CapabilityId,
  DEFAULT_STORE_MAX_ENTRIES,
  ErrorReason,
  MCP_COMPLETE_RESULT_TYPE,
  McpContentType,
  McpTaskStatus,
  MessageId,
  OPERATION_POLL_MS,
  OPERATION_TTL_MS,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { BoundedStore } from "@platform/store";
import {
  type CapabilityContext,
  type CapabilitySource,
  type Invoke,
  type McpTask,
  type McpTaskRecord,
  type McpTaskRegistry,
  type Operation,
  OperationSchema,
} from "@platform/types";

async function missing(name: string): Promise<never> {
  throw new ApiError(
    CanonicalCode.NotFound,
    ErrorReason.OperationNotFound,
    MessageId.OperationNotFound,
    { name },
  );
}

async function taskOf(record: McpTaskRecord, operation: Operation): Promise<McpTask> {
  const cancelled = operation.error?.status === CanonicalCode.Cancelled;
  const status = operation.done ? McpTaskStatus.Completed : McpTaskStatus.Working;
  const result = {
    resultType: MCP_COMPLETE_RESULT_TYPE,
    content: [{ type: McpContentType.Text, text: JSON.stringify(operation) }],
    structuredContent: operation,
    isError: operation.error !== undefined,
  };
  return {
    taskId: record.taskId,
    status: cancelled ? McpTaskStatus.Cancelled : status,
    createdAt: record.createdAt,
    lastUpdatedAt: record.lastUpdatedAt,
    ttlMs: OPERATION_TTL_MS,
    pollIntervalMs: OPERATION_POLL_MS,
    ...(operation.done && !cancelled ? { result } : {}),
  };
}

export async function createMcpTaskRegistry(
  source: CapabilitySource,
  invoke: Invoke,
  now: () => number = Date.now,
): Promise<McpTaskRegistry> {
  const records = new BoundedStore<McpTaskRecord>({
    maxEntries: DEFAULT_STORE_MAX_ENTRIES,
    ttlMs: OPERATION_TTL_MS,
    now,
  });
  const call = async (id: string, name: string, context: CapabilityContext) => {
    const capability = (await source.list()).find((item) => item.id === id);
    if (capability === undefined) return missing(name);
    return (await invoke(capability, { name }, context)).output;
  };
  const owned = async (taskId: string, context: CapabilityContext) => {
    const record = await records.get(taskId);
    if (record === undefined || record.owner !== (context.principal.subject ?? Text.Empty))
      return missing(taskId);
    return record;
  };
  return {
    async create(operation, context) {
      if (context.authEnabled && context.principal.subject === undefined)
        return missing(operation.name);
      const time = new Date(now()).toISOString();
      const record = {
        taskId: crypto.randomUUID(),
        owner: context.principal.subject ?? Text.Empty,
        name: operation.name,
        createdAt: time,
        lastUpdatedAt: time,
        snapshot: JSON.stringify(operation),
      };
      await records.set(record.taskId, record);
      return taskOf(record, operation);
    },
    async get(taskId, context) {
      const record = await owned(taskId, context);
      const operation = OperationSchema.parse(
        await call(CapabilityId.OperationsGet, record.name, context),
      );
      const snapshot = JSON.stringify(operation);
      const updated =
        snapshot === record.snapshot
          ? record
          : { ...record, snapshot, lastUpdatedAt: new Date(now()).toISOString() };
      const remaining = OPERATION_TTL_MS - (now() - Date.parse(record.createdAt));
      await records.set(taskId, updated, remaining);
      return taskOf(updated, operation);
    },
    async cancel(taskId, context) {
      const record = await owned(taskId, context);
      await call(CapabilityId.OperationsCancel, record.name, context);
    },
    async update(taskId, context) {
      const record = await owned(taskId, context);
      await call(CapabilityId.OperationsGet, record.name, context);
    },
  };
}
