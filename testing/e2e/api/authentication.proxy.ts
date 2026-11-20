import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AuthProviderKind,
  CheckKind,
  E2E_TEST_TIMEOUT_MS,
  StepFlag,
  TransportKind,
} from "@platform/constants";
import { recordAll, runScenario, scenarios } from "@platform/kb-recorder";
import type { Scenario } from "@platform/types";
import { all } from "@platform/util";
import {
  finishProxyIntegration,
  proxyBackendRefused,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

setDefaultTimeout(E2E_TEST_TIMEOUT_MS);

const CASES = [
  "Call without a token",
  "Call with a token that has the read scope",
  "Create a book with a token that has too little scope",
  "Call with a token that has expired",
  "Call with a token issued for another audience",
];
const CHALLENGED_CASES = [0, 3, 4];
const directories: string[] = [];

afterAll(async () => {
  await finishProxyIntegration();
  await all(
    directories.map((directory) => async () => rm(directory, { recursive: true, force: true })),
  );
});

function authScenario(provider: AuthProviderKind): Scenario {
  return scenarios().find((scenario) => scenario.provider === provider) as Scenario;
}

describe.each([[AuthProviderKind.Jwks], [AuthProviderKind.BetterAuth]])(
  "authentication with %s",
  (provider) => {
    test.each([[TransportKind.Http], [TransportKind.Mcp]])(
      "all five cases pass over %s with the declared status and challenge",
      async (transport) => {
        const results = await runScenario(authScenario(provider), transport);
        expect(results.map((result) => [result.description, result.flag])).toEqual(
          CASES.map((name) => [name, StepFlag.Passed]),
        );
        const challenged = results.filter((result) =>
          result.checks.some((check) => check.kind === CheckKind.Challenge),
        );
        expect(challenged.map((result) => result.description)).toEqual(
          CASES.filter((_name, index) => CHALLENGED_CASES.includes(index)),
        );
      },
    );

    test("the generated page shows each case with its flag and the challenge", async () => {
      const directory = await mkdtemp(join(tmpdir(), "auth-docs-"));
      directories.push(directory);
      const [path] = await recordAll([authScenario(provider)], directory);
      const text = await Bun.file(path as string).text();
      expect(CASES.every((name) => text.includes(name))).toBe(true);
      expect(text).toContain("Flag: **PASSED**");
      expect(text).toContain("The HTTP status is 401");
      expect(text).toContain("The HTTP status is 403");
      expect(text).toContain("oauth-protected-resource");
      expect(text).not.toContain("Flag: **FAILED**");
    });
  },
);

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
