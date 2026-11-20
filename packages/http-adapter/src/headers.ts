import { collectionOf } from "@platform/aip";
import {
  ACCEPT_ANY,
  BODY_MEDIA_TYPES,
  CanonicalCode,
  EMPTY_BODY_LENGTH,
  ErrorMetadataKey,
  ErrorReason,
  HttpHeader,
  HttpMethod,
  MEDIA_PARAM_SEPARATOR,
  MEDIA_QUALITY_PREFIX,
  MEDIA_RANGE_SEPARATOR,
  MEDIA_SUBTYPE_WILDCARD,
  MediaType,
  MessageId,
  Separator,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { filterAsync } from "@platform/store";
import type { Capability, RouteSpec } from "@platform/types";
import { all } from "@platform/util";

const NO_BODY: readonly HttpMethod[] = [HttpMethod.Get, HttpMethod.Delete];

async function isRefused(param: string): Promise<boolean> {
  return (
    param.startsWith(MEDIA_QUALITY_PREFIX) && Number(param.slice(MEDIA_QUALITY_PREFIX.length)) === 0
  );
}

async function acceptedRanges(header: string): Promise<string[]> {
  const ranges = header
    .split(MEDIA_RANGE_SEPARATOR)
    .map((range) => range.split(MEDIA_PARAM_SEPARATOR).map((part) => part.trim()));
  const kept = await filterAsync(
    ranges,
    async ([, ...params]) =>
      !(await all(params.map((param) => async () => isRefused(param)))).some(Boolean),
  );
  return kept
    .map(([type]) => (type ?? Text.Empty).toLowerCase())
    .filter((type) => type !== Text.Empty);
}

async function matches(range: string, offered: string): Promise<boolean> {
  return (
    range === ACCEPT_ANY ||
    range === offered ||
    (range.endsWith(MEDIA_SUBTYPE_WILDCARD) && offered.startsWith(range.slice(0, -1)))
  );
}

async function servedBy(ranges: readonly string[], offered: string): Promise<boolean> {
  return (await all(ranges.map((range) => async () => matches(range, offered)))).some(Boolean);
}

async function refusal(
  code: CanonicalCode,
  reason: ErrorReason,
  messageId: MessageId,
  params: Record<string, string>,
): Promise<ApiError> {
  return new ApiError(code, reason, messageId, params, {
    [ErrorMetadataKey.Header]: params.header ?? Text.Empty,
  });
}

export async function requireAccept(request: Request, capability: Capability): Promise<void> {
  const offered: string[] =
    capability.events === undefined ? [MediaType.Json] : [MediaType.Json, MediaType.EventStream];
  const received = request.headers.get(HttpHeader.Accept);
  const params = { header: HttpHeader.Accept, offered: offered.join(Separator.ListSpaced) };
  if (received === null || received.trim() === Text.Empty) {
    throw await refusal(
      CanonicalCode.InvalidArgument,
      ErrorReason.AcceptRequired,
      MessageId.AcceptRequired,
      params,
    );
  }
  const ranges = await acceptedRanges(received);
  const served = await all(offered.map((type) => async () => servedBy(ranges, type)));
  if (!served.some(Boolean)) {
    throw await refusal(
      CanonicalCode.FailedPrecondition,
      ErrorReason.AcceptUnsupported,
      MessageId.AcceptUnsupported,
      { ...params, received },
    );
  }
}

export async function requireContentType(
  request: Request,
  route: RouteSpec,
  capability: Capability,
): Promise<void> {
  const hasBody =
    !NO_BODY.includes(route.method) &&
    request.body !== null &&
    request.headers.get(HttpHeader.ContentLength) !== EMPTY_BODY_LENGTH;
  if (!hasBody) {
    return;
  }
  const received = request.headers.get(HttpHeader.ContentType);
  const accepted: readonly string[] =
    capability.media?.mediaTypes ??
    ((await collectionOf(capability.input)) === undefined ? [MediaType.Json] : BODY_MEDIA_TYPES);
  const params = {
    header: HttpHeader.ContentType,
    offered: accepted.join(Separator.ListSpaced),
  };
  if (received === null || received.trim() === Text.Empty) {
    throw await refusal(
      CanonicalCode.InvalidArgument,
      ErrorReason.ContentTypeRequired,
      MessageId.ContentTypeRequired,
      params,
    );
  }
  const type = (received.split(MEDIA_PARAM_SEPARATOR)[0] ?? Text.Empty).trim().toLowerCase();
  if (!accepted.includes(type)) {
    throw await refusal(
      CanonicalCode.FailedPrecondition,
      ErrorReason.ContentTypeUnsupported,
      MessageId.ContentTypeUnsupported,
      { ...params, received },
    );
  }
}
