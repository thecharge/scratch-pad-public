import type { McpServer } from "@modelcontextprotocol/server";
import {
  MCP_MISSING_CAPABILITY_CODE,
  MCP_TASK_CANCEL,
  MCP_TASK_GET,
  MCP_TASK_UPDATE,
  MCP_TASKS_EXTENSION,
  MessageId,
} from "@platform/constants";
import { message } from "@platform/messages";
import {
  type CapabilityContext,
  McpTaskInputSchema,
  type McpTaskRegistry,
  McpTaskSchema,
  McpTasksEnvelopeSchema,
  McpTaskUpdateInputSchema,
} from "@platform/types";
import { z } from "zod";

async function requireTasks(envelope: unknown): Promise<void> {
  if (McpTasksEnvelopeSchema.safeParse(envelope).success) return;
  const extensions = { [MCP_TASKS_EXTENSION]: {} };
  const requiredCapabilities = { extensions };
  const { ProtocolError } = await import("@modelcontextprotocol/server");
  throw new ProtocolError(MCP_MISSING_CAPABILITY_CODE, message(MessageId.McpTasksRequired), {
    requiredCapabilities,
  });
}

export async function registerMcpTasks(
  server: McpServer,
  tasks: McpTaskRegistry,
  context: CapabilityContext,
): Promise<void> {
  server.server.setRequestHandler(
    MCP_TASK_GET,
    { params: McpTaskInputSchema, result: McpTaskSchema },
    async ({ taskId }, request) => {
      await requireTasks(request.mcpReq.envelope);
      return tasks.get(taskId, context);
    },
  );
  server.server.setRequestHandler(
    MCP_TASK_CANCEL,
    { params: McpTaskInputSchema, result: z.object({}) },
    async ({ taskId }, request) => {
      await requireTasks(request.mcpReq.envelope);
      await tasks.cancel(taskId, context);
      return {};
    },
  );
  server.server.setRequestHandler(
    MCP_TASK_UPDATE,
    { params: McpTaskUpdateInputSchema, result: z.object({}) },
    async ({ taskId }, request) => {
      await requireTasks(request.mcpReq.envelope);
      await tasks.update(taskId, context);
      return {};
    },
  );
}
