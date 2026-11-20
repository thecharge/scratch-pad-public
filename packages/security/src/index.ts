import { timingSafeEqual } from "node:crypto";
import {
  CanonicalCode,
  DIGEST_ALGORITHM,
  ErrorMetadataKey,
  ErrorReason,
  HttpHeader,
  MessageId,
  SecurityHeaderValue,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { jsonResponse } from "@platform/streams";
import type { OriginOptions, ProxyMarkerOptions } from "@platform/types";
import type { MiddlewareHandler } from "hono";
import { secureHeaders } from "hono/secure-headers";

export async function securityHeaders(): Promise<MiddlewareHandler> {
  return secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: [SecurityHeaderValue.CspNone],
      frameAncestors: [SecurityHeaderValue.CspNone],
    },
    xFrameOptions: SecurityHeaderValue.FrameDeny,
    referrerPolicy: SecurityHeaderValue.NoReferrer,
    strictTransportSecurity: SecurityHeaderValue.Hsts,
    xContentTypeOptions: SecurityHeaderValue.NoSniff,
  });
}

async function notAllowed(origin: string): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.PermissionDenied,
    ErrorReason.OriginNotAllowed,
    MessageId.OriginNotAllowed,
    { origin },
    { [ErrorMetadataKey.Origin]: origin },
  );
}

export async function originValidation(options: OriginOptions): Promise<MiddlewareHandler> {
  const allowed = new Set(options.allowedOrigins);
  return async (context, next) => {
    const origin = context.req.header(HttpHeader.Origin);
    if (origin === undefined || allowed.has(origin)) {
      await next();
      return;
    }
    const error = await notAllowed(origin);
    return jsonResponse(error.httpStatus, await error.toBody(options.domain));
  };
}

async function digestOf(value: string): Promise<Buffer> {
  return Buffer.from(await crypto.subtle.digest(DIGEST_ALGORITHM, new TextEncoder().encode(value)));
}

async function missingMarker(): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.PermissionDenied,
    ErrorReason.ProxyRequired,
    MessageId.ProxyRequired,
    { header: HttpHeader.ProxyMarker },
    { [ErrorMetadataKey.Header]: HttpHeader.ProxyMarker },
  );
}

export async function proxyMarker(options: ProxyMarkerOptions): Promise<MiddlewareHandler> {
  const expected = await digestOf(options.secret);
  return async (context, next) => {
    const received = context.req.header(HttpHeader.ProxyMarker) ?? Text.Empty;
    if (timingSafeEqual(await digestOf(received), expected)) {
      await next();
      return;
    }
    const error = await missingMarker();
    return jsonResponse(error.httpStatus, await error.toBody(options.domain));
  };
}
