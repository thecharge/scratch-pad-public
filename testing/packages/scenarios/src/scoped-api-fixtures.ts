import { chmod } from "node:fs/promises";
import { join } from "node:path";
import {
  API_IMAGE_REPOSITORY,
  containerNameOf,
  environmentFor,
} from "@platform/config/environments";
import { TEST_AUDIENCE, TEST_ISSUER } from "@platform/config/urls";
import { type EnvironmentName, StackNetwork, StackService, UI_PROXY } from "@platform/constants";
import { createTestIssuer, REPO_ROOT, waitUntil } from "@platform/test-framework";
import { all } from "@platform/util";
import { OBJECT_STORE_TEST_ENV, objectStoreRequest } from "./object-store-fixtures.ts";
import { runPodman } from "./proxy-fixtures.ts";

export async function scopedApiFixture(
  environment: EnvironmentName,
  reindexStepMs = 0,
  fixedClock = false,
  consoleDist?: string,
  scopes: readonly string[] = [],
  flags?: string,
) {
  if (consoleDist !== undefined) await chmod(consoleDist, UI_PROXY.StaticDirectoryMode);
  const original = await containerNameOf(environment, StackService.Api);
  const network = await containerNameOf(environment, StackNetwork.Backend);
  const fixture = `${original}-scoped-fixture`;
  const bundle = join(REPO_ROOT, ".stack/e2e/scoped-api.js");
  const build = Bun.spawn(
    [
      "bun",
      "build",
      join(REPO_ROOT, "testing/packages/scenarios/src/scoped-api-entry.ts"),
      "--target=bun",
      `--outfile=${bundle}`,
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  if ((await build.exited) !== 0) throw new Error("scoped API bundle failed");
  const inspected = await runPodman(["inspect", original, "--format", "{{json .Config.Env}}"]);
  const address = await runPodman([
    "inspect",
    original,
    "--format",
    `{{(index .NetworkSettings.Networks ${JSON.stringify(network)}).MacAddress}}`,
  ]);
  if (address.exitCode !== 0 || address.stdout.trim() === "") throw new Error(address.stderr);
  const env: string[] = JSON.parse(inspected.stdout);
  const inherited = env.filter(
    (value) =>
      (!value.startsWith("AUTH_") || value.startsWith("AUTH_RESOURCE=")) &&
      !value.startsWith("DATABASE_PATH="),
  );
  const issuer = await createTestIssuer(TEST_ISSUER, TEST_AUDIENCE);
  const granted =
    consoleDist === undefined ? undefined : await issuer.issue({ scopes: [...scopes] });
  const identity = [
    `AUTH_ENABLED=true`,
    `AUTH_PROVIDER=jwks`,
    `AUTH_ISSUER=${TEST_ISSUER}`,
    `AUTH_AUDIENCE=${TEST_AUDIENCE}`,
    `AUTH_JWKS_URL=${TEST_ISSUER}/keys`,
    "DATABASE_PATH=:memory:",
    `TEST_JWKS=${JSON.stringify(issuer.jwks)}`,
    `TEST_REINDEX_STEP_MS=${reindexStepMs}`,
    `TEST_FIXED_CLOCK=${fixedClock}`,
    ...(flags === undefined ? [] : [`FEATURE_FLAGS=${flags}`]),
    ...(consoleDist === undefined
      ? []
      : ["TEST_UI_DIST=/app/ui", `TEST_UI_TOKEN=${granted ?? ""}`]),
  ];
  const configured = await environmentFor(environment, undefined, OBJECT_STORE_TEST_ENV);
  const detached = await runPodman(["network", "disconnect", "--force", network, original]);
  if (detached.exitCode !== 0) throw new Error(detached.stderr);
  const stopped = await runPodman(["stop", original]);
  if (stopped.exitCode !== 0) throw new Error(stopped.stderr);
  const started = await runPodman([
    "run",
    "-d",
    "--name",
    fixture,
    "--network",
    network,
    "--ip",
    configured.backend.apiAddress,
    "--network-alias",
    "api",
    "--mac-address",
    address.stdout.trim(),
    "-v",
    `${bundle}:/app/dist/scoped-api.js:ro`,
    ...(consoleDist === undefined ? [] : ["-v", `${consoleDist}:/app/ui:ro`]),
    ...[...inherited, ...identity].flatMap((value) => ["-e", value]),
    `${API_IMAGE_REPOSITORY}:${environment}`,
    "bun",
    "/app/dist/scoped-api.js",
  ]);
  if (started.exitCode !== 0) {
    await runPodman(["rm", "-f", fixture]);
    await runPodman([
      "network",
      "connect",
      "--mac-address",
      address.stdout.trim(),
      "--ip",
      configured.backend.apiAddress,
      "--alias",
      "api",
      network,
      original,
    ]);
    await runPodman(["start", original]);
    throw new Error(started.stderr);
  }
  let last = { stdout: "", stderr: "", exitCode: -1 };
  try {
    await waitUntil(async () => {
      last = await objectStoreRequest(
        environment,
        "GET",
        "/v1/config",
        ["-H", "Accept: application/json"],
        false,
        "proxy",
      );
      return last.stdout.trim().endsWith("200");
    }, 30_000);
  } catch (error) {
    const logs = await runPodman(["logs", fixture]);
    const inspected = await runPodman([
      "inspect",
      fixture,
      "--format",
      "{{json .NetworkSettings}}",
    ]);
    const proxy = await runPodman(["logs", await containerNameOf(environment, StackService.Proxy)]);
    await runPodman(["rm", "-f", fixture]);
    await runPodman([
      "network",
      "connect",
      "--mac-address",
      address.stdout.trim(),
      "--ip",
      configured.backend.apiAddress,
      "--alias",
      "api",
      network,
      original,
    ]);
    await runPodman(["start", original]);
    throw new Error(JSON.stringify({ last, logs, inspected, proxy }), { cause: error });
  }
  const ownerSubject = `asset-owner-${crypto.randomUUID()}`;
  const otherSubject = `other-owner-${crypto.randomUUID()}`;
  const [owner, other, reader] = await all([
    async () => issuer.issue({ subject: ownerSubject, scopes: ["read", "write", "admin"] }),
    async () => issuer.issue({ subject: otherSubject, scopes: ["read", "write"] }),
    async () => issuer.issue({ subject: ownerSubject, scopes: ["read"] }),
  ]);
  return {
    issuer,
    owner: owner ?? "",
    other: other ?? "",
    reader: reader ?? "",
    async stop() {
      await runPodman(["rm", "-f", fixture]);
      await runPodman([
        "network",
        "connect",
        "--mac-address",
        address.stdout.trim(),
        "--ip",
        configured.backend.apiAddress,
        "--alias",
        "api",
        network,
        original,
      ]);
      await runPodman(["start", original]);
    },
  };
}
