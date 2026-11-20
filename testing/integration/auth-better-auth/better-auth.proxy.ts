import { afterAll, describe, expect, test } from "bun:test";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { betterAuthIssuer, betterAuthKeys } from "@platform/auth-better-auth";
import {
  CIMD_HTTP_PROBE,
  CIMD_LOOPBACK_PROBE,
  CIMD_METADATA_PROBE,
  CIMD_PRIVATE_PROBE,
  FOREIGN_AUDIENCE,
  KB_CLIENT_REDIRECT,
  TEST_PROXY_ORIGIN,
} from "@platform/config/urls";
import { HttpHeader, PrincipalKind, Scope } from "@platform/constants";
import { createTestIssuer, thrownBy } from "@platform/test-framework";
import {
  type JsonObject,
  JsonObjectSchema,
  type OAuthClientCredentials,
  OAuthClientCredentialsSchema,
  TokenResponseSchema,
} from "@platform/types";
import { jwtVerify } from "jose";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const PASSWORD = "correct-horse-battery-staple";
const ADMIN_EMAIL = "admin@example.com";
afterAll(finishProxyIntegration);

async function control(origin: string, action: string, input: JsonObject) {
  const response = await fetch(`${origin}/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok)
    throw Object.assign(new Error(await response.text()), { httpStatus: response.status });
  return JsonObjectSchema.parse(await response.json());
}
async function start() {
  const fixture = await proxyFixture({ enabled: true, betterAuth: true });
  const call = (action: string, input: JsonObject = {}) => control(fixture.origin, action, input);
  return {
    origin: TEST_PROXY_ORIGIN,
    control: call,
    provider: {
      verify: (token: string) => call("__verify", { token }),
      resourceMetadata: () => call("__metadata"),
    },
  };
}

async function signUp(harness: Awaited<ReturnType<typeof start>>, email: string): Promise<string> {
  const response = await fetch(`${harness.origin}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: harness.origin },
    body: JSON.stringify({ email, password: PASSWORD, name: email }),
  });
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function adminCookie(harness: Awaited<ReturnType<typeof start>>): Promise<string> {
  const cookie = await signUp(harness, ADMIN_EMAIL);
  await harness.control("__admin", { email: ADMIN_EMAIL });
  return cookie;
}

async function createClient(harness: Awaited<ReturnType<typeof start>>, cookie: string) {
  const client = {
    client_name: "machine",
    grant_types: ["client_credentials"],
    redirect_uris: [KB_CLIENT_REDIRECT],
    token_endpoint_auth_method: "client_secret_basic",
    scope: Scope.Read,
    client_credentials_scopes: [Scope.Read],
    skip_consent: true,
  };
  const created = await harness.control("__client", { cookie, client });
  return OAuthClientCredentialsSchema.parse(created);
}

async function accessToken(harness: Awaited<ReturnType<typeof start>>): Promise<string> {
  const client = await createClient(harness, await adminCookie(harness));
  const response = await tokenRequest(harness.origin, client, harness.origin);
  return TokenResponseSchema.parse(await response.json()).access_token;
}

function tokenRequest(origin: string, client: OAuthClientCredentials, resource: string) {
  const basic = Buffer.from(`${client.client_id}:${client.client_secret}`).toString("base64");
  return fetch(`${origin}/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: Scope.Read, resource }),
  });
}

describe("Better Auth under Bun.serve: discovery", () => {
  test("publishes an EdDSA JWKS", async () => {
    const { origin } = await start();
    expect(await (await fetch(`${origin}/api/auth/jwks`)).json()).toMatchObject({
      keys: [{ alg: "EdDSA" }],
    });
  });

  test("the resource document names Better Auth as the authorization server", async () => {
    const { origin, provider } = await start();
    const metadata = await (await fetch(`${origin}/.well-known/oauth-protected-resource`)).json();
    expect(metadata).toMatchObject({
      resource: origin,
      authorization_servers: [await betterAuthIssuer(origin)],
    });
    expect((await provider.resourceMetadata()).authorization_servers).toEqual([
      await betterAuthIssuer(origin),
    ]);
  });

  test("the authorization server metadata reports the same issuer", async () => {
    const { origin } = await start();
    const response = await fetch(`${origin}/api/auth/.well-known/oauth-authorization-server`);
    expect(await response.json()).toMatchObject({ issuer: await betterAuthIssuer(origin) });
  });
});

describe("Better Auth under Bun.serve: tokens", () => {
  test("an admin-created client obtains a JWT that the provider verifies", async () => {
    const harness = await start();
    const token = await accessToken(harness);
    expect(await harness.provider.verify(token)).toMatchObject({ scopes: [Scope.Read] });
  });

  test("the middleware turns that token into a principal", async () => {
    const harness = await start();
    const token = await accessToken(harness);
    const response = await fetch(`${harness.origin}/whoami`, {
      headers: { [HttpHeader.Authorization]: `Bearer ${token}` },
    });
    expect(await response.json()).toMatchObject({ scopes: [Scope.Read] });
  });

  test("a request without a token is anonymous", async () => {
    const { origin } = await start();
    expect(await (await fetch(`${origin}/whoami`)).json()).toMatchObject({
      kind: PrincipalKind.Anonymous,
    });
  });

  test("a token for another resource is refused", async () => {
    const harness = await start();
    const client = await createClient(harness, await adminCookie(harness));
    expect(
      (await tokenRequest(harness.origin, client, FOREIGN_AUDIENCE)).status,
    ).toBeGreaterThanOrEqual(400);
  });

  test("a token signed by a foreign key is rejected by the provider", async () => {
    const harness = await start();
    const foreign = await createTestIssuer(await betterAuthIssuer(harness.origin), harness.origin);
    expect(
      await thrownBy(async () => harness.provider.verify(await foreign.issue())),
    ).toMatchObject({ httpStatus: 401 });
  });
});

describe("Better Auth under Bun.serve: safety settings", () => {
  test("only admins may create OAuth clients", async () => {
    const harness = await start();
    expect(
      await thrownBy(async () => createClient(harness, await signUp(harness, "user@example.com"))),
    ).toBeDefined();
  });

  test("dynamic client registration is off", async () => {
    const { origin } = await start();
    const response = await fetch(`${origin}/api/auth/oauth2/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_name: "x", redirect_uris: [KB_CLIENT_REDIRECT] }),
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test("the plain /token endpoint is disabled", async () => {
    const { origin } = await start();
    expect((await fetch(`${origin}/api/auth/token`)).status).toBe(404);
  });
});

describe("key lookup after rotation", () => {
  test("an unknown key id reloads the key set once, then verifies", async () => {
    const first = await createTestIssuer();
    const second = await createTestIssuer();
    const calls: number[] = [];
    const fake = {
      api: {
        getJwks: async () => {
          calls.push(calls.length);
          return calls.length === 1 ? first.jwks : second.jwks;
        },
      },
    };
    const keys = await betterAuthKeys(fake as never);
    await jwtVerify(await first.issue(), keys);
    await jwtVerify(await second.issue(), keys);
    expect(calls).toHaveLength(2);
  });
});

describe("CIMD metadata transport (shipped by Better Auth, run under Bun)", () => {
  test.each([
    ["a loopback hostname", CIMD_LOOPBACK_PROBE],
    ["a private IPv4 literal", CIMD_PRIVATE_PROBE],
    ["the cloud metadata address", CIMD_METADATA_PROBE],
    ["plain HTTP", CIMD_HTTP_PROBE],
  ])("rejects %s", async (_name, url) => {
    expect(await thrownBy(() => fetchClientMetadataResource(url))).toBeDefined();
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
