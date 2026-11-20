import type { ServerContext, ToolAnnotations } from "@modelcontextprotocol/server";
import { toWire } from "@platform/aip";
import {
  AssetCapabilityId,
  CapabilityId,
  MCP_PROGRESS_METHOD,
  MCP_TASK_RESULT_TYPE,
  MCP_TASK_WAIT_TIMEOUT,
  McpContentType,
  MethodKind,
  TransportKind,
} from "@platform/constants";
import { toApiError } from "@platform/errors";
import type {
  Capability,
  CapabilityContext,
  Invoke,
  JsonObject,
  McpTaskRegistry,
  McpTaskToolResult,
  McpToolResult,
  OperationProgress,
  Principal,
} from "@platform/types";
import {
  AssetDownloadSchema,
  JsonObjectSchema,
  McpProgressTokenSchema,
  McpTasksEnvelopeSchema,
  OperationProgressSchema,
  OperationSchema,
  WaitOperationInputSchema,
} from "@platform/types";

const READ_ONLY: readonly MethodKind[] = [MethodKind.Get, MethodKind.List, MethodKind.BatchGet];
const DESTRUCTIVE: readonly MethodKind[] = [MethodKind.Delete, MethodKind.BatchDelete];
const IDEMPOTENT: readonly MethodKind[] = [MethodKind.Update, MethodKind.Delete, MethodKind.Get];

export async function annotationsFor(capability: Capability): Promise<ToolAnnotations> {
  return {
    title: capability.summary,
    readOnlyHint: READ_ONLY.includes(capability.method),
    destructiveHint: DESTRUCTIVE.includes(capability.method),
    idempotentHint: IDEMPOTENT.includes(capability.method),
    openWorldHint: false,
  };
}

async function textResult(value: unknown, isError: boolean): Promise<McpToolResult> {
  return { content: [{ type: McpContentType.Text, text: JSON.stringify(value) }], isError };
}

async function structured(wire: unknown): Promise<JsonObject | undefined> {
  const parsed = JsonObjectSchema.safeParse(wire);
  return parsed.success ? parsed.data : undefined;
}

async function assetResult(
  capability: Capability,
  wire: unknown,
  result: McpToolResult,
): Promise<McpToolResult> {
  if (capability.id !== AssetCapabilityId.Get) return result;
  const asset = AssetDownloadSchema.parse(wire);
  return {
    ...result,
    content: [
      ...result.content,
      {
        type: McpContentType.ResourceLink,
        uri: asset.downloadUrl,
        name: asset.name,
        mimeType: asset.mediaType,
        size: asset.sizeBytes,
      },
    ],
  };
}

async function progressNotifier(request?: ServerContext): Promise<OperationProgress | undefined> {
  const token = McpProgressTokenSchema.safeParse(request?.mcpReq._meta?.progressToken);
  if (request === undefined || !token.success) return undefined;
  return async (operation) => {
    const metadata = OperationProgressSchema.safeParse(operation.metadata);
    const progress = metadata.success ? metadata.data.processed : 0;
    const params = {
      progressToken: token.data,
      progress,
      ...(metadata.success ? { total: metadata.data.total } : {}),
    };
    await request.mcpReq.notify({ method: MCP_PROGRESS_METHOD, params });
  };
}

export async function toolHandler(
  capability: Capability,
  invoke: Invoke,
  principal: Principal,
  authEnabled: boolean,
  requestId: string,
  tasks?: McpTaskRegistry,
) {
  return async (
    args: unknown,
    request?: ServerContext,
  ): Promise<McpToolResult | McpTaskToolResult> => {
    const taskEnabled =
      tasks !== undefined && McpTasksEnvelopeSchema.safeParse(request?.mcpReq.envelope).success;
    const onProgress = taskEnabled ? undefined : await progressNotifier(request);
    const context: CapabilityContext = {
      principal,
      requestId,
      transport: TransportKind.Mcp,
      authEnabled,
      ...(request === undefined ? {} : { signal: request.mcpReq.signal }),
      ...(onProgress === undefined ? {} : { onProgress }),
    };
    try {
      const input =
        taskEnabled && capability.id === CapabilityId.OperationsWait
          ? { ...WaitOperationInputSchema.parse(args), timeout: MCP_TASK_WAIT_TIMEOUT }
          : args;
      const result = await invoke(capability, input, context);
      const wire = await toWire(result.output);
      const content = await structured(wire);
      const response = await assetResult(capability, wire, {
        ...(await textResult(wire, false)),
        ...(content === undefined ? {} : { structuredContent: content }),
      });
      if (taskEnabled && capability.output === OperationSchema)
        return {
          ...response,
          resultType: MCP_TASK_RESULT_TYPE,
          ...(await tasks.create(OperationSchema.parse(wire), context)),
        };
      return response;
    } catch (error) {
      const failure = await toApiError(error);
      return await textResult(
        {
          message: failure.message,
          status: failure.code,
          reason: failure.reason,
          metadata: failure.metadata,
        },
        true,
      );
    }
  };
}
