import { dirname, join } from "node:path";
import { containerNameOf } from "@platform/config/environments";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import {
  CADDY_DATA_FOLDER,
  CADDY_ROOT_CERTIFICATE,
  DEVELOPMENT_IMAGE,
  EnvironmentName,
  StackNetwork,
} from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { stackDown, stackUp } from "../../../../apps/infra/src/cli.ts";
import { runPodman } from "./proxy-fixtures.ts";
import { scopedApiFixture } from "./scoped-api-fixtures.ts";

export async function sdkProxySession() {
  const fixture = await scopedApiFixture(EnvironmentName.Test, 0, true);
  const server = { origin: TEST_PROXY_ORIGIN, stop: fixture.stop };
  return { issuer: fixture.issuer, server };
}

export async function sdkProxyRunner(
  tarball: string,
  variables: Readonly<Record<string, string>> = {},
) {
  const environment = EnvironmentName.Test;
  const network = await containerNameOf(environment, StackNetwork.Edge);
  const data = join(
    REPO_ROOT,
    ".stack/data",
    await containerNameOf(environment, CADDY_DATA_FOLDER),
  );
  return async (command: readonly string[], project: string) => {
    const result = await runPodman([
      "run",
      "--rm",
      "--userns=keep-id",
      "--network",
      network,
      "-v",
      `${data}:/pki:ro`,
      "-v",
      `${REPO_ROOT}:${REPO_ROOT}:ro`,
      "-v",
      `${dirname(tarball)}:${dirname(tarball)}:ro`,
      "-v",
      `${project}:${project}:rw`,
      "-w",
      project,
      "-e",
      `NODE_EXTRA_CA_CERTS=/pki${CADDY_ROOT_CERTIFICATE}`,
      ...Object.entries(variables).flatMap(([key, value]) => ["-e", `${key}=${value}`]),
      DEVELOPMENT_IMAGE,
      ...command,
    ]);
    if (result.exitCode !== 0) throw new Error(result.stderr + result.stdout);
    return result.stdout;
  };
}

export async function startSdkProxyHarness(tarball: string) {
  const execute = await sdkProxyRunner(tarball);
  if ((await stackUp(EnvironmentName.Test)) !== 0)
    throw new Error("SDK proxy stack failed to start");
  return {
    connect: sdkProxySession,
    execute,
    stop: async () => {
      if ((await stackDown(EnvironmentName.Test)) !== 0)
        throw new Error("SDK proxy stack failed to stop");
    },
  };
}
