import { ConsoleStorageKey, OAuthParam } from "@platform/constants";
import type { ConsoleConfig, TokenStore } from "@platform/types";
import type { AuthProvider } from "@refinedev/core";
import { claimsOf, hasAdminScope } from "./claims.ts";
import { authorizeUrl, createChallenge, exchangeCode, rememberChallenge } from "./pkce.ts";

export function createAuthProvider(
  config: ConsoleConfig,
  tokens: TokenStore,
  navigate: (url: string) => Promise<void> = async (url) => globalThis.location.assign(url),
): AuthProvider {
  return {
    login: async () => {
      const pkce = await createChallenge();
      await rememberChallenge(pkce);
      await navigate(await authorizeUrl(config, pkce));
      return { success: true };
    },
    logout: async () => {
      tokens.clear();
      return { success: true };
    },
    check: async () => ({ authenticated: hasAdminScope(tokens.get()) }),
    onError: async () => ({ logout: true }),
    getIdentity: async () => claimsOf(tokens.get()),
  };
}

export async function completeLogin(
  config: ConsoleConfig,
  tokens: TokenStore,
  search: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const params = new URLSearchParams(search);
  const code = params.get(OAuthParam.Code);
  const verifier = sessionStorage.getItem(ConsoleStorageKey.Verifier);
  const expected = sessionStorage.getItem(ConsoleStorageKey.State);
  if (code === null || verifier === null || params.get(OAuthParam.State) !== expected) {
    return false;
  }
  tokens.set(await exchangeCode(config, code, verifier, fetcher));
  sessionStorage.removeItem(ConsoleStorageKey.Verifier);
  sessionStorage.removeItem(ConsoleStorageKey.State);
  return true;
}
