import {
  DOC_CATEGORY_MESSAGES,
  DOCS_TOKEN_PLACEHOLDER,
  MessageId,
  StepFlag,
  StepSource,
  Surface,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { RecordedPage, StepResult, SurfaceUrls } from "@platform/types";
import { scopesOf } from "./concrete.ts";
import { renderStep } from "./render.ts";

function addressLines(results: readonly StepResult[], urls: SurfaceUrls): string[] {
  const sources = new Set(results.map((result) => result.source));
  return [
    ...(sources.has(StepSource.Console)
      ? [message(MessageId.RequirementAddress, { surface: Surface.Console, url: urls.console })]
      : []),
    ...(sources.has(StepSource.Http)
      ? [message(MessageId.RequirementAddress, { surface: Surface.Api, url: urls.api })]
      : []),
    ...(sources.has(StepSource.Mcp)
      ? [message(MessageId.RequirementAddress, { surface: Surface.Mcp, url: urls.mcp })]
      : []),
  ];
}

function prerequisites(results: readonly StepResult[], urls: SurfaceUrls | undefined): string {
  const scopes = scopesOf(results);
  const token =
    scopes.length === 0
      ? []
      : [message(MessageId.RequirementToken, { scopes, placeholder: DOCS_TOKEN_PLACEHOLDER })];
  const lines = [...(urls === undefined ? [] : addressLines(results, urls)), ...token];
  return lines.length === 0 ? message(MessageId.RequirementNone) : lines.join(Text.Empty);
}

export function toMdx(page: RecordedPage, urls?: SurfaceUrls): string {
  const passed = page.results.filter((result) => result.flag === StepFlag.Passed).length;
  return message(MessageId.KbPage, {
    title: JSON.stringify(page.title),
    intent: JSON.stringify(page.intent),
    summary: message(MessageId.PageSummary, {
      category: message(DOC_CATEGORY_MESSAGES[page.category]),
      count: page.results.length,
      passed,
    }),
    prerequisites: prerequisites(page.results, urls),
    sections: page.results.map((result) => renderStep(result, urls)).join(Text.Empty),
    troubleshooting: message(MessageId.TroubleshootingLinks),
    intro: page.intent,
  });
}
