import { expect, test } from "bun:test";
import { join } from "node:path";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { SDK_INSTALLED_ENTRY, SDK_STEPS_FILE, StepFlag } from "@platform/constants";
import { runSdkScenario, sdkScenarios } from "@platform/kb-recorder";
import { createTestIssuer } from "@platform/test-framework";
import type { SdkScenario, SdkTokenStep } from "@platform/types";

const scenario = sdkScenarios()[0] as SdkScenario;

test.each([
  ["successful proxy session", "success", "passed"],
  ["recorded typed API failure", "missing", "failed"],
  ["package installation failure", "install", "error"],
  ["consumer process failure", "consume", "error"],
  ["malformed consumer output", "malformed", "error"],
])("SDK execution cleans its injected session after %s", async (_name, mode, expected) => {
  const stopped: boolean[] = [];
  const origins: string[] = [];
  const issuer = await createTestIssuer();
  const server = {
    origin: TEST_PROXY_ORIGIN,
    stop: async () => {
      stopped.push(true);
    },
  };
  const connect = async () => ({ issuer, server });
  const execute = async (command: readonly string[], project: string) => {
    const install = async () =>
      mode === "install" ? Promise.reject(new Error("stub installation failure")) : "installed";
    const consume = async () => {
      origins.push(command[3] ?? "");
      const steps: SdkTokenStep[] = await Bun.file(join(project, SDK_STEPS_FILE)).json();
      expect(steps.every((step) => step.token.length > 0)).toBe(true);
      const observed = steps.map(() => ({ ok: mode !== "missing", body: {} }));
      const output = JSON.stringify({ entry: join(project, SDK_INSTALLED_ENTRY), observed });
      const values = { malformed: "invalid JSON" };
      return mode === "consume"
        ? Promise.reject(new Error("stub consumer failure"))
        : mode === "malformed"
          ? values.malformed
          : output;
    };
    return command[1] === "add" ? install() : consume();
  };
  const result = await runSdkScenario(scenario, "fixture.tgz", connect, execute).then(
    (steps) => (steps.every((step) => step.flag === StepFlag.Passed) ? "passed" : "failed"),
    () => "error",
  );
  expect([result, stopped.length]).toEqual([expected, 1]);
  expect(origins.every((origin) => origin === TEST_PROXY_ORIGIN)).toBe(true);
});
