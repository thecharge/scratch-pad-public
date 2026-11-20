import {
  AuthProviderKind,
  BearerMethod,
  CanonicalCode,
  ClaimName,
  ConfigField,
  ErrorReason,
  MessageId,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import type {
  AuthInfo,
  AuthProvider,
  JsonObject,
  JwksProviderOptions,
  ProtectedResourceMetadata,
} from "@platform/types";
import { createRemoteJWKSet, errors, type JWTVerifyGetKey, jwtVerify } from "jose";
import { scopesFromClaims } from "./principal.ts";

async function unauthenticated(reason: ErrorReason, messageId: MessageId): Promise<ApiError> {
  return new ApiError(CanonicalCode.Unauthenticated, reason, messageId);
}

async function keysFor(options: JwksProviderOptions): Promise<JWTVerifyGetKey> {
  if (options.keys !== undefined) {
    return options.keys;
  }
  if (options.jwksUrl === undefined) {
    throw new ApiError(CanonicalCode.Internal, ErrorReason.InternalError, MessageId.ConfigInvalid, {
      variables: ConfigField.JwksUrl,
    });
  }
  return createRemoteJWKSet(new URL(options.jwksUrl));
}

async function toApiError(error: unknown): Promise<ApiError> {
  if (error instanceof ApiError) {
    return error;
  }
  return error instanceof errors.JWTExpired
    ? await unauthenticated(ErrorReason.TokenExpired, MessageId.TokenExpired)
    : await unauthenticated(ErrorReason.TokenInvalid, MessageId.TokenInvalid);
}

async function authInfoFrom(
  token: string,
  claims: JsonObject,
  expiresAt: number,
  options: JwksProviderOptions,
): Promise<AuthInfo> {
  const clientId =
    claims[ClaimName.ClientId] ?? claims[ClaimName.AuthorizedParty] ?? claims[ClaimName.Subject];
  return {
    token,
    clientId: String(clientId ?? options.audience),
    scopes: await scopesFromClaims(claims),
    expiresAt,
    resource: new URL(URL.canParse(options.audience) ? options.audience : options.resource),
    extra: claims,
  };
}

export async function createJwksProvider(options: JwksProviderOptions): Promise<AuthProvider> {
  const keys = await keysFor(options);

  return {
    kind: options.kind ?? AuthProviderKind.Jwks,
    async verify(token): Promise<AuthInfo> {
      try {
        const { payload } = await jwtVerify(token, keys, {
          issuer: options.issuer,
          audience: options.audience,
        });
        if (payload.exp === undefined) {
          throw await unauthenticated(ErrorReason.TokenInvalid, MessageId.TokenInvalid);
        }
        return await authInfoFrom(token, payload as JsonObject, payload.exp, options);
      } catch (error) {
        throw await toApiError(error);
      }
    },
    async resourceMetadata(): Promise<ProtectedResourceMetadata> {
      return {
        resource: options.resource,
        authorization_servers: [options.issuer],
        bearer_methods_supported: [BearerMethod.Header],
        ...(options.scopesSupported === undefined
          ? {}
          : { scopes_supported: options.scopesSupported }),
      };
    },
  };
}
