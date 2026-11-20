import { createJwksProvider } from "@platform/auth";
import { AuthProviderKind, BetterAuthPath, Scope, Text } from "@platform/constants";
import type { AuthConfig, AuthProvider } from "@platform/types";
import { createLocalJWKSet, errors, type JSONWebKeySet, type JWTVerifyGetKey } from "jose";
import type { createBetterAuth } from "./create-auth.ts";

export async function betterAuthIssuer(resource: string): Promise<string> {
  return [new URL(resource).origin, BetterAuthPath.Base].join(Text.Empty);
}

export async function betterAuthKeys(
  auth: ReturnType<typeof createBetterAuth>,
): Promise<JWTVerifyGetKey> {
  let cached: JWTVerifyGetKey | undefined;
  const load = async (): Promise<JWTVerifyGetKey> => {
    cached = createLocalJWKSet((await auth.api.getJwks()) as JSONWebKeySet);
    return cached;
  };
  return async (header, token) => {
    const keys = cached ?? (await load());
    return Promise.resolve(keys(header, token)).catch(async (error: unknown) => {
      if (error instanceof errors.JWKSNoMatchingKey) {
        return (await load())(header, token);
      }
      throw error;
    });
  };
}

export async function createBetterAuthProvider(
  auth: ReturnType<typeof createBetterAuth>,
  config: AuthConfig,
): Promise<AuthProvider> {
  return createJwksProvider({
    kind: AuthProviderKind.BetterAuth,
    issuer: config.issuer ?? (await betterAuthIssuer(config.resource)),
    audience: config.resource,
    resource: config.resource,
    keys: await betterAuthKeys(auth),
    scopesSupported: Object.values(Scope),
  });
}
