import {
  AuthScheme,
  CanonicalCode,
  ErrorReason,
  Glyph,
  HttpHeader,
  MessageId,
} from "@platform/constants";
import { ApiError, toApiError } from "@platform/errors";
import { ANONYMOUS_PRINCIPAL, type AuthOptions, type AuthResolution } from "@platform/types";
import { principalFromAuthInfo } from "./principal.ts";

export async function bearerTokenFrom(headers: Headers): Promise<string | undefined> {
  const value = headers.get(HttpHeader.Authorization);
  const separator = value?.indexOf(Glyph.Space) ?? -1;
  if (value === null || separator < 0) {
    return undefined;
  }
  const scheme = value.slice(0, separator).toLowerCase();
  const token = value.slice(separator + 1).trim();
  return scheme === AuthScheme.Bearer.toLowerCase() && token.length > 0 ? token : undefined;
}

async function authenticationFailure(error: unknown): Promise<ApiError> {
  const apiError = await toApiError(error);
  return apiError.code === CanonicalCode.Unauthenticated
    ? apiError
    : new ApiError(CanonicalCode.Unauthenticated, ErrorReason.TokenInvalid, MessageId.TokenInvalid);
}

export async function resolveAuth(headers: Headers, options: AuthOptions): Promise<AuthResolution> {
  const token = options.enabled ? await bearerTokenFrom(headers) : undefined;
  if (token === undefined || options.provider === undefined) {
    return { principal: ANONYMOUS_PRINCIPAL, tokenPresented: false };
  }
  try {
    const authInfo = await options.provider.verify(token);
    return { principal: await principalFromAuthInfo(authInfo), authInfo, tokenPresented: true };
  } catch (error) {
    return {
      principal: ANONYMOUS_PRINCIPAL,
      failure: await (await authenticationFailure(error)).toFailure(),
      tokenPresented: true,
    };
  }
}
