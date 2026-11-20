import {
  CheckKind,
  DOCS_HIGHLIGHT_MAX_CHARACTERS,
  HttpHeader,
  MARKDOWN_JSON_FENCE,
  MARKDOWN_TEXT_FENCE,
  MediaType,
  MessageId,
  StepFlag,
  StepSource,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { CheckResult, StepResult, SurfaceUrls } from "@platform/types";
import { concreteRequest, consoleUrl } from "./concrete.ts";
import { scrubSecrets } from "./scrub.ts";

const FLAG_LABELS: Readonly<Record<StepFlag, MessageId>> = {
  [StepFlag.Passed]: MessageId.StepFlagPassed,
  [StepFlag.Failed]: MessageId.StepFlagFailed,
};

const SOURCE_LABELS: Readonly<Record<StepSource, MessageId>> = {
  [StepSource.Console]: MessageId.SourceConsole,
  [StepSource.Http]: MessageId.SourceHttp,
  [StepSource.Mcp]: MessageId.SourceMcp,
  [StepSource.Sdk]: MessageId.SourceSdk,
};

const REQUEST_LABELS: Readonly<Record<StepSource, MessageId>> = {
  [StepSource.Console]: MessageId.StepRequestHttp,
  [StepSource.Http]: MessageId.StepRequestHttp,
  [StepSource.Mcp]: MessageId.StepRequestMcp,
  [StepSource.Sdk]: MessageId.StepRequestSdk,
};

const RESPONSE_LABELS: Readonly<Record<StepSource, MessageId>> = {
  [StepSource.Console]: MessageId.StepResponseHttp,
  [StepSource.Http]: MessageId.StepResponseHttp,
  [StepSource.Mcp]: MessageId.StepResponseMcp,
  [StepSource.Sdk]: MessageId.StepResponseSdk,
};

function flagText(flag: StepFlag): string {
  return message(FLAG_LABELS[flag]);
}

function checkLine(check: CheckResult): string {
  const flag = check.passed ? StepFlag.Passed : StepFlag.Failed;
  return message(MessageId.StepCheckItem, { flag: flagText(flag), label: check.label });
}

function checksSection(result: StepResult): string {
  return result.checks.length === 0
    ? Text.Empty
    : message(MessageId.StepChecks, { items: result.checks.map(checkLine).join(Text.Empty) });
}

function outcomeSection(result: StepResult): string {
  const { expected, actual } = result.evidence;
  return expected === undefined || actual === undefined
    ? Text.Empty
    : message(MessageId.StepExpected, { expected, actual });
}

function requestSection(result: StepResult, urls?: SurfaceUrls): string {
  const concrete = urls === undefined ? undefined : concreteRequest(result, urls);
  if (concrete !== undefined) {
    return concrete.length > DOCS_HIGHLIGHT_MAX_CHARACTERS
      ? concrete.replaceAll(MARKDOWN_JSON_FENCE, MARKDOWN_TEXT_FENCE)
      : concrete;
  }
  const { request, requestBody, note } = result.evidence;
  const head =
    request === undefined
      ? Text.Empty
      : message(REQUEST_LABELS[result.source], { request: scrubSecrets(request) });
  const body =
    requestBody === undefined
      ? Text.Empty
      : message(MessageId.StepBody, { body: scrubSecrets(requestBody) });
  return [head, body, note ?? Text.Empty]
    .join(Text.Empty)
    .replaceAll(
      MARKDOWN_JSON_FENCE,
      (note ?? Text.Empty).length > DOCS_HIGHLIGHT_MAX_CHARACTERS
        ? MARKDOWN_TEXT_FENCE
        : MARKDOWN_JSON_FENCE,
    );
}

function challengeSection(result: StepResult): string {
  const { challenge } = result.evidence;
  return challenge === undefined ? Text.Empty : message(MessageId.StepChallenge, { challenge });
}

function labelFor(result: StepResult): MessageId {
  const accept = result.evidence.headers?.[HttpHeader.Accept];
  if (accept === MediaType.OctetStream) return MessageId.StepResponseBinary;
  const streamed =
    result.source !== StepSource.Console &&
    (accept === MediaType.EventStream ||
      result.checks.some((check) => check.kind === CheckKind.Stream));
  return streamed ? MessageId.StepResponseStream : RESPONSE_LABELS[result.source];
}

function responseSection(result: StepResult): string {
  const { response, outcome } = result.evidence;
  return response === undefined
    ? Text.Empty
    : [
        message(labelFor(result), {
          outcome: outcome ?? Text.Empty,
          response: scrubSecrets(response),
        }).replace(
          MARKDOWN_JSON_FENCE,
          response.length > DOCS_HIGHLIGHT_MAX_CHARACTERS
            ? MARKDOWN_TEXT_FENCE
            : MARKDOWN_JSON_FENCE,
        ),
        challengeSection(result),
      ].join(Text.Empty);
}

function screenshotSection(result: StepResult): string {
  const { screenshot } = result.evidence;
  return screenshot === undefined
    ? Text.Empty
    : message(MessageId.StepScreenshot, { description: result.description, url: screenshot });
}

function guideSection(result: StepResult, urls?: SurfaceUrls): string {
  return [
    message(MessageId.StepWhere, { place: result.place }),
    urls === undefined ? Text.Empty : consoleUrl(result, urls),
    message(MessageId.StepAction, { action: result.action }),
    message(MessageId.StepExpectation, { expectation: result.expectation }),
  ].join(Text.Empty);
}

export function renderStep(result: StepResult, urls?: SurfaceUrls): string {
  return [
    message(MessageId.StepHeading, {
      source: message(SOURCE_LABELS[result.source]),
      description: result.description,
    }),
    message(MessageId.StepFlagLine, { flag: flagText(result.flag) }),
    guideSection(result, urls),
    checksSection(result),
    outcomeSection(result),
    requestSection(result, urls),
    responseSection(result),
    screenshotSection(result),
  ].join(Text.Empty);
}
