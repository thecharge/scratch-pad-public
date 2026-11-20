import { LOOPBACK_ORIGIN, loopbackOrigin } from "@platform/config/urls";
import {
  AuthProviderKind,
  BetterAuthPath,
  CLEAN_EXIT_CODE,
  EndpointPath,
  EnvVar,
  FORCED_EXIT_CODE,
  Signal,
} from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { createTestIssuer, freePort, waitUntil } from "@platform/test-framework";
import { runApi, startApi } from "../../../apps/api/src/main.ts";

const SECRET = "unit-test-secret-value-at-least-32-characters";
const JWKS_ISSUER = await createTestIssuer();

async function envOn(extra: Record<string, string> = {}) {
  const port = await freePort();
  return {
    port,
    env: {
      [EnvVar.Port]: String(port),
      [EnvVar.DatabasePath]: ":memory:",
      [EnvVar.AuthResource]: await loopbackOrigin(port),
      ...extra,
    },
  };
}

const plain = await envOn();
const jwks = await envOn({
  [EnvVar.AuthEnabled]: "true",
  [EnvVar.AuthProvider]: AuthProviderKind.Jwks,
  [EnvVar.AuthIssuer]: JWKS_ISSUER.issuer,
  [EnvVar.AuthAudience]: JWKS_ISSUER.audience,
  [EnvVar.AuthJwksUrl]: `${LOOPBACK_ORIGIN}:1/jwks`,
});
const betterAuth = await envOn({
  [EnvVar.AuthEnabled]: "true",
  [EnvVar.AuthProvider]: AuthProviderKind.BetterAuth,
  [EnvVar.BetterAuthSecret]: SECRET,
});
const flagged = await envOn({ [EnvVar.FeatureFlags]: "books-suggest=true" });

const statusOf =
  (port: number, path: string) => async (started: Awaited<ReturnType<typeof startApi>>) => {
    const response = await fetch(`${LOOPBACK_ORIGIN}:${port}${path}`);
    await started.stop();
    return response.status;
  };

unit(startApi, {
  positive: [
    positive(
      "the api serves its document on the configured port",
      [plain.env],
      seen(statusOf(plain.port, EndpointPath.OpenApi), 200),
    ),
    positive(
      "a feature flag from the environment is accepted",
      [flagged.env],
      seen(statusOf(flagged.port, EndpointPath.OpenApi), 200),
    ),
    positive(
      "a key set provider starts with auth on",
      [jwks.env],
      seen(statusOf(jwks.port, EndpointPath.OpenApi), 200),
    ),
    positive(
      "better auth is mounted when it is the provider",
      [betterAuth.env],
      seen(statusOf(betterAuth.port, `${BetterAuthPath.Base}${BetterAuthPath.Jwks}`), 200),
    ),
  ],
  negative: [
    negative("a port that is not a number is refused", [{ [EnvVar.Port]: "x" }], {
      name: "ConfigError",
    }),
    negative("auth on without a secret is refused", [{ [EnvVar.AuthEnabled]: "true" }], {
      name: "ConfigError",
    }),
  ],
});

const exits: number[] = [];
const signals: Signal[] = [];
const exitWith = (code: number) => {
  exits.push(code);
};
const listenTo = async (signal: Signal) => {
  signals.push(signal);
};
const quick = await envOn();
const shutting = await envOn();
const defaulted = await envOn();
const forcedExits: number[] = [];
const forcedExit = (code: number) => {
  forcedExits.push(code);
};
const slowStart = async () =>
  ({
    server: {},
    timeoutMs: 1,
    announce: async () => undefined,
    stop: async () => {
      await waitUntil(() => forcedExits.includes(FORCED_EXIT_CODE));
    },
  }) as never;

unit(runApi, {
  positive: [
    positive(
      "the shutdown handler is registered for terminate and interrupt",
      [quick.env, exitWith, listenTo],
      seen(
        async (running: Awaited<ReturnType<typeof runApi>>) => {
          await running.shutdown();
          return signals;
        },
        [Signal.Terminate, Signal.Interrupt],
      ),
    ),
    positive(
      "the default listener registers the shutdown with the process",
      [defaulted.env, exitWith],
      seen(async (running: Awaited<ReturnType<typeof runApi>>) => {
        const registered = process.listeners(Signal.Terminate).includes(running.shutdown);
        process.removeListener(Signal.Terminate, running.shutdown);
        process.removeListener(Signal.Interrupt, running.shutdown);
        await running.shutdown();
        return registered;
      }, true),
    ),
    positive(
      "a shutdown stops the server and exits cleanly",
      [shutting.env, exitWith, listenTo],
      seen(async (running: Awaited<ReturnType<typeof runApi>>) => {
        await running.shutdown();
        return exits.at(-1);
      }, CLEAN_EXIT_CODE),
    ),
  ],
  negative: [
    rejected(
      "a stop that takes too long forces the exit first",
      [{}, forcedExit, listenTo, slowStart],
      seen(
        async (running: Awaited<ReturnType<typeof runApi>>) => {
          await running.shutdown();
          return forcedExits;
        },
        [FORCED_EXIT_CODE, CLEAN_EXIT_CODE],
      ),
    ),
    negative("an invalid environment is refused", [{ [EnvVar.Port]: "x" }, exitWith, listenTo], {
      name: "ConfigError",
    }),
  ],
});
