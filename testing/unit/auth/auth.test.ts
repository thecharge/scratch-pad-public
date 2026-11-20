import { describe, expect, test } from "bun:test";
import {
  authMiddleware,
  bearerTokenFrom,
  challengeFor,
  createJwksProvider,
  isCallable,
  metadataPath,
  metadataUrl,
  principalFromAuthInfo,
  protectedResourceMetadataApp,
  resolveAuth,
  unauthenticatedResponse,
} from "@platform/auth";
import {
  AuthMode,
  AuthVariable,
  CanonicalCode,
  ClaimName,
  ErrorReason,
  HttpHeader,
  MessageId,
  PrincipalKind,
  Scope,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { createTestIssuer, thrownBy } from "@platform/test-framework";
import { ANONYMOUS_PRINCIPAL, type AuthEnv, type AuthInfo } from "@platform/types";
import { Hono } from "hono";

const RESOURCE = "https://api.test";

async function setup() {
  const issuer = await createTestIssuer("https://issuer.test", RESOURCE);
  const provider = await createJwksProvider({
    issuer: issuer.issuer,
    audience: issuer.audience,
    resource: RESOURCE,
    keys: issuer.keys,
  });
  return { issuer, provider };
}

function bearer(token: string): Headers {
  return new Headers({ [HttpHeader.Authorization]: `Bearer ${token}` });
}

describe("bearer token extraction reads only the Authorization header", () => {
  test.each([
    ["Bearer abc", "abc"],
    ["bearer lower", "lower"],
    ["Basic abc", undefined],
    ["Bearer ", undefined],
  ])("%p gives %p", async (header, expected) => {
    expect(await bearerTokenFrom(new Headers({ authorization: header }))).toBe(expected);
  });

  test("a request without the header has no token", async () => {
    expect(await bearerTokenFrom(new Headers())).toBeUndefined();
  });
});

describe("jwks provider", () => {
  test("verifies a valid token and exposes scopes, expiry and audience", async () => {
    const { issuer, provider } = await setup();
    const info = await provider.verify(
      await issuer.issue({ subject: "u1", scopes: ["read", "write"] }),
    );
    expect(info).toMatchObject({ scopes: ["read", "write"], resource: new URL(RESOURCE) });
    expect(info.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  test.each([
    ["a wrong audience", { audience: "https://other.test" }, ErrorReason.TokenInvalid],
    ["a wrong issuer", { issuer: "https://evil.test" }, ErrorReason.TokenInvalid],
    ["an expired token", { expiresInSeconds: -60 }, ErrorReason.TokenExpired],
    ["a token without expiry", { noExpiry: true }, ErrorReason.TokenInvalid],
  ])("rejects %s as UNAUTHENTICATED", async (_name, options, reason) => {
    const { issuer, provider } = await setup();
    expect(await thrownBy(async () => provider.verify(await issuer.issue(options)))).toMatchObject({
      code: CanonicalCode.Unauthenticated,
      reason,
    });
  });

  test("rejects a token signed by a foreign key and plain garbage", async () => {
    const { issuer, provider } = await setup();
    const foreign = await createTestIssuer(issuer.issuer, issuer.audience);
    expect(await thrownBy(async () => provider.verify(await foreign.issue()))).toBeInstanceOf(
      ApiError,
    );
    expect(await thrownBy(() => provider.verify("not.a.jwt"))).toBeInstanceOf(ApiError);
  });

  test("publishes resource metadata naming its issuer", async () => {
    const { provider } = await setup();
    expect(await provider.resourceMetadata()).toMatchObject({
      resource: RESOURCE,
      authorization_servers: ["https://issuer.test"],
    });
  });

  test("without keys or a JWKS URL it is a configuration error", async () => {
    expect(
      await thrownBy(async () =>
        createJwksProvider({ issuer: "https://i", audience: "a", resource: RESOURCE }),
      ),
    ).toMatchObject({
      messageId: MessageId.ConfigInvalid,
    });
  });
});

describe("principal mapping", () => {
  const base: AuthInfo = { token: "t", clientId: "c", scopes: ["read"], expiresAt: 1 };

  test("claims become kind, subject, scopes and roles; the admin role grants the admin scope", async () => {
    const principal = await principalFromAuthInfo({
      ...base,
      extra: { [ClaimName.Subject]: "u9", [ClaimName.Roles]: ["admin"] },
    });
    expect(principal).toMatchObject({ kind: PrincipalKind.User, subject: "u9", roles: ["admin"] });
    expect(principal.scopes).toContain(Scope.Admin);
  });

  test("a principal_kind claim marks an agent", async () => {
    const principal = await principalFromAuthInfo({
      ...base,
      extra: { [ClaimName.PrincipalKind]: PrincipalKind.Agent },
    });
    expect(principal.kind).toBe(PrincipalKind.Agent);
  });
});

describe("auth enablement", () => {
  test("with auth disabled the verifier is never called and the caller is anonymous", async () => {
    const { issuer, provider } = await setup();
    let calls = 0;
    const spying = {
      ...provider,
      verify: async (token: string) => {
        calls += 1;
        return provider.verify(token);
      },
    };
    const resolution = await resolveAuth(bearer(await issuer.issue()), {
      enabled: false,
      provider: spying,
    });
    expect([resolution.principal, resolution.tokenPresented, calls]).toEqual([
      ANONYMOUS_PRINCIPAL,
      false,
      0,
    ]);
  });

  test("with auth enabled, no token is anonymous", async () => {
    const { provider } = await setup();
    expect(await resolveAuth(new Headers(), { enabled: true, provider })).toEqual({
      principal: ANONYMOUS_PRINCIPAL,
      tokenPresented: false,
    });
  });

  test("with auth enabled, a bad token is anonymous and carries an UNAUTHENTICATED failure", async () => {
    const { provider } = await setup();
    const resolution = await resolveAuth(bearer("nonsense"), { enabled: true, provider });
    expect(resolution).toMatchObject({
      principal: ANONYMOUS_PRINCIPAL,
      tokenPresented: true,
      failure: { code: CanonicalCode.Unauthenticated },
    });
  });

  test("both transports get the same principal for the same token", async () => {
    const { issuer, provider } = await setup();
    const token = await issuer.issue({ subject: "same", scopes: ["a"] });
    const app = new Hono<AuthEnv>();
    app.use(await authMiddleware({ enabled: true, provider }));
    app.get("/who", (context) => context.body(JSON.stringify(context.get(AuthVariable.Principal))));
    const viaHono = await (await app.request("/who", { headers: bearer(token) })).json();
    expect(viaHono).toEqual(
      (await resolveAuth(bearer(token), { enabled: true, provider })).principal,
    );
  });

  test("a token in the query string is ignored", async () => {
    const { issuer, provider } = await setup();
    const app = new Hono<AuthEnv>();
    app.use(await authMiddleware({ enabled: true, provider }));
    app.get("/who", (context) => context.body(JSON.stringify(context.get(AuthVariable.Principal))));
    const response = await app.request(`/who?access_token=${await issuer.issue()}`);
    expect(await response.json()).toEqual(ANONYMOUS_PRINCIPAL);
  });

  const USER = { kind: PrincipalKind.User, subject: "u", scopes: [], roles: [] };

  test.each([
    [AuthMode.None, ANONYMOUS_PRINCIPAL, false, true],
    [AuthMode.Optional, ANONYMOUS_PRINCIPAL, true, true],
    [AuthMode.Required, USER, false, false],
    [AuthMode.Required, ANONYMOUS_PRINCIPAL, true, false],
    [AuthMode.Required, USER, true, true],
  ])(
    "%s for %o with auth enabled=%s is callable: %s",
    async (mode, principal, enabled, callable) => {
      expect(await isCallable(mode, principal, enabled)).toBe(callable);
    },
  );
});

describe("challenges and metadata (RFC 6750, RFC 9728)", () => {
  test.each([
    ["https://api.test", "/.well-known/oauth-protected-resource"],
    ["https://api.test/", "/.well-known/oauth-protected-resource"],
    ["https://api.test/mcp", "/.well-known/oauth-protected-resource/mcp"],
  ])("the well-known path of %s is %s", async (resource, path) => {
    expect(await metadataPath(resource)).toBe(path);
  });

  test("the metadata URL keeps the origin", async () => {
    expect(await metadataUrl("https://api.test/mcp")).toBe(
      "https://api.test/.well-known/oauth-protected-resource/mcp",
    );
  });

  test.each([
    [false, 'Bearer resource_metadata="https://api.test/.well-known/oauth-protected-resource"'],
    [
      true,
      'Bearer resource_metadata="https://api.test/.well-known/oauth-protected-resource", error="invalid_token"',
    ],
  ])("the challenge when a token was presented=%s", async (presented, expected) => {
    expect(await challengeFor(RESOURCE, presented)).toBe(expected);
  });

  test("the 401 response is an AIP-193 body with the challenge header", async () => {
    const error = new ApiError(
      CanonicalCode.Unauthenticated,
      ErrorReason.TokenMissing,
      MessageId.TokenMissing,
    );
    const response = await unauthenticatedResponse(error, {
      domain: "api.test",
      resource: RESOURCE,
      tokenPresented: false,
    });
    expect(response.status).toBe(401);
    expect(response.headers.get(HttpHeader.WwwAuthenticate)).toContain("resource_metadata=");
    expect(await response.json()).toMatchObject({
      error: { status: CanonicalCode.Unauthenticated },
    });
  });

  test("the metadata document is served at its well-known path", async () => {
    const { provider } = await setup();
    const response = await (await protectedResourceMetadataApp(provider)).request(
      "/.well-known/oauth-protected-resource",
    );
    expect(await response.json()).toMatchObject({
      resource: RESOURCE,
      authorization_servers: ["https://issuer.test"],
    });
  });
});
