import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import {
  BetterAuthPath,
  CimdProfile,
  OidcScope,
  Role,
  Scope,
  Separator,
  SqliteProvider,
  Text,
} from "@platform/constants";
import type { AuthConfig, BetterAuthFlags, JsonObject } from "@platform/types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { jwt } from "better-auth/plugins/jwt";

async function isAdminUser(user: JsonObject | undefined): Promise<boolean> {
  return String(user?.role ?? Text.Empty)
    .split(Separator.List)
    .map((role) => role.trim())
    .includes(Role.Admin);
}

function adapterOptions(schema: Record<string, unknown> | undefined) {
  const provider = SqliteProvider.Sqlite;
  return schema === undefined ? { provider } : { provider, schema };
}

export function createBetterAuth(
  auth: AuthConfig,
  database: Parameters<typeof drizzleAdapter>[0],
  schema?: Record<string, unknown>,
  flags: BetterAuthFlags = {},
) {
  return betterAuth({
    baseURL: auth.resource,
    secret: auth.betterAuthSecret as string,
    trustedOrigins: auth.trustedOrigins,
    database: drizzleAdapter(database, adapterOptions(schema)),
    emailAndPassword: { enabled: flags.emailAndPassword ?? false },
    rateLimit: { enabled: flags.production ?? false },
    disabledPaths: [BetterAuthPath.TokenEndpoint],
    plugins: [
      jwt({ disableSettingJwtHeader: true }),
      mcp({
        loginPage: BetterAuthPath.LoginPage,
        consentPage: BetterAuthPath.ConsentPage,
        resource: auth.resource,
        scopes: [...Object.values(OidcScope), ...Object.values(Scope)],
        clientPrivileges: async ({ user }) => isAdminUser(user),
      }),
      cimd({ fetchClientMetadataResource, metadataProfile: CimdProfile.Mcp20260728 }),
      admin(),
    ],
  });
}
