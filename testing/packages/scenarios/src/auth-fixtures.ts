import {
  betterAuthApp,
  createBetterAuth,
  createBetterAuthProvider,
} from "@platform/auth-better-auth";
import { loadConfig } from "@platform/config";
import { EnvVar } from "@platform/constants";
import { createDatabase, schema } from "@platform/db";
import type { BetterAuthFlags } from "@platform/types";

export const authSchema = schema;

const SECRET = "unit-test-secret-value-at-least-32-characters";

export async function memoryDatabase() {
  const { db } = await createDatabase(":memory:");
  return db;
}

export async function betterAuthFixture(origin: string, flags: BetterAuthFlags = {}) {
  const config = await loadConfig({
    [EnvVar.AuthEnabled]: "true",
    [EnvVar.BetterAuthSecret]: SECRET,
    [EnvVar.AuthResource]: origin,
    [EnvVar.TrustedOrigins]: origin,
  });
  const auth = createBetterAuth(config.auth, await memoryDatabase(), schema, flags);
  return {
    config,
    auth,
    provider: await createBetterAuthProvider(auth, config.auth),
    app: await betterAuthApp(auth, config.auth.trustedOrigins),
  };
}
