import { Database } from "bun:sqlite";
import { loadConfig } from "@platform/config";
import { EnvVar } from "@platform/constants";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { createBetterAuth } from "./src/create-auth.ts";

const CLI_SECRET = "cli-generation-only-secret-value-0123456789";

const config = await loadConfig({
  [EnvVar.AuthEnabled]: "true",
  [EnvVar.BetterAuthSecret]: CLI_SECRET,
});

export const auth = createBetterAuth(config.auth, drizzle(new Database(":memory:")));
