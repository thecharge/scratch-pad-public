import { DEFAULT_ERROR_DOMAIN, loopbackOrigin } from "@platform/config/urls";
import { EnvVar } from "@platform/constants";

const SECRET = "x".repeat(40);
export const AUTH_ON = { [EnvVar.AuthEnabled]: "true" };
const WITH_SECRET = { ...AUTH_ON, [EnvVar.BetterAuthSecret]: SECRET };

export const DEFAULTS = {
  env: "development",
  port: 3000,
  logLevel: "info",
  errorDomain: DEFAULT_ERROR_DOMAIN,
  auth: {
    enabled: false,
    provider: "better-auth",
    resource: await loopbackOrigin(3000),
    trustedOrigins: [],
  },
  databasePath: "./data/app.sqlite",
  pagination: { defaultPageSize: 50, maxPageSize: 1000 },
  shutdownTimeoutMs: 10000,
  skillDirs: ["./packages/skills/skills"],
  flags: {},
};
export const SECURED = {
  ...DEFAULTS,
  port: 4000,
  auth: {
    ...DEFAULTS.auth,
    enabled: true,
    resource: await loopbackOrigin(4000),
    betterAuthSecret: SECRET,
  },
  flags: { beta: true, gamma: false },
};
export const SECURED_ENV = {
  ...WITH_SECRET,
  [EnvVar.Port]: "4000",
  [EnvVar.FeatureFlags]: "beta=true, gamma=false, =true",
};
