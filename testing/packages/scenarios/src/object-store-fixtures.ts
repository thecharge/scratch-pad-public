import { join } from "node:path";
import {
  CURL_IMAGE_REPOSITORY,
  containerNameOf,
  HTTPS_SCHEME,
  OBJECT_STORE_HOSTS,
  PROXY_PORT,
} from "@platform/config/environments";
import {
  CADDY_DATA_FOLDER,
  CADDY_ROOT_CERTIFICATE,
  type EnvironmentName,
  STACK_DATA_DIR,
  STACK_DIR,
  StackNetwork,
} from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { runPodman } from "./proxy-fixtures.ts";

export const OBJECT_STORE_TEST_ENV = {
  RUSTFS_ACCESS_KEY: "fixture-access",
  RUSTFS_SECRET_KEY: "fixture-secret-for-object-store",
};

export async function setObjectStoreEnvironment(
  values: Readonly<Record<string, string | undefined>>,
): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete Bun.env[key];
    else Bun.env[key] = value;
  }
}

export async function objectStoreRequest(
  environment: EnvironmentName,
  method: string,
  path: string,
  extra: readonly string[] = [],
  signed = true,
  host = OBJECT_STORE_HOSTS[environment],
) {
  const edge = await containerNameOf(environment, StackNetwork.Edge);
  const data = join(
    REPO_ROOT,
    STACK_DIR,
    STACK_DATA_DIR,
    await containerNameOf(environment, CADDY_DATA_FOLDER),
  );
  const authentication = signed
    ? [
        "--aws-sigv4",
        "aws:amz:us-east-1:s3",
        "--user",
        `${OBJECT_STORE_TEST_ENV.RUSTFS_ACCESS_KEY}:${OBJECT_STORE_TEST_ENV.RUSTFS_SECRET_KEY}`,
      ]
    : [];
  return runPodman([
    "run",
    "--rm",
    "--network",
    edge,
    "-v",
    `${data}:/pki:ro`,
    "-v",
    `${REPO_ROOT}:${REPO_ROOT}:ro`,
    `${CURL_IMAGE_REPOSITORY}:latest`,
    "--cacert",
    `/pki${CADDY_ROOT_CERTIFICATE}`,
    "--max-time",
    "30",
    "-sS",
    "-X",
    method,
    "-w",
    "\n%{http_code}",
    ...authentication,
    ...extra,
    `${HTTPS_SCHEME}${host}:${PROXY_PORT}${path}`,
  ]);
}
