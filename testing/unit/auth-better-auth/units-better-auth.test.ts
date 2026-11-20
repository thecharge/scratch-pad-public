import { expect } from "bun:test";
import {
  betterAuthApp,
  betterAuthIssuer,
  betterAuthKeys,
  createBetterAuth,
  createBetterAuthProvider,
} from "@platform/auth-better-auth";
import { loopbackOrigin } from "@platform/config/urls";
import {
  AuthProviderKind,
  BetterAuthPath,
  CanonicalCode,
  HttpHeader,
  HttpMethod,
  Scope,
} from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { createTestIssuer } from "@platform/test-framework";
import { authSchema, betterAuthFixture, memoryDatabase } from "@platform/test-scenarios";
import type { AuthProvider } from "@platform/types";

const ORIGIN = await loopbackOrigin(4310);
const OTHER_ORIGIN = await loopbackOrigin(4311);
const EVIL_ORIGIN = "https://evil.example.test";
const fixture = await betterAuthFixture(ORIGIN);
const FOREIGN = await createTestIssuer(`${ORIGIN}${BetterAuthPath.Base}`, ORIGIN);
const FOREIGN_TOKEN = await FOREIGN.issue();
const JWKS = await fixture.auth.api.getJwks();
const KNOWN_KEY = { alg: "EdDSA", kid: JWKS.keys[0]?.kid };
const UNKNOWN_KEY = { alg: "EdDSA", kid: "no-such-key" };
const DOWN = {
  api: {
    getJwks: async () => {
      throw new RangeError("key store down");
    },
  },
} as never;
const PROBE_TOKEN = "header.payload.signature";
const PREFLIGHT_METHOD = "OPTIONS";
const get = (path: string, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}${path}`, { headers });
const signUp = (flagged: string) =>
  new Request(`${ORIGIN}${BetterAuthPath.Base}/sign-up/email`, {
    method: HttpMethod.Post,
    headers: { "content-type": "application/json", [HttpHeader.Origin]: ORIGIN },
    body: JSON.stringify({
      email: `${flagged}@example.com`,
      password: "correct-horse-battery",
      name: flagged,
    }),
  });
const preflight = (origin: string) =>
  new Request(`${ORIGIN}${BetterAuthPath.Base}${BetterAuthPath.Jwks}`, {
    method: PREFLIGHT_METHOD,
    headers: { [HttpHeader.Origin]: origin, "access-control-request-method": HttpMethod.Get },
  });
const JWKS_PATH = `${BetterAuthPath.Base}${BetterAuthPath.Jwks}`;
const ISSUER_OF_ORIGIN = `${ORIGIN}${BetterAuthPath.Base}`;
const ISSUER_OF_OTHER = `${OTHER_ORIGIN}${BetterAuthPath.Base}`;
const HAS_KEYS = expect.objectContaining({
  status: 200,
  body: expect.objectContaining({ keys: expect.any(Array) }),
});
const ALLOWS_ORIGIN = expect.objectContaining({
  headers: expect.objectContaining({ "access-control-allow-origin": ORIGIN }),
});
const NO_CORS = expect.objectContaining({
  headers: expect.not.objectContaining({ "access-control-allow-origin": EVIL_ORIGIN }),
});
const NOT_FOUND = expect.objectContaining({ status: 404 });
const CREATED = expect.objectContaining({ status: 200 });
const REFUSED = expect.not.objectContaining({ status: 200 });
const METADATA = expect.objectContaining({
  resource: ORIGIN,
  authorization_servers: [ISSUER_OF_ORIGIN],
  scopes_supported: Object.values(Scope),
});
const KEY_FOUND = expect.objectContaining({ type: "public" });
const UNAUTHENTICATED = { code: CanonicalCode.Unauthenticated };

unit(betterAuthIssuer, {
  positive: [
    positive("the issuer is the origin plus the auth base path", [ORIGIN], ISSUER_OF_ORIGIN),
    positive("a resource path is dropped", [`${OTHER_ORIGIN}/mcp`], ISSUER_OF_OTHER),
  ],
  negative: [
    negative("a resource that is not a url throws", ["not a url"], { name: "TypeError" }),
    negative("an empty resource throws", [""], { name: "TypeError" }),
  ],
});

unit(betterAuthKeys, {
  positive: [
    positive("a known key id gives its public key", [fixture.auth], KEY_FOUND, [
      KNOWN_KEY,
      PROBE_TOKEN,
    ]),
    positive("a second look up uses the cached key set", [fixture.auth], KEY_FOUND, [
      KNOWN_KEY,
      PROBE_TOKEN,
    ]),
  ],
  negative: [
    negative(
      "an unknown key id is refused after a reload",
      [fixture.auth],
      { name: "JWKSNoMatchingKey" },
      [UNKNOWN_KEY, PROBE_TOKEN],
    ),
    negative(
      "an issuer whose key set cannot be read surfaces the failure",
      [DOWN],
      { name: "RangeError" },
      [KNOWN_KEY, PROBE_TOKEN],
    ),
  ],
});

unit(createBetterAuth, {
  positive: [
    positive(
      "sign up works when email and password are on",
      [fixture.config.auth, await memoryDatabase(), authSchema, { emailAndPassword: true }],
      CREATED,
      ["handler", signUp("on")],
    ),
    positive(
      "the key set endpoint answers",
      [fixture.config.auth, await memoryDatabase()],
      HAS_KEYS,
      ["handler", get(JWKS_PATH)],
    ),
  ],
  negative: [
    rejected(
      "sign up is refused when email and password are off",
      [fixture.config.auth, await memoryDatabase()],
      REFUSED,
      ["handler", signUp("off")],
    ),
    rejected(
      "the token endpoint is disabled",
      [fixture.config.auth, await memoryDatabase()],
      NOT_FOUND,
      ["handler", get(`${BetterAuthPath.Base}${BetterAuthPath.TokenEndpoint}`)],
    ),
  ],
});

unit(createBetterAuthProvider, {
  positive: [
    positive(
      "the provider is a better auth provider",
      [fixture.auth, fixture.config.auth],
      seen((provider: AuthProvider) => provider.kind, AuthProviderKind.BetterAuth),
    ),
    positive(
      "the metadata names the issuer and the scopes",
      [fixture.auth, fixture.config.auth],
      METADATA,
      ["resourceMetadata"],
    ),
  ],
  negative: [
    negative("a garbage token is refused", [fixture.auth, fixture.config.auth], UNAUTHENTICATED, [
      "verify",
      "not.a.jwt",
    ]),
    negative(
      "a token from a foreign key is refused",
      [fixture.auth, fixture.config.auth],
      UNAUTHENTICATED,
      ["verify", FOREIGN_TOKEN],
    ),
  ],
});

unit(betterAuthApp, {
  positive: [
    positive("the key set is served under the mount", [fixture.auth, [ORIGIN]], HAS_KEYS, [
      "request",
      JWKS_PATH,
    ]),
    positive(
      "a trusted origin is allowed by the preflight",
      [fixture.auth, [ORIGIN]],
      ALLOWS_ORIGIN,
      ["request", preflight(ORIGIN)],
    ),
  ],
  negative: [
    rejected("an untrusted origin gets no allow header", [fixture.auth, [ORIGIN]], NO_CORS, [
      "request",
      preflight(EVIL_ORIGIN),
    ]),
    rejected("a path outside the mount is not served", [fixture.auth, [ORIGIN]], NOT_FOUND, [
      "request",
      "/elsewhere",
    ]),
  ],
});
