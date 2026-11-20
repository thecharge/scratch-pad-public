import {
  BASE64_PADDING,
  BASE64_URL_PLUS,
  BASE64_URL_SLASH,
  ConsoleAuthPath,
  ConsoleStorageKey,
  DASH,
  FORM_CONTENT_TYPE,
  HttpHeader,
  HttpMethod,
  OAuthParam,
  OAuthValue,
  PKCE_BYTES,
  Scope,
  Separator,
  SHA256_NAME,
  Text,
  UNDERSCORE,
} from "@platform/constants";
import type { ConsoleConfig, PkceChallenge } from "@platform/types";
import { z } from "zod";

async function encode(bytes: Uint8Array): Promise<string> {
  return btoa(String.fromCharCode(...bytes))
    .replace(BASE64_URL_PLUS, DASH)
    .replace(BASE64_URL_SLASH, UNDERSCORE)
    .replace(BASE64_PADDING, Text.Empty);
}

async function randomText(): Promise<string> {
  return encode(crypto.getRandomValues(new Uint8Array(PKCE_BYTES)));
}

export async function createChallenge(): Promise<PkceChallenge> {
  const verifier = await randomText();
  const digest = await crypto.subtle.digest(SHA256_NAME, new TextEncoder().encode(verifier));
  return { verifier, challenge: await encode(new Uint8Array(digest)), state: await randomText() };
}

export async function authorizeUrl(config: ConsoleConfig, pkce: PkceChallenge): Promise<string> {
  const url = new URL(ConsoleAuthPath.Authorize, config.apiOrigin);
  url.search = new URLSearchParams({
    [OAuthParam.ResponseType]: OAuthValue.Code,
    [OAuthParam.ClientId]: config.clientId,
    [OAuthParam.RedirectUri]: config.redirectUri,
    [OAuthParam.Scope]: [Scope.Read, Scope.Admin].join(Separator.Space),
    [OAuthParam.State]: pkce.state,
    [OAuthParam.CodeChallenge]: pkce.challenge,
    [OAuthParam.CodeChallengeMethod]: OAuthValue.S256,
    [OAuthParam.Resource]: config.apiOrigin,
  }).toString();
  return url.toString();
}

export async function rememberChallenge(pkce: PkceChallenge): Promise<void> {
  sessionStorage.setItem(ConsoleStorageKey.Verifier, pkce.verifier);
  sessionStorage.setItem(ConsoleStorageKey.State, pkce.state);
}

export async function exchangeCode(
  config: ConsoleConfig,
  code: string,
  verifier: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const response = await fetcher(new URL(ConsoleAuthPath.Token, config.apiOrigin), {
    method: HttpMethod.Post,
    headers: { [HttpHeader.ContentType]: FORM_CONTENT_TYPE },
    body: new URLSearchParams({
      [OAuthParam.GrantType]: OAuthValue.AuthorizationCode,
      [OAuthParam.Code]: code,
      [OAuthParam.CodeVerifier]: verifier,
      [OAuthParam.ClientId]: config.clientId,
      [OAuthParam.RedirectUri]: config.redirectUri,
      [OAuthParam.Resource]: config.apiOrigin,
    }),
  });
  const body = z.object({ [OAuthParam.AccessToken]: z.string() }).parse(await response.json());
  return body[OAuthParam.AccessToken];
}
