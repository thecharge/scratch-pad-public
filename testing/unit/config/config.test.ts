import { describe, expect, test } from "bun:test";
import { type ConfigError, loadConfig } from "@platform/config";
import { AuthProviderKind, ConfigIssueCode, EnvVar } from "@platform/constants";
import { thrownBy } from "@platform/test-framework";

const SECRET = "x".repeat(40);
const SHORT_SECRET = "short-secret-value";
const AUTH_ON = { [EnvVar.AuthEnabled]: "true" };

describe("loadConfig defaults", async () => {
  const config = await loadConfig({});

  test("describe a local development setup with auth off", () => {
    expect(config.auth.enabled).toBe(false);
    expect(config.port).toBe(3000);
  });

  test("use the AIP-158 style page limits", () => {
    expect(config.pagination).toEqual({ defaultPageSize: 50, maxPageSize: 1000 });
  });
});

describe("loadConfig skill directories", () => {
  test.each([
    ["default to the skills package", {}, ["./packages/skills/skills"]],
    ["take a comma separated list", { [EnvVar.SkillDirs]: "./one, ./two" }, ["./one", "./two"]],
    ["may be empty", { [EnvVar.SkillDirs]: "" }, []],
  ])("%s", async (_name, env, expected) => {
    expect((await loadConfig(env)).skillDirs).toEqual(expected);
  });
});

describe("loadConfig accepts", () => {
  test("an explicit production decision to keep auth off", async () => {
    const config = await loadConfig({
      [EnvVar.AppEnv]: "production",
      [EnvVar.AuthEnabled]: "false",
    });
    expect(config.auth.enabled).toBe(false);
  });

  test("Better Auth with a long enough secret", async () => {
    const config = await loadConfig({ ...AUTH_ON, [EnvVar.BetterAuthSecret]: SECRET });
    expect(config.auth.provider).toBe(AuthProviderKind.BetterAuth);
  });
});

describe("loadConfig rejects", () => {
  test.each([
    [
      "production without an auth decision",
      { [EnvVar.AppEnv]: "production" },
      EnvVar.AuthEnabled,
      ConfigIssueCode.Required,
    ],
    ["auth on without a secret", AUTH_ON, EnvVar.BetterAuthSecret, ConfigIssueCode.Required],
    [
      "auth on with a short secret",
      { ...AUTH_ON, [EnvVar.BetterAuthSecret]: SHORT_SECRET },
      EnvVar.BetterAuthSecret,
      ConfigIssueCode.TooShort,
    ],
    [
      "a localhost trusted origin in production",
      {
        [EnvVar.AppEnv]: "production",
        [EnvVar.AuthEnabled]: "false",
        [EnvVar.TrustedOrigins]: "https://app.example.com, http://localhost:5173",
      },
      EnvVar.TrustedOrigins,
      ConfigIssueCode.NotAllowed,
    ],
    [
      "a port that is not a number",
      { [EnvVar.Port]: "not-a-number" },
      EnvVar.Port,
      ConfigIssueCode.Invalid,
    ],
    [
      "a default page size above the maximum",
      { [EnvVar.PageSizeDefault]: "500", [EnvVar.PageSizeMax]: "100" },
      EnvVar.PageSizeDefault,
      ConfigIssueCode.Invalid,
    ],
  ])("%s", async (_name, environment, variable, code) => {
    expect(await thrownBy(async () => loadConfig(environment))).toMatchObject({
      issues: [{ variable, code }],
    });
  });

  test("the jwks provider without issuer, JWKS URL and audience", async () => {
    const error = (await thrownBy(async () =>
      loadConfig({ ...AUTH_ON, [EnvVar.AuthProvider]: "jwks" }),
    )) as ConfigError;
    expect(error.issues.map((issue) => issue.variable).sort()).toEqual(
      [EnvVar.AuthAudience, EnvVar.AuthIssuer, EnvVar.AuthJwksUrl].sort(),
    );
  });

  test("without ever echoing a secret value", async () => {
    const error = (await thrownBy(async () =>
      loadConfig({ ...AUTH_ON, [EnvVar.BetterAuthSecret]: SHORT_SECRET }),
    )) as ConfigError;
    expect(error.message + JSON.stringify(error.issues)).not.toContain(SHORT_SECRET);
  });
});
