import { createJwksProvider, protectedResourceMetadataApp } from "@platform/auth";
import { CapabilityRegistry, defineCapability } from "@platform/capability";
import { PROXY_HOST } from "@platform/config/environments";
import { LOOPBACK_ORIGIN, TEST_MCP_ALLOWED_HOST } from "@platform/config/urls";
import {
  ApiVersion,
  AuthMode,
  AuthProviderKind,
  McpEra,
  McpFixtureKind,
  MethodKind,
} from "@platform/constants";
import { createMcpApp } from "@platform/mcp-adapter";
import { createPipeline } from "@platform/pipeline";
import { allowedBy, DeclarativePolicyEngine, visibleTo } from "@platform/policy";
import { FixedWindowRateLimiter } from "@platform/ratelimit";
import type {
  AuthInfo,
  AuthProvider,
  CapabilityDefinition,
  SdkIntegrationInput,
  TestIssuer,
} from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";

const BOOK = "publishers/{publisher}/books/{book}";
const SHELF = "shelves/{shelf}";
const INPUT = z.strictObject({ name: z.string() });
const engine = new DeclarativePolicyEngine();

async function define(overrides: Partial<CapabilityDefinition<z.ZodType, z.ZodType>>) {
  return defineCapability({
    id: "books.x",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: BOOK,
    summary: "summary",
    description: "description",
    auth: AuthMode.None,
    input: INPUT,
    output: z.object({ echoed: z.string() }),
    handler: ({ name }: z.infer<typeof INPUT>) => ({ echoed: name }),
    ...overrides,
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

const ADAPTER_CAPABILITIES = [
  await define({ id: "books.open" }),
  await define({ id: "books.optional", auth: AuthMode.Optional }),
  await define({ id: "books.private", auth: AuthMode.Required }),
  await define({
    id: "books.admin",
    auth: AuthMode.Required,
    policy: { requiredScopes: ["admin"] },
  }),
  await define({
    id: "books.broken",
    handler: () => {
      throw new Error("secret detail");
    },
  }),
  await define({ id: "books.remove", method: MethodKind.Delete }),
];

const CONFORMANCE_CAPABILITIES = [
  await define({ id: "books.open" }),
  await define({ id: "shelves.read", resource: SHELF, auth: AuthMode.Required }),
  await define({ id: "books.limited", rateLimit: { limit: 1, windowMs: 60_000 } }),
];

export async function mcpIntegrationFixture(input: SdkIntegrationInput, issuer: TestIssuer) {
  const registry = new CapabilityRegistry();
  const loaded = { count: 0 };
  const capabilities =
    input.mcpFixture === McpFixtureKind.Conformance
      ? CONFORMANCE_CAPABILITIES
      : ADAPTER_CAPABILITIES;
  if (input.mcpFixture === McpFixtureKind.AdapterLazy)
    await registry.register("books.open", async () => {
      loaded.count += 1;
      return ADAPTER_CAPABILITIES[0] as (typeof ADAPTER_CAPABILITIES)[number];
    });
  else
    await all(
      capabilities.map(
        (capability) => async () => registry.register(capability.id, async () => capability),
      ),
    );
  const resource = input.resource ?? LOOPBACK_ORIGIN;
  const real = await createJwksProvider({
    issuer: issuer.issuer,
    audience: resource,
    resource,
    keys: issuer.keys,
  });
  const noExpiry: AuthProvider = {
    kind: AuthProviderKind.Jwks,
    verify: async () => ({ token: "t", clientId: "c", scopes: [] }) as unknown as AuthInfo,
    resourceMetadata: async () => ({ resource, authorization_servers: [] }),
  };
  if (input.mcpFixture === McpFixtureKind.Metadata)
    return { app: await protectedResourceMetadataApp(real), loaded };
  const app = await createMcpApp({
    source: registry,
    invoke: await createPipeline({ policy: engine, rateLimiter: new FixedWindowRateLimiter() }),
    auth: { enabled: input.enabled, provider: input.omitExpiry === true ? noExpiry : real },
    domain: input.domain ?? "api.test",
    resource,
    visible: async (capability, principal) => visibleTo(engine, capability, principal),
    allowed: async (block, principal) => allowedBy(engine, block, principal),
    skillDirs: [],
    era: input.era ?? McpEra.Stateless,
    host: PROXY_HOST,
    allowedHosts: input.rejectHost === true ? [TEST_MCP_ALLOWED_HOST] : [PROXY_HOST],
    allowedOrigins: input.allowedOrigins ?? [],
  });
  return { app, loaded };
}
