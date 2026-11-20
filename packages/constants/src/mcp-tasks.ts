export const MCP_TASKS_EXTENSION = "io.modelcontextprotocol/tasks";
export const MCP_PROGRESS_METHOD = "notifications/progress";
export const MCP_TASK_GET = "tasks/get";
export const MCP_TASK_UPDATE = "tasks/update";
export const MCP_TASK_CANCEL = "tasks/cancel";

export enum McpTaskStatus {
  Working = "working",
  Completed = "completed",
  Cancelled = "cancelled",
}

export const MCP_TASK_RESULT_TYPE = "task";
export const MCP_COMPLETE_RESULT_TYPE = "complete";
export const MCP_TASK_WAIT_TIMEOUT = "0s";
export const MCP_MISSING_CAPABILITY_CODE = -32021;

export const MCP_RECORD_PATH = ".stack/e2e/mcp.json";
export const MCP_DOC_PATH = "api-calls/mcp-tasks-and-progress.mdx";
