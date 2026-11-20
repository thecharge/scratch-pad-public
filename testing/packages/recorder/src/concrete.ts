import {
  AuthScheme,
  CURL_JOIN,
  DOCS_TOKEN_PLACEHOLDER,
  Glyph,
  HttpHeader,
  JSONRPC_ID,
  JSONRPC_VERSION,
  McpMethod,
  MEDIA_PARAM_SEPARATOR,
  MediaType,
  MessageId,
  Separator,
  SHELL_QUOTE,
  SHELL_QUOTE_ESCAPE,
  StepSource,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { Evidence, StepResult, SurfaceUrls } from "@platform/types";
import { scrubSecrets } from "./scrub.ts";

const PRETTY_INDENT = 2;

function quoted(value: string): string {
  return value.replace(SHELL_QUOTE, SHELL_QUOTE_ESCAPE);
}

function compact(body: string): string {
  return JSON.stringify(JSON.parse(body));
}

function headerLines(evidence: Evidence): string[] {
  const token = evidence.authorized === true ? [authorization()] : [];
  const fixed =
    evidence.headers?.[HttpHeader.ContentType] === undefined
      ? [[HttpHeader.ContentType, MediaType.Json]]
      : [];
  const extra = Object.entries(evidence.headers ?? {});
  return [...token, ...[...fixed, ...extra].map(([name, value]) => pair(name, value))];
}

function authorization(): string {
  return pair(
    HttpHeader.Authorization,
    [AuthScheme.Bearer, DOCS_TOKEN_PLACEHOLDER].join(Glyph.Space),
  );
}

function pair(name: string | undefined, value: string | undefined): string {
  return message(MessageId.CurlHeader, { name: name ?? Text.Empty, value: value ?? Text.Empty });
}

function bodyData(evidence: Evidence): string[] {
  if (evidence.requestBody === undefined) return [];
  const mediaType = evidence.headers?.[HttpHeader.ContentType] ?? MediaType.Json;
  const json = mediaType.split(MEDIA_PARAM_SEPARATOR)[0]?.trim() === MediaType.Json;
  const body = json ? compact(evidence.requestBody) : evidence.requestBody;
  return [message(json ? MessageId.CurlData : MessageId.CurlRawData, { body: quoted(body) })];
}

function curlOf(evidence: Evidence, urls: SurfaceUrls): string {
  const start = message(MessageId.CurlStart, {
    method: evidence.method ?? Text.Empty,
    url: quoted([urls.api, evidence.path ?? Text.Empty].join(Text.Empty)),
  });
  const data = bodyData(evidence);
  const binary =
    evidence.requestBodyFile === undefined
      ? []
      : [message(MessageId.CurlBinaryData, { file: quoted(evidence.requestBodyFile) })];
  return [start, ...headerLines(evidence), ...data, ...binary].join(CURL_JOIN);
}

function rpcOf(evidence: Evidence): string {
  if (evidence.rpc !== undefined) return JSON.stringify(evidence.rpc, null, PRETTY_INDENT);
  const params = { name: evidence.tool, arguments: evidence.args ?? {} };
  const request = { jsonrpc: JSONRPC_VERSION, id: JSONRPC_ID, method: McpMethod.ToolsCall, params };
  return JSON.stringify(request, null, PRETTY_INDENT);
}

function mcpRequest(evidence: Evidence, urls: SurfaceUrls): string {
  const header =
    evidence.authorized === true
      ? message(MessageId.McpAuthHeader, { token: DOCS_TOKEN_PLACEHOLDER })
      : Text.Empty;
  return [
    message(MessageId.McpEndpoint, { url: urls.mcp }),
    header,
    message(MessageId.McpRpc, { request: scrubSecrets(rpcOf(evidence)) }),
    evidence.note ?? Text.Empty,
  ].join(Text.Empty);
}

function isCall(result: StepResult): boolean {
  return result.evidence.method !== undefined && result.evidence.path !== undefined;
}

export function concreteRequest(result: StepResult, urls: SurfaceUrls): string | undefined {
  if (result.source === StepSource.Mcp) {
    return mcpRequest(result.evidence, urls);
  }
  return isCall(result)
    ? message(MessageId.StepCurl, {
        command: scrubSecrets(curlOf(result.evidence, urls)),
      }) + (result.evidence.note ?? Text.Empty)
    : undefined;
}

export function consoleUrl(result: StepResult, urls: SurfaceUrls): string {
  const { pagePath } = result.evidence;
  return result.source === StepSource.Console && pagePath !== undefined
    ? message(MessageId.StepUrl, { url: `${urls.console}${pagePath}` })
    : Text.Empty;
}

export function scopesOf(results: readonly StepResult[]): string {
  const all = results.flatMap((result) => result.evidence.scopes ?? []);
  return [...new Set(all)].join(Separator.ListSpaced);
}
