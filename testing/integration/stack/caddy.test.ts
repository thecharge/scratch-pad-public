import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { CADDY_IMAGE, environmentFor } from "@platform/config/environments";
import { CADDY_CONFIG_PATH, EnvironmentName } from "@platform/constants";
import {
  makeDir,
  removeAll,
  runPodman,
  TEST_PROXY_SECRET,
  writeFiles,
} from "@platform/test-scenarios";
import { planFor } from "../../../apps/infra/src/plan.ts";

afterAll(removeAll);

const VALID = "Valid configuration";
const CONTAINER_MS = 60_000;
const ROOT = "/work/repo";

async function validate(content: string) {
  const directory = await makeDir();
  await writeFiles(directory, { Caddyfile: content });
  return runPodman([
    "run",
    "--rm",
    "-v",
    `${join(directory, "Caddyfile")}:${CADDY_CONFIG_PATH}:ro,Z`,
    CADDY_IMAGE,
    "caddy",
    "validate",
    "--config",
    CADDY_CONFIG_PATH,
    "--adapter",
    "caddyfile",
  ]);
}

const ACCEPTED = [0, true, ""];
const outcomeOf = (result: Awaited<ReturnType<typeof validate>>) => [
  result.exitCode,
  result.stdout.includes(VALID),
  result.exitCode === 0 ? "" : result.stderr,
];

async function rendered(name: EnvironmentName): Promise<string> {
  const plan = await planFor(await environmentFor(name, TEST_PROXY_SECRET), ROOT);
  return plan.containers.find((item) => item.name.endsWith("-proxy"))?.uploads[0]?.content ?? "";
}

describe("the rendered proxy configuration is valid for Caddy itself", () => {
  test.each([EnvironmentName.Development, EnvironmentName.Test])(
    "%s",
    async (name) => {
      const result = await validate(await rendered(name));
      expect(outcomeOf(result)).toEqual(ACCEPTED);
    },
    CONTAINER_MS,
  );

  test(
    "production, with a public host",
    async () => {
      const base = await environmentFor(EnvironmentName.Production, TEST_PROXY_SECRET);
      const plan = await planFor(
        { ...base, proxy: { ...base.proxy, host: "api.example.test" } },
        ROOT,
      );
      const content = plan.containers[0]?.uploads[0]?.content ?? "";
      const result = await validate(content);
      expect(outcomeOf(result)).toEqual(ACCEPTED);
    },
    CONTAINER_MS,
  );

  test(
    "a configuration that is not valid is refused",
    async () => {
      const result = await validate("proxy:8443 {\n\treverse_proxy\n\tnot_a_directive\n}\n");
      expect(result.exitCode).not.toBe(0);
    },
    CONTAINER_MS,
  );
});
