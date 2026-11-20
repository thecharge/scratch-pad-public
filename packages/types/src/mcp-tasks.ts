import {
  MCP_META_KEYS,
  MCP_TASK_CANCEL,
  MCP_TASK_GET,
  MCP_TASK_RESULT_TYPE,
  MCP_TASK_UPDATE,
  MCP_TASKS_EXTENSION,
  McpTaskStatus,
} from "@platform/constants";
import { z } from "zod";
import type { Operation } from "./aip/operation.ts";
import type { CapabilityContext } from "./capability/context.ts";
import { McpToolResultSchema } from "./contracts/http.ts";
import { JsonObjectSchema } from "./json.ts";

const taskExtensions = z.looseObject({ [MCP_TASKS_EXTENSION]: JsonObjectSchema });
const taskClientCapabilities = z.looseObject({ extensions: taskExtensions });
export const McpTasksEnvelopeSchema = z.looseObject({
  [MCP_META_KEYS.clientCapabilities]: taskClientCapabilities,
});
export const McpTaskInputSchema = z.looseObject({ taskId: z.string().min(1) });
export const McpProgressTokenSchema = z.union([z.string(), z.number()]);
export const McpTaskRequestSchema = z.looseObject({
  method: z.enum([MCP_TASK_GET, MCP_TASK_CANCEL, MCP_TASK_UPDATE]),
});
export const McpTaskUpdateInputSchema = McpTaskInputSchema.extend({
  inputResponses: JsonObjectSchema.optional(),
});
export const McpTaskSchema = z.object({
  taskId: z.string(),
  status: z.enum(McpTaskStatus),
  createdAt: z.iso.datetime(),
  lastUpdatedAt: z.iso.datetime(),
  ttlMs: z.number().int().positive(),
  pollIntervalMs: z.number().int().positive(),
  result: JsonObjectSchema.optional(),
});
export type McpTask = z.infer<typeof McpTaskSchema>;
export const McpTaskRecordSchema = z.object({
  taskId: z.string(),
  owner: z.string(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  lastUpdatedAt: z.iso.datetime(),
  snapshot: z.string(),
});
export type McpTaskRecord = z.infer<typeof McpTaskRecordSchema>;

export interface McpTaskRegistry {
  create(operation: Operation, context: CapabilityContext): Promise<McpTask>;
  get(taskId: string, context: CapabilityContext): Promise<McpTask>;
  cancel(taskId: string, context: CapabilityContext): Promise<void>;
  update(taskId: string, context: CapabilityContext): Promise<void>;
}

export const McpTaskToolResultSchema = McpToolResultSchema.extend({
  ...McpTaskSchema.shape,
  resultType: z.literal(MCP_TASK_RESULT_TYPE),
});
export type McpTaskToolResult = z.infer<typeof McpTaskToolResultSchema>;
