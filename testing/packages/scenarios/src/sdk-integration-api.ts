import { test } from "bun:test";
import { createApi } from "@platform/api/app";
import { createAssetStore } from "@platform/assets";
import { createJwksProvider } from "@platform/auth";
import { betterAuthIssuer, createBetterAuthProvider } from "@platform/auth-better-auth";
import { API_PORT, OBJECT_STORE_BIND_HOST, PROXY_HOST } from "@platform/config/environments";
import { FOREIGN_AUDIENCE, LOOPBACK_ORIGIN } from "@platform/config/urls";
import {
  AuthProviderKind,
  CanonicalCode,
  ErrorReason,
  FeatureFlag,
  HttpHeader,
  McpEra,
  MessageId,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { createFlags } from "@platform/flags";
import { writeJson } from "@platform/streams";
import { customCapabilities, GREETING_SKILL_DIRS } from "@platform/test-custom-capability";
import {
  createTestIssuer,
  createTickClock,
  isolatedDatabasePath,
  PACKAGE_SKILL_DIRS,
} from "@platform/test-framework";
import {
  type AuthProvider,
  FlagValuesSchema,
  IssueOptionsSchema,
  JsonObjectSchema,
  type SdkIntegrationInput,
  SdkIntegrationInputSchema,
  type TestIssuer,
} from "@platform/types";
import { integrationObservability } from "./api-integration-observability.ts";
import { ASSET_STORE_SETTINGS, assetClients } from "./asset-store-fixtures.ts";
import { authIntegrationControl, betterAuthIntegration } from "./better-auth-integration.ts";
import { createDocsBetterAuth } from "./docs-auth.ts";
import { mcpIntegrationFixture } from "./mcp-integration-fixtures.ts";
import { spaced } from "./stream-fixtures.ts";

const secret = Bun.env.FIXTURE_SECRET ?? "";
if (secret.length === 0) throw new Error("missing SDK fixture secret");

const fixtures: Awaited<ReturnType<typeof createFixture>>[] = [];
const issuers: TestIssuer[] = [];
const authFixtures: (Awaited<ReturnType<typeof betterAuthIntegration>> | undefined)[] = [];

async function integrationProvider(
  input: SdkIntegrationInput,
  issuer: TestIssuer,
  verified: string[],
): Promise<AuthProvider> {
  if (input.authFixtureId !== undefined) {
    const fixture = authFixtures[input.authFixtureId];
    if (fixture === undefined) throw new Error("missing Better Auth integration fixture");
    return createBetterAuthProvider(fixture.auth, {
      ...fixture.config.auth,
      resource: input.rejectAudience === true ? FOREIGN_AUDIENCE : fixture.config.auth.resource,
      issuer: await betterAuthIssuer(fixture.config.auth.resource),
    });
  }
  if (input.authDisabledProbe === true)
    return {
      kind: AuthProviderKind.Jwks,
      verify: async (token) => {
        verified.push(token);
        throw new ApiError(
          CanonicalCode.Unauthenticated,
          ErrorReason.TokenInvalid,
          MessageId.TokenInvalid,
        );
      },
      resourceMetadata: async () => ({ resource: LOOPBACK_ORIGIN, authorization_servers: [] }),
    };
  return createJwksProvider({
    issuer: issuer.issuer,
    audience: input.rejectAudience === true ? FOREIGN_AUDIENCE : LOOPBACK_ORIGIN,
    resource: LOOPBACK_ORIGIN,
    keys: issuer.keys,
  });
}

async function createFixture(input: SdkIntegrationInput) {
  const docsAuth =
    input.docsProvider === AuthProviderKind.BetterAuth
      ? await createDocsBetterAuth(LOOPBACK_ORIGIN)
      : undefined;
  const issuer: TestIssuer | undefined =
    docsAuth?.issuer ??
    (input.issuerId === undefined
      ? await createTestIssuer(`${LOOPBACK_ORIGIN}/api/auth`, input.resource ?? LOOPBACK_ORIGIN)
      : issuers[input.issuerId]);
  if (issuer === undefined) throw new Error("missing shared integration issuer");
  const verified: string[] = [];
  const provider = docsAuth?.provider ?? (await integrationProvider(input, issuer, verified));
  const selected =
    input.mcpFixture === undefined ? undefined : await mcpIntegrationFixture(input, issuer);
  const observed = await integrationObservability(input.captureLogs);
  const betterAuth = input.betterAuth === true ? await betterAuthIntegration() : undefined;
  const flags = await createFlags(
    input.enableSuggest === true ? { [FeatureFlag.BooksSuggest]: true } : {},
  );
  const extras = input.customCapabilities === true ? await customCapabilities() : [];
  const assetFixture = input.assets === true ? assetClients() : undefined;
  const assets =
    assetFixture === undefined
      ? undefined
      : await createAssetStore(ASSET_STORE_SETTINGS, assetFixture.clients);
  const skillDirs =
    input.customCapabilities === true
      ? [...PACKAGE_SKILL_DIRS, ...GREETING_SKILL_DIRS]
      : input.skillDirs;
  const app =
    betterAuth?.app ??
    selected?.app ??
    (await createApi({
      auth: { enabled: input.enabled, provider },
      ...(docsAuth?.authApp === undefined ? {} : { authApp: docsAuth.authApp }),
      ...(assets === undefined ? {} : { assets }),
      ...(observed.telemetry === undefined ? {} : { telemetry: observed.telemetry }),
      flags,
      domain: input.domain ?? "sdk.test",
      resource: LOOPBACK_ORIGIN,
      databasePath: input.databasePath ?? isolatedDatabasePath(),
      era: input.era ?? McpEra.Stateless,
      host: PROXY_HOST,
      allowedHosts: [PROXY_HOST],
      allowedOrigins: input.allowedOrigins ?? [],
      reindexStepMs: input.reindexStepMs ?? 150,
      ...(skillDirs === undefined ? {} : { skillDirs }),
      extraCapabilities: extras,
      ...(input.tickClock === true ? { now: await createTickClock() } : {}),
      proxySecret: secret,
    }));
  const transferEncodings: (string | null)[] = [];
  return {
    issuer,
    app,
    transferEncodings,
    slowStreamMs: input.slowStreamMs,
    loaded: selected?.loaded,
    observed,
    betterAuth,
    verified,
    flags,
    assetFixture,
  };
}

async function dispatch(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/__ready") return new Response();
  if (url.pathname === "/__fixture") {
    const input = SdkIntegrationInputSchema.parse(await request.json());
    const fixture = await createFixture(input);
    fixtures.push(fixture);
    issuers.push(fixture.issuer);
    authFixtures.push(fixture.betterAuth);
    return Response.json({
      id: fixtures.length - 1,
      issuer: fixture.issuer.issuer,
      audience: fixture.issuer.audience,
      jwks: fixture.issuer.jwks,
    });
  }
  const parts = url.pathname.split("/");
  if (parts[1] !== "__fixture") {
    const active = fixtures.at(-1)?.betterAuth;
    return active === undefined
      ? new Response(undefined, { status: 404 })
      : active.app.fetch(request);
  }
  const fixture = fixtures[Number(parts[2])];
  if (fixture === undefined) return new Response(undefined, { status: 404 });
  if (fixture.betterAuth !== undefined)
    return authIntegrationControl(fixture.betterAuth, parts[3] ?? "", request);
  if (parts[3] === "__token")
    return Response.json({
      token: await fixture.issuer.issue(IssueOptionsSchema.parse(await request.json())),
    });
  if (parts[3] === "__transferEncodings") return Response.json(fixture.transferEncodings);
  if (parts[3] === "__loaded") return Response.json(fixture.loaded?.count);
  if (parts[3] === "__verified") return Response.json(fixture.verified);
  if (parts[3] === "__objects")
    return Response.json(
      Array.from(fixture.assetFixture?.objects ?? [], ([key, value]) => [key, Array.from(value)]),
    );
  if (parts[3] === "__flags") {
    await fixture.flags.set(FlagValuesSchema.parse(await request.json()));
    return new Response();
  }
  if (parts[3] === "__log") {
    fixture.observed.logger?.info(JsonObjectSchema.parse(await request.json()), "incoming request");
    return Response.json(fixture.observed.lines.join(""));
  }
  if (parts[3] === "slow" && fixture.slowStreamMs !== undefined)
    return new Response(
      await writeJson({ books: spaced(fixture.slowStreamMs, 1, 2, 3, 4), nextPageToken: "" }),
    );
  fixture.transferEncodings.push(request.headers.get(HttpHeader.TransferEncoding));
  const unmarked = parts[3] === "__without-marker";
  url.pathname = `/${parts.slice(unmarked ? 4 : 3).join("/")}`;
  const forwarded = new Request(url, request);
  if (unmarked) forwarded.headers.delete(HttpHeader.ProxyMarker);
  return fixture.app.fetch(forwarded);
}

test("serve the isolated proxy integration backend", async () => {
  const finished = Promise.withResolvers<void>();
  const server = Bun.serve({
    hostname: OBJECT_STORE_BIND_HOST,
    port: API_PORT,
    fetch: async (request) => {
      if (request.headers.get(HttpHeader.ProxyMarker) !== secret)
        return new Response(undefined, { status: 403 });
      if (new URL(request.url).pathname !== "/__finish") return dispatch(request);
      setTimeout(async () => {
        await server.stop(true);
        finished.resolve();
      }, 50);
      return new Response();
    },
  });
  await finished.promise;
}, 60_000);
