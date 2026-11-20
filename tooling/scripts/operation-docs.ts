import {
  DEFAULT_STATUS,
  EXCHANGE_BODY_INDENT,
  MessageId,
  OPENAPI_STABILITY_KEY,
  OutcomeLabel,
  Separator,
  StepFlag,
  StepSource,
  SUCCESS_STATUS,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { LiveTool, OpenApiEntry, StepResult } from "@platform/types";
import { all } from "@platform/util";
import { reasonsIn } from "./check-error-cases.ts";

async function none(items: readonly string[]): Promise<string> {
  return items.length === 0 ? message(MessageId.WordNone) : items.join(Separator.ListSpaced);
}

async function bodyBlock(result: StepResult): Promise<string> {
  const { requestBody, note } = result.evidence;
  return requestBody === undefined
    ? Text.Empty
    : `${message(MessageId.StepBody, { body: requestBody })}${note ?? Text.Empty}`;
}

async function mcpBlock(result: StepResult | undefined): Promise<string> {
  return result === undefined
    ? Text.Empty
    : message(MessageId.OperationOverMcp, {
        request: result.evidence.request ?? Text.Empty,
        outcome: result.evidence.outcome ?? Text.Empty,
        response: result.evidence.response ?? Text.Empty,
      });
}

async function example(result: StepResult, results: readonly StepResult[]): Promise<string> {
  const counterpart = results.find(
    (candidate) =>
      candidate.source === StepSource.Mcp &&
      candidate.capability === result.capability &&
      candidate.description === result.description,
  );
  return message(MessageId.OperationExample, {
    description: result.description,
    flag:
      result.flag === StepFlag.Passed
        ? message(MessageId.StepFlagPassed)
        : message(MessageId.StepFlagFailed),
    request: result.evidence.request ?? Text.Empty,
    body: await bodyBlock(result),
    outcome: result.evidence.outcome ?? Text.Empty,
    response: result.evidence.response ?? Text.Empty,
    mcp: await mcpBlock(counterpart),
  });
}

async function toolSection(tool: LiveTool | undefined): Promise<string> {
  return tool === undefined
    ? message(MessageId.OperationNoTool)
    : message(MessageId.OperationTool, {
        name: tool.name,
        description: tool.description,
        schema: JSON.stringify(tool.inputSchema, null, EXCHANGE_BODY_INDENT),
      });
}

async function statusesCovered(runs: readonly StepResult[]): Promise<string[]> {
  const failed = runs.some((result) => result.evidence.actual === OutcomeLabel.AnError);
  const passed = runs.some((result) => result.evidence.actual === OutcomeLabel.Success);
  return [...(passed ? [SUCCESS_STATUS] : []), ...(failed ? [DEFAULT_STATUS] : [])];
}

async function coverageSection(entry: OpenApiEntry, runs: readonly StepResult[]): Promise<string> {
  const documentedStatuses = Object.keys(entry.operation.responses);
  const covered = await statusesCovered(runs);
  const documentedReasons = [...new Set(await reasonsIn(entry.operation.responses))];
  const exercised = runs.flatMap((result) => result.evidence.reason ?? []);
  const seen = runs.map((result) => result.evidence.outcome ?? Text.Empty);
  return message(MessageId.OperationCoverage, {
    seen: await none([...new Set(seen)]),
    statuses: await none(documentedStatuses.filter((status) => !covered.includes(status))),
    reasons: await none(documentedReasons.filter((reason) => !exercised.includes(reason))),
  });
}

export async function operationBody(
  entry: OpenApiEntry,
  tool: LiveTool | undefined,
  results: readonly StepResult[],
): Promise<string> {
  const runs = results.filter(
    (result) =>
      result.capability === entry.operation.operationId && result.source === StepSource.Http,
  );
  const examples =
    runs.length === 0
      ? message(MessageId.OperationNoExamples)
      : message(MessageId.OperationExamples) +
        (await all(runs.map((result) => async () => example(result, results)))).join(Text.Empty);
  return [await toolSection(tool), examples, await coverageSection(entry, runs)].join(Text.Empty);
}

export async function stabilityOf(entry: OpenApiEntry): Promise<string> {
  return String(entry.operation[OPENAPI_STABILITY_KEY] ?? Text.Empty);
}
