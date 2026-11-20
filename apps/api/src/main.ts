import { createAssetStore } from "@platform/assets";
import { createJwksProvider } from "@platform/auth";
import { loadConfig } from "@platform/config";
import {
  AuthProviderKind,
  CLEAN_EXIT_CODE,
  FORCED_EXIT_CODE,
  LogField,
  McpEra,
  MessageId,
  PathSegment,
  Signal,
} from "@platform/constants";
import { createFlags } from "@platform/flags";
import { createLogger } from "@platform/logger";
import { sensitivePaths } from "@platform/masking";
import { message } from "@platform/messages";
import { startTelemetry } from "@platform/telemetry";
import type { AppConfig, AuthSetup } from "@platform/types";
import { createApi } from "./app.ts";
import { createRegistry } from "./registry.ts";

async function authSetup(config: AppConfig): Promise<AuthSetup> {
  if (!config.auth.enabled) {
    return {};
  }
  if (config.auth.provider === AuthProviderKind.Jwks) {
    const jwksUrl = config.auth.jwksUrl === undefined ? {} : { jwksUrl: config.auth.jwksUrl };
    const options = {
      issuer: config.auth.issuer as string,
      audience: config.auth.audience as string,
      resource: config.auth.resource,
      ...jwksUrl,
    };
    return { provider: await createJwksProvider(options) };
  }
  const { createBetterAuth, createBetterAuthProvider, betterAuthApp } = await import(
    "@platform/auth-better-auth"
  );
  const { createDatabase, schema } = await import("@platform/db");
  const { db } = await createDatabase(config.databasePath);
  const auth = createBetterAuth(config.auth, db, schema);
  return {
    provider: await createBetterAuthProvider(auth, config.auth),
    authApp: await betterAuthApp(auth, config.auth.trustedOrigins),
  };
}

export async function startApi(
  env: Readonly<Record<string, string | undefined>> = Bun.env,
  setup: (config: AppConfig) => Promise<AuthSetup> = authSetup,
  makeApi: typeof createApi = createApi,
) {
  const config = await loadConfig(env);
  const capabilities = await (await createRegistry()).list();
  const logger = await createLogger({
    level: config.logLevel,
    redact: await sensitivePaths(capabilities),
  });
  const telemetry = await startTelemetry([], []);
  const { provider, authApp } = await setup(config);
  const origin = new URL(config.auth.resource);
  const auth = { enabled: config.auth.enabled, ...(provider === undefined ? {} : { provider }) };
  const telemetryDeps = { tracer: telemetry.tracer, meter: telemetry.meter, logger };
  const api = await makeApi({
    ...(config.assets === undefined ? {} : { assets: await createAssetStore(config.assets) }),
    auth,
    ...(authApp === undefined ? {} : { authApp }),
    telemetry: telemetryDeps,
    domain: config.errorDomain,
    resource: config.auth.resource,
    databasePath: config.databasePath || PathSegment.InMemoryDatabase,
    era: McpEra.Stateless,
    host: origin.hostname,
    allowedHosts: [origin.hostname],
    allowedOrigins: config.auth.trustedOrigins,
    flags: await createFlags(config.flags),
    skillDirs: config.skillDirs,
    ...(config.proxySecret === undefined ? {} : { proxySecret: config.proxySecret }),
  });
  const server = Bun.serve({ port: config.port, fetch: async (request) => api.fetch(request) });
  const announce = async () => {
    logger.info(
      { [LogField.Port]: server.port },
      message(MessageId.LogListening, { port: server.port ?? 0 }),
    );
  };
  const stop = async () => {
    logger.info(message(MessageId.LogStopping));
    await server.stop();
    await telemetry.shutdown();
    logger.info(message(MessageId.LogStopped));
  };
  return { server, stop, announce, timeoutMs: config.shutdownTimeoutMs };
}

export async function runApi(
  env: Readonly<Record<string, string | undefined>> = Bun.env,
  exit: (code: number) => void = process.exit,
  listen: (signal: Signal, handler: () => Promise<void>) => Promise<void> = async (
    signal,
    handler,
  ) => {
    process.on(signal, handler);
  },
  start: typeof startApi = startApi,
) {
  const { server, stop, announce, timeoutMs } = await start(env);
  const shutdown = async () => {
    const forced = setTimeout(() => exit(FORCED_EXIT_CODE), timeoutMs);
    await stop();
    clearTimeout(forced);
    exit(CLEAN_EXIT_CODE);
  };
  await listen(Signal.Terminate, shutdown);
  await listen(Signal.Interrupt, shutdown);
  await announce();
  return { server, shutdown };
}

if (import.meta.main) await runApi();
