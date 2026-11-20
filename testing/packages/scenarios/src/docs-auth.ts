import {
  betterAuthApp,
  betterAuthIssuer,
  betterAuthKeys,
  createBetterAuth,
  createBetterAuthProvider,
} from "@platform/auth-better-auth";
import { loadConfig } from "@platform/config";
import { KB_CLIENT_REDIRECT } from "@platform/config/urls";
import {
  BASE64_ENCODING,
  BASIC_SCHEME,
  BetterAuthEndpoint,
  BetterAuthPath,
  CLIENT_CREDENTIALS_GRANT,
  CLIENT_SECRET_BASIC,
  ClaimName,
  EnvVar,
  FORM_MEDIA_TYPE,
  Glyph,
  HttpHeader,
  HttpMethod,
  KB_ADMIN_EMAIL,
  KB_ADMIN_NAME,
  KB_ADMIN_PASSWORD,
  KB_BETTER_AUTH_SECRET,
  KB_CLIENT_NAME,
  KB_COOKIE_SEPARATOR,
  MediaType,
  MS_PER_SECOND,
  OAuthParam,
  Role,
  SET_COOKIE_VALUE_END,
  Separator,
  SIGNED_TOKEN_SUBJECT,
  Text,
} from "@platform/constants";
import { createDatabase, schema } from "@platform/db";
import { isolatedDatabasePath } from "@platform/test-framework";
import {
  type DocsAuthSetup,
  type IssueOptions,
  type OAuthClientCredentials,
  OAuthClientCredentialsSchema,
  SignedTokenSchema,
  type TestIssuer,
  TokenResponseSchema,
} from "@platform/types";
import { eq } from "drizzle-orm";
import type { JSONWebKeySet } from "jose";

async function adminCookie(
  auth: ReturnType<typeof createBetterAuth>,
  origin: string,
): Promise<string> {
  const response = await auth.handler(
    new Request([origin, BetterAuthPath.Base, BetterAuthEndpoint.SignUp].join(Text.Empty), {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: MediaType.Json, [HttpHeader.Origin]: origin },
      body: JSON.stringify({
        email: KB_ADMIN_EMAIL,
        password: KB_ADMIN_PASSWORD,
        name: KB_ADMIN_NAME,
      }),
    }),
  );
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(SET_COOKIE_VALUE_END)[0])
    .join(KB_COOKIE_SEPARATOR);
}

async function clientFor(
  auth: ReturnType<typeof createBetterAuth>,
  cookie: string,
  scopes: readonly string[],
): Promise<OAuthClientCredentials> {
  const created = await auth.api.adminCreateOAuthClient({
    headers: new Headers({ cookie }),
    body: {
      client_name: KB_CLIENT_NAME,
      grant_types: [CLIENT_CREDENTIALS_GRANT],
      redirect_uris: [KB_CLIENT_REDIRECT],
      token_endpoint_auth_method: CLIENT_SECRET_BASIC,
      scope: scopes.join(Glyph.Space),
      client_credentials_scopes: [...scopes],
      skip_consent: true,
    } as never,
  });
  return OAuthClientCredentialsSchema.parse(created);
}

async function accessTokenFor(
  auth: ReturnType<typeof createBetterAuth>,
  origin: string,
  client: OAuthClientCredentials,
  scopes: readonly string[],
): Promise<string> {
  const basic = Buffer.from([client.client_id, client.client_secret].join(Glyph.Colon)).toString(
    BASE64_ENCODING,
  );
  const response = await auth.handler(
    new Request([origin, BetterAuthPath.Base, BetterAuthEndpoint.Token].join(Text.Empty), {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.ContentType]: FORM_MEDIA_TYPE,
        [HttpHeader.Authorization]: [BASIC_SCHEME, basic].join(Glyph.Space),
      },
      body: new URLSearchParams({
        [OAuthParam.GrantType]: CLIENT_CREDENTIALS_GRANT,
        [OAuthParam.Scope]: scopes.join(Glyph.Space),
        [OAuthParam.Resource]: origin,
      }),
    }),
  );
  return TokenResponseSchema.parse(await response.json()).access_token;
}

async function signedToken(
  auth: ReturnType<typeof createBetterAuth>,
  origin: string,
  options: IssueOptions,
): Promise<string> {
  const expiresAt =
    Math.floor(Date.now() / MS_PER_SECOND) + (options.expiresInSeconds ?? Number.MAX_SAFE_INTEGER);
  const payload = {
    [ClaimName.Scope]: (options.scopes ?? []).join(Glyph.Space),
    [ClaimName.Subject]: SIGNED_TOKEN_SUBJECT,
    [ClaimName.Issuer]: await betterAuthIssuer(origin),
    ...(options.expiresInSeconds === undefined ? {} : { [ClaimName.Expiry]: expiresAt }),
    ...(options.audience === undefined ? {} : { [ClaimName.Audience]: options.audience }),
  };
  const signed = await auth.api.signJWT({ body: { payload } });
  return SignedTokenSchema.parse(signed).token;
}

export async function createDocsBetterAuth(origin: string): Promise<DocsAuthSetup> {
  const config = await loadConfig({
    [EnvVar.AuthEnabled]: String(true),
    [EnvVar.BetterAuthSecret]: KB_BETTER_AUTH_SECRET,
    [EnvVar.AuthResource]: origin,
    [EnvVar.TrustedOrigins]: origin,
  });
  const { db } = await createDatabase(isolatedDatabasePath());
  const auth = createBetterAuth(config.auth, db, schema, { emailAndPassword: true });
  const cookie = await adminCookie(auth, origin);
  db.update(schema.user)
    .set({ role: Role.Admin })
    .where(eq(schema.user.email, KB_ADMIN_EMAIL))
    .run();
  const credentials: Record<string, OAuthClientCredentials> = {};
  const issuer: TestIssuer = {
    issuer: await betterAuthIssuer(origin),
    audience: origin,
    jwks: (await auth.api.getJwks()) as JSONWebKeySet,
    keys: await betterAuthKeys(auth),
    issue: async (options = {}) => {
      const scopes = options.scopes ?? [];
      const flawed = options.expiresInSeconds !== undefined || options.audience !== undefined;
      if (flawed) {
        return signedToken(auth, origin, options);
      }
      const key = scopes.join(Separator.Space);
      credentials[key] = credentials[key] ?? (await clientFor(auth, cookie, scopes));
      return accessTokenFor(auth, origin, credentials[key], scopes);
    },
  };
  return {
    issuer,
    authApp: await betterAuthApp(auth, config.auth.trustedOrigins),
    provider: await createBetterAuthProvider(auth, config.auth),
  };
}
