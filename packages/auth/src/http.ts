import {
  AuthParam,
  AuthScheme,
  AuthVariable,
  CanonicalCode,
  ErrorReason,
  Glyph,
  HttpHeader,
  MessageId,
  OAuthErrorCode,
  PROTECTED_RESOURCE_WELL_KNOWN,
  Separator,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { jsonResponse } from "@platform/streams";
import type { AuthEnv, AuthOptions, AuthProvider, ChallengeOptions } from "@platform/types";
import { Hono, type MiddlewareHandler } from "hono";
import { resolveAuth } from "./resolve.ts";

export async function authMiddleware(options: AuthOptions): Promise<MiddlewareHandler<AuthEnv>> {
  return async (context, next) => {
    const resolution = await resolveAuth(context.req.raw.headers, options);
    context.set(AuthVariable.Principal, resolution.principal);
    context.set(AuthVariable.Resolution, resolution);
    await next();
  };
}

export async function metadataPath(resource: string): Promise<string> {
  const { pathname } = new URL(resource);
  const trimmed = pathname.endsWith(Separator.Resource) ? pathname.slice(0, -1) : pathname;
  return [PROTECTED_RESOURCE_WELL_KNOWN, trimmed].join(Text.Empty);
}

export async function metadataUrl(resource: string): Promise<string> {
  return new URL(await metadataPath(resource), new URL(resource).origin).toString();
}

async function quoted(value: string): Promise<string> {
  return [Glyph.DoubleQuote, value, Glyph.DoubleQuote].join(Text.Empty);
}

async function parameter(name: AuthParam, value: string): Promise<string> {
  return [name, await quoted(value)].join(Glyph.Equals);
}

export async function challengeFor(resource: string, tokenPresented: boolean): Promise<string> {
  const parameters = [await parameter(AuthParam.ResourceMetadata, await metadataUrl(resource))];
  if (tokenPresented) {
    parameters.push(await parameter(AuthParam.Error, OAuthErrorCode.InvalidToken));
  }
  return [AuthScheme.Bearer, parameters.join(Separator.List + Glyph.Space)].join(Glyph.Space);
}

export async function unauthenticatedResponse(
  error: ApiError,
  options: ChallengeOptions,
): Promise<Response> {
  return jsonResponse(
    error.httpStatus,
    await error.toBody(options.domain),
    new Headers({
      [HttpHeader.WwwAuthenticate]: await challengeFor(options.resource, options.tokenPresented),
    }),
  );
}

export async function missingTokenError(): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.Unauthenticated,
    ErrorReason.TokenMissing,
    MessageId.TokenMissing,
  );
}

export async function protectedResourceMetadataApp(provider: AuthProvider): Promise<Hono> {
  const app = new Hono();
  const metadata = await provider.resourceMetadata();
  app.get(await metadataPath(metadata.resource), (context) => context.json(metadata));
  return app;
}
