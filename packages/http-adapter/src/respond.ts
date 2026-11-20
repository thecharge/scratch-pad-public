import { unauthenticatedResponse } from "@platform/auth";
import {
  CanonicalCode,
  ErrorMetadataKey,
  ErrorReason,
  HttpHeader,
  METHOD_NOT_ALLOWED_STATUS,
  MessageId,
  RouteOutcome,
  Separator,
} from "@platform/constants";
import { ApiError, toApiError } from "@platform/errors";
import { jsonResponse } from "@platform/streams";
import type { ChallengeOptions, RouteMatch } from "@platform/types";

async function retryHeaders(error: ApiError): Promise<Headers> {
  const headers = new Headers();
  const seconds = error.metadata[ErrorMetadataKey.RetryAfterSeconds];
  if (seconds !== undefined) {
    headers.set(HttpHeader.RetryAfter, seconds);
  }
  return headers;
}

export async function errorResponse(error: unknown, options: ChallengeOptions): Promise<Response> {
  const apiError = await toApiError(error);
  if (apiError.code === CanonicalCode.Unauthenticated) {
    return unauthenticatedResponse(apiError, options);
  }
  return jsonResponse(
    apiError.httpStatus,
    await apiError.toBody(options.domain),
    await retryHeaders(apiError),
  );
}

async function notFound(reason: ErrorReason, messageId: MessageId, params: Record<string, string>) {
  return new ApiError(CanonicalCode.NotFound, reason, messageId, params);
}

async function methodNotAllowed(match: RouteMatch, method: string, path: string, domain: string) {
  const error = new ApiError(
    CanonicalCode.FailedPrecondition,
    ErrorReason.MethodNotAllowed,
    MessageId.MethodNotAllowed,
    { method, path },
  );
  const body = await error.toBody(domain);
  body.error.code = METHOD_NOT_ALLOWED_STATUS;
  const headers = new Headers({
    [HttpHeader.Allow]: [...new Set(match.allowed)].join(Separator.ListSpaced),
  });
  return jsonResponse(METHOD_NOT_ALLOWED_STATUS, body, headers);
}

export async function routingFailure(
  match: RouteMatch,
  request: Request,
  options: ChallengeOptions,
): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (match.outcome === RouteOutcome.WrongMethod) {
    return methodNotAllowed(match, request.method, path, options.domain);
  }
  const error =
    match.outcome === RouteOutcome.UnknownVerb
      ? await notFound(ErrorReason.UnknownVerb, MessageId.UnknownVerb, {
          verb: match.verb ?? path,
          path,
        })
      : await notFound(ErrorReason.ResourceNotFound, MessageId.RouteNotFound, { path });
  return errorResponse(error, options);
}
