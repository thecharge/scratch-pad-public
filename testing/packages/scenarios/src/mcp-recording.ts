import { CheckKind, DocCategory, StepFlag, StepSource } from "@platform/constants";
import {
  type Exchange,
  JsonObjectSchema,
  type RecordedPage,
  type StepResult,
} from "@platform/types";

async function recordedExchange(exchange: Exchange): Promise<StepResult> {
  const rpc = JsonObjectSchema.parse(JSON.parse(exchange.requestBody ?? "{}"));
  const streaming = exchange.response.startsWith("event:");
  const checks = exchange.checks ?? [
    {
      kind: CheckKind.Outcome,
      label: `The request returned HTTP ${exchange.status} and passed the client assertions.`,
      passed: !exchange.failed,
    },
  ];
  const headers = JSON.stringify(exchange.headers ?? {}, null, 2);
  return {
    source: StepSource.Mcp,
    description: exchange.description,
    flag:
      exchange.failed || checks.some((check) => !check.passed) ? StepFlag.Failed : StepFlag.Passed,
    place: exchange.request,
    action: exchange.description,
    expectation: "The response matches the checks below.",
    checks: streaming
      ? [
          ...checks,
          { kind: CheckKind.Stream, label: "The client read the event stream.", passed: true },
        ]
      : checks,
    evidence: {
      rpc,
      authorized: exchange.authorized,
      scopes: exchange.authorized ? ["read", "write", "admin"] : [],
      note: `Request headers:\n\n\`\`\`json\n${headers}\n\`\`\`\n\n${exchange.note ?? ""}`,
      response: exchange.response,
      outcome: `HTTP ${exchange.status}`,
      challenge: exchange.challenge,
    },
  };
}

export async function mcpRecordedPage(exchanges: readonly Exchange[]): Promise<RecordedPage> {
  const results: StepResult[] = [];
  for (const exchange of exchanges) results.push(await recordedExchange(exchange));
  return {
    id: "mcp-tasks-and-progress",
    title: "Follow MCP tasks and progress",
    intent:
      "Declare the Tasks extension to receive a task handle. Poll or cancel the task, or receive progress while waiting. Read skills and follow resource updates through the same endpoint.",
    category: DocCategory.ApiCalls,
    results,
  };
}
