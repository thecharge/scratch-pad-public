import {
  BASE64URL_ENCODING,
  ConsoleAuthPath,
  HashAlgorithm,
  HTTP_BAD_REQUEST,
  OAUTH_ERROR,
  OAUTH_INVALID_GRANT,
  OAUTH_TOKEN_TYPE_FIELD,
  OAuthParam,
  OAuthValue,
  STUB_CODE_BYTES,
  STUB_CODE_TTL_MS,
  STUB_MAX_CODES,
  Text,
  TOKEN_TYPE,
} from "@platform/constants";
import { BoundedStore } from "@platform/store";
import { Hono } from "hono";

function challengeOf(verifier: string): string {
  return new Bun.CryptoHasher(HashAlgorithm.Sha256).update(verifier).digest(BASE64URL_ENCODING);
}

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(STUB_CODE_BYTES));
  return Buffer.from(bytes).toString(BASE64URL_ENCODING);
}

export function stubAuthApp(accessToken: string): Hono {
  const challenges = new BoundedStore<string>({
    maxEntries: STUB_MAX_CODES,
    ttlMs: STUB_CODE_TTL_MS,
  });
  const app = new Hono();
  app.get(ConsoleAuthPath.Authorize, async (context) => {
    const query = context.req.query();
    const valid =
      query[OAuthParam.CodeChallengeMethod] === OAuthValue.S256 &&
      query[OAuthParam.ResponseType] === OAuthValue.Code;
    if (!valid) {
      return context.json({ [OAUTH_ERROR]: OAUTH_INVALID_GRANT }, HTTP_BAD_REQUEST);
    }
    const code = newCode();
    await challenges.set(code, query[OAuthParam.CodeChallenge] ?? Text.Empty);
    const target = new URL(query[OAuthParam.RedirectUri] ?? Text.Empty);
    target.searchParams.set(OAuthParam.Code, code);
    target.searchParams.set(OAuthParam.State, query[OAuthParam.State] ?? Text.Empty);
    return context.redirect(target.toString());
  });
  app.post(ConsoleAuthPath.Token, async (context) => {
    const form = await context.req.parseBody();
    const code = String(form[OAuthParam.Code]);
    const expected = await challenges.get(code);
    await challenges.delete(code);
    const verifier = String(form[OAuthParam.CodeVerifier]);
    if (expected === undefined || challengeOf(verifier) !== expected) {
      return context.json({ [OAUTH_ERROR]: OAUTH_INVALID_GRANT }, HTTP_BAD_REQUEST);
    }
    return context.json({
      [OAuthParam.AccessToken]: accessToken,
      [OAUTH_TOKEN_TYPE_FIELD]: TOKEN_TYPE,
    });
  });
  return app;
}
