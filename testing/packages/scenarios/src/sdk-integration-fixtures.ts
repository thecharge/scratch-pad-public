import { chmod, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  API_BACKEND_ALIAS,
  API_PORT,
  CADDY_IMAGE,
  CHECKS_IMAGE_REPOSITORY,
  environmentFor,
  HTTP_SCHEME,
  PROXY_HOST,
} from "@platform/config/environments";
import {
  CADDY_ROOT_CERTIFICATE,
  CHECKS_CONTAINERFILE,
  COVERAGE_DIR_FLAG,
  COVERAGE_FLAGS,
  DEVELOPMENT_IMAGE,
  DigestEncoding,
  EnvironmentName,
  GUIDE_RAW_DIRECTORY,
  HashAlgorithm,
  JUNIT_FILE,
  JUNIT_FLAG,
  JUNIT_OUTFILE_FLAG,
  METRICS_REPORT_DIR_ENV,
  TEST_CHILD_REPORT_DIR_ENV,
} from "@platform/constants";
import { REPO_ROOT, waitUntil } from "@platform/test-framework";
import { all } from "@platform/util";
import { renderCaddyfile } from "../../../../apps/infra/src/caddy.ts";
import { runPodman } from "./proxy-fixtures.ts";

async function checked(args: readonly string[]) {
  const result = await runPodman(args);
  if (result.exitCode !== 0) throw new Error(result.stderr + result.stdout);
  return result;
}

async function measuredFlags(target: string | undefined, child: string) {
  if (target === undefined) return [];
  const directory = join(target, child);
  await mkdir(directory, { recursive: true });
  return [
    ...COVERAGE_FLAGS,
    `${COVERAGE_DIR_FLAG}${directory}`,
    JUNIT_FLAG,
    `${JUNIT_OUTFILE_FLAG}${join(directory, JUNIT_FILE)}`,
  ];
}

async function clientImage(entry: string) {
  if (!entry.includes("mcp-clients")) return DEVELOPMENT_IMAGE;
  const source = await Bun.file(join(REPO_ROOT, CHECKS_CONTAINERFILE)).text();
  const digest = new Bun.CryptoHasher(HashAlgorithm.Sha256)
    .update(source)
    .digest(DigestEncoding.Hex);
  return `${CHECKS_IMAGE_REPOSITORY}:${digest}`;
}

export async function runSdkIntegration(
  entry = "testing/integration/sdk/sdk-client.ts",
  backendEntry = "testing/packages/scenarios/src/sdk-integration-api.ts",
  sharedDirectories: readonly string[] = [],
  clientEnvironment: Readonly<Record<string, string>> = {},
) {
  const folder = await mkdtemp(join(tmpdir(), "sdk-integration-"));
  const name = `sdk-integration-${crypto.randomUUID()}`;
  const edge = `${name}-edge`;
  const backend = `${name}-backend`;
  const server = `${name}-api`;
  const proxy = `${name}-proxy`;
  const secret = crypto.randomUUID();
  const environment = await environmentFor(EnvironmentName.Test);
  const networks: string[] = [];
  const containers: string[] = [];
  const reports = Bun.env[TEST_CHILD_REPORT_DIR_ENV];
  const metrics = Bun.env[METRICS_REPORT_DIR_ENV];
  const rawGuides = join(REPO_ROOT, GUIDE_RAW_DIRECTORY);
  await mkdir(rawGuides, { recursive: true });
  const mounts = [folder, reports, metrics, rawGuides, ...sharedDirectories].filter(
    (value): value is string => value !== undefined,
  );
  const volumes = mounts.flatMap((directory) => ["-v", `${directory}:${directory}:rw`]);
  const source = ["-v", `${REPO_ROOT}:${REPO_ROOT}:ro`, "-w", REPO_ROOT];
  const certificate = `${folder}/pki${CADDY_ROOT_CERTIFICATE}`;
  try {
    await chmod(folder, 0o755);
    await mkdir(join(folder, "pki"), { recursive: true });
    await Bun.write(
      join(folder, "Caddyfile"),
      await renderCaddyfile({ ...environment.proxy, secret }, API_BACKEND_ALIAS, API_PORT),
    );
    await Bun.write(
      join(folder, "backend.test.ts"),
      `import ${JSON.stringify(join(REPO_ROOT, backendEntry))};`,
    );
    await Bun.write(
      join(folder, "client.test.ts"),
      `import ${JSON.stringify(join(REPO_ROOT, entry))};`,
    );
    await checked(["network", "create", "--opt", "isolate=true", edge]);
    networks.push(edge);
    await checked(["network", "create", "--internal", "--opt", "isolate=true", backend]);
    networks.push(backend);
    const instrumentation =
      metrics === undefined ? [] : ["-e", `${METRICS_REPORT_DIR_ENV}=${metrics}`];
    containers.push(server);
    await checked([
      "run",
      "-d",
      "--name",
      server,
      "--network",
      backend,
      "--network-alias",
      API_BACKEND_ALIAS,
      "-e",
      `FIXTURE_SECRET=${secret}`,
      "-e",
      `TMPDIR=${folder}`,
      ...instrumentation,
      ...volumes,
      ...source,
      DEVELOPMENT_IMAGE,
      "bun",
      "test",
      "--preload",
      join(REPO_ROOT, "testing/packages/framework/src/metrics-preload.ts"),
      ...(await measuredFlags(reports, `server/${basename(entry)}`)),
      join(folder, "backend.test.ts"),
    ]);
    const inspected = await checked([
      "inspect",
      server,
      "--format",
      `{{(index .NetworkSettings.Networks ${JSON.stringify(backend)}).IPAddress}}`,
    ]);
    const address = inspected.stdout.trim();
    if (address.length === 0) throw new Error("SDK backend address missing");
    containers.push(proxy);
    await checked([
      "run",
      "-d",
      "--name",
      proxy,
      "--network",
      backend,
      "--add-host",
      `${API_BACKEND_ALIAS}:${address}`,
      "-v",
      `${folder}/pki:/data:rw`,
      "-v",
      `${folder}/Caddyfile:/etc/caddy/Caddyfile:ro`,
      CADDY_IMAGE,
    ]);
    await checked(["network", "connect", "--alias", PROXY_HOST, edge, proxy]);
    const proxyAddress = await checked([
      "inspect",
      proxy,
      "--format",
      `{{(index .NetworkSettings.Networks ${JSON.stringify(edge)}).IPAddress}}`,
    ]);
    const proxyIp = proxyAddress.stdout.trim();
    if (proxyIp.length === 0) throw new Error("SDK proxy address missing");
    await waitUntil(async () => Bun.file(certificate).exists());
    const result = await runPodman([
      "run",
      "--rm",
      "--userns=keep-id",
      "--network",
      edge,
      "--add-host",
      `${PROXY_HOST}:${proxyIp}`,
      ...volumes,
      ...source,
      "-e",
      `TMPDIR=${folder}`,
      "-e",
      `NODE_EXTRA_CA_CERTS=${certificate}`,
      "-e",
      `SDK_BACKEND_ORIGIN=${HTTP_SCHEME}${address}:${API_PORT}`,
      ...Object.entries(clientEnvironment).flatMap(([key, value]) => ["-e", `${key}=${value}`]),
      await clientImage(entry),
      "bun",
      "test",
      ...(await measuredFlags(reports, `client/${basename(entry)}`)),
      join(folder, "client.test.ts"),
    ]);
    console.log(result.stdout + result.stderr);
    if (result.exitCode !== 0) {
      const logs = await checked(["logs", server]);
      console.log(logs.stdout + logs.stderr);
      throw new Error("SDK proxy integration failed");
    }
    const waited = await checked(["wait", server]);
    const logs = await checked(["logs", server]);
    console.log(logs.stdout + logs.stderr);
    if (waited.stdout.trim() !== "0") throw new Error("SDK backend coverage process failed");
    return result.exitCode;
  } finally {
    await cleanupSdkIntegration(folder, containers, networks);
  }
}

async function cleanupSdkIntegration(
  folder: string,
  containers: readonly string[],
  networks: readonly string[],
) {
  const removed = await all(
    containers.map((container) => async () => runPodman(["rm", "-f", "--ignore", container])),
  );
  const disconnected = await all(
    networks.map((network) => async () => runPodman(["network", "rm", network])),
  );
  await rm(folder, { recursive: true, force: true });
  if ([...removed, ...disconnected].some((result) => result.exitCode !== 0))
    throw new Error("SDK proxy cleanup failed");
}
