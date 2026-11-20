import { join } from "node:path";
import { containerNameOf } from "@platform/config/environments";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import {
  CADDY_DATA_FOLDER,
  CADDY_ROOT_CERTIFICATE,
  DEVELOPMENT_IMAGE,
  type EnvironmentName,
  StackNetwork,
} from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { runPodman } from "./proxy-fixtures.ts";

export async function assetSdkProxy(
  environment: EnvironmentName,
  token: string,
  path: string,
  checksum: string,
  otherToken: string,
) {
  return runProxyClient(environment, "asset-client", [path, checksum], {
    TEST_ASSET_API_ORIGIN: TEST_PROXY_ORIGIN,
    TEST_ASSET_TOKEN: token,
    TEST_ASSET_OTHER_TOKEN: otherToken,
  });
}

export async function runProxyClient(
  environment: EnvironmentName,
  entry: string,
  args: readonly string[],
  variables: Record<string, string>,
  runnerArgs: readonly string[] = [],
) {
  const suffix = runnerArgs.includes("test") ? ".test.js" : ".js";
  const bundle = join(REPO_ROOT, `.stack/e2e/${entry}${suffix}`);
  const build = Bun.spawn(
    [
      "bun",
      "build",
      join(REPO_ROOT, `testing/packages/scenarios/src/${entry}-entry.ts`),
      "--target=bun",
      `--outfile=${bundle}`,
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  if ((await build.exited) !== 0) throw new Error("asset SDK bundle failed");
  const data = join(
    REPO_ROOT,
    ".stack/data",
    await containerNameOf(environment, CADDY_DATA_FOLDER),
  );
  return runPodman([
    "run",
    "--rm",
    "--network",
    await containerNameOf(environment, StackNetwork.Edge),
    "-v",
    `${data}:/pki:ro`,
    "-v",
    `${REPO_ROOT}:${REPO_ROOT}:ro`,
    "-e",
    `NODE_EXTRA_CA_CERTS=/pki${CADDY_ROOT_CERTIFICATE}`,
    ...Object.entries(variables).flatMap(([key, value]) => ["-e", `${key}=${value}`]),
    DEVELOPMENT_IMAGE,
    "bun",
    ...runnerArgs,
    bundle,
    ...args,
  ]);
}
