import { dirname, join } from "node:path";
import {
  CURL_IMAGE_REPOSITORY,
  containerNameOf,
  DEX_ADMIN_EMAIL,
  DEX_ADMIN_PASSWORD,
  DEX_BACKEND_ALIAS,
  DEX_CLIENT_ID,
  DEX_CLIENT_SECRET,
  DEX_PATH,
  DEX_PORT,
  HTTP_SCHEME,
  HTTPS_SCHEME,
  PROXY_HOST,
  PROXY_PORT,
} from "@platform/config/environments";
import {
  CADDY_DATA_FOLDER,
  CADDY_ROOT_CERTIFICATE,
  CONTAINERS_FILE,
  DEX_CLIENT_FIELD,
  DEX_GRANT_FIELD,
  DEX_PASSWORD_FIELD,
  DEX_PASSWORD_GRANT,
  DEX_SCOPE_FIELD,
  DEX_SECRET_FIELD,
  DEX_TOKEN_PATH,
  DEX_TOKEN_SCOPE,
  DEX_USER_FIELD,
  type EnvironmentName,
  PROTOCOL_REPORT_ENV,
  STACK_DATA_DIR,
  STACK_DIR,
  StackNetwork,
  StackService,
} from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import {
  ContainerUsageListSchema,
  type LoadRun,
  LoadSampleSchema,
  type ProxyAnswer,
  ProxyAnswerSchema,
  TokenAnswerSchema,
} from "@platform/types";
import { all } from "@platform/util";

export const CURL_WRITE_OUT = "\n%{http_version} %{http_code} %{ssl_verify_result}";
const PKI_MOUNT = "/pki";

async function podman(args: readonly string[]) {
  const proc = Bun.spawn(["podman", ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout = "", stderr = ""] = await all([
    async () => new Response(proc.stdout).text(),
    async () => new Response(proc.stderr).text(),
  ]);
  return { stdout, stderr, exitCode: await proc.exited };
}

export async function runPodman(args: readonly string[]) {
  return podman(args);
}

export async function proxyCurl(
  environment: EnvironmentName,
  flag: string,
  path: string,
  headers: readonly string[] = [],
): Promise<ProxyAnswer> {
  const edge = await containerNameOf(environment, StackNetwork.Edge);
  const data = join(
    REPO_ROOT,
    STACK_DIR,
    STACK_DATA_DIR,
    await containerNameOf(environment, CADDY_DATA_FOLDER),
  );
  const result = await podman([
    "run",
    "--rm",
    "--network",
    edge,
    "-v",
    `${data}:${PKI_MOUNT}:ro`,
    `${CURL_IMAGE_REPOSITORY}:latest`,
    "--cacert",
    `${PKI_MOUNT}${CADDY_ROOT_CERTIFICATE}`,
    flag,
    "-sS",
    "-w",
    CURL_WRITE_OUT,
    ...headers.flatMap((header) => ["-H", header]),
    `${HTTPS_SCHEME}${PROXY_HOST}:${PROXY_PORT}${path}`,
  ]);
  const lines = result.stdout.split("\n");
  const [httpVersion = "", status = "0", verify = "-1"] = (lines.pop() ?? "").split(" ");
  return ProxyAnswerSchema.parse({
    httpVersion,
    status: Number(status),
    verify: Number(verify),
    body: lines.join("\n"),
  });
}

export async function curlFromEdge(
  environment: EnvironmentName,
  url: string,
  seconds = 4,
): Promise<number> {
  const edge = await containerNameOf(environment, StackNetwork.Edge);
  const result = await podman([
    "run",
    "--rm",
    "--network",
    edge,
    `${CURL_IMAGE_REPOSITORY}:latest`,
    "-sS",
    "--max-time",
    String(seconds),
    url,
  ]);
  return result.exitCode;
}

export const LOAD_WRITE_OUT = "%{time_starttransfer} %{time_total} %{http_code} %{http_version}\n";

export async function proxyLoad(
  environment: EnvironmentName,
  flag: string,
  path: string,
  requests: number,
  parallel: number,
): Promise<LoadRun> {
  const edge = await containerNameOf(environment, StackNetwork.Edge);
  const data = join(
    REPO_ROOT,
    STACK_DIR,
    STACK_DATA_DIR,
    await containerNameOf(environment, CADDY_DATA_FOLDER),
  );
  const started = performance.now();
  const result = await podman([
    "run",
    "--rm",
    "--network",
    edge,
    "-v",
    `${data}:${PKI_MOUNT}:ro`,
    `${CURL_IMAGE_REPOSITORY}:latest`,
    "--cacert",
    `${PKI_MOUNT}${CADDY_ROOT_CERTIFICATE}`,
    flag,
    "-sS",
    "-o",
    "/dev/null",
    "--parallel",
    "--parallel-max",
    String(parallel),
    "-w",
    LOAD_WRITE_OUT,
    `${HTTPS_SCHEME}${PROXY_HOST}:${PROXY_PORT}{${Array.from({ length: requests }, () => path).join(",")}}`,
  ]);
  const wallMs = performance.now() - started;
  const samples = result.stdout
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => line.split(" "))
    .map(([first = "0", second = "0", status = "0", httpVersion = ""]) =>
      LoadSampleSchema.parse({
        ttfbMs: Number(first) * 1000,
        totalMs: Number(second) * 1000,
        status: Number(status),
        httpVersion,
      }),
    );
  return { samples, wallMs };
}

export async function execInContainer(_container: string, args: readonly string[]) {
  return podman(["exec", ...args]);
}

export async function adminToken(environment: EnvironmentName): Promise<string> {
  const backend = await containerNameOf(environment, StackNetwork.Backend);
  const form = [
    [DEX_GRANT_FIELD, DEX_PASSWORD_GRANT],
    [DEX_USER_FIELD, DEX_ADMIN_EMAIL],
    [DEX_PASSWORD_FIELD, DEX_ADMIN_PASSWORD],
    [DEX_SCOPE_FIELD, DEX_TOKEN_SCOPE],
    [DEX_CLIENT_FIELD, DEX_CLIENT_ID],
    [DEX_SECRET_FIELD, DEX_CLIENT_SECRET],
  ]
    .map(([name, value]) => [name, encodeURIComponent(value as string)].join("="))
    .join("&");
  const result = await podman([
    "run",
    "--rm",
    "--network",
    backend,
    `${CURL_IMAGE_REPOSITORY}:latest`,
    "-sS",
    "-d",
    form,
    `${HTTP_SCHEME}${DEX_BACKEND_ALIAS}:${DEX_PORT}${DEX_PATH}${DEX_TOKEN_PATH}`,
  ]);
  return TokenAnswerSchema.parse(JSON.parse(result.stdout)).id_token;
}

export async function startStream(
  environment: EnvironmentName,
  name: string,
  flag: string,
  path: string,
  token: string,
  seconds: number,
): Promise<void> {
  const edge = await containerNameOf(environment, StackNetwork.Edge);
  const data = join(
    REPO_ROOT,
    STACK_DIR,
    STACK_DATA_DIR,
    await containerNameOf(environment, CADDY_DATA_FOLDER),
  );
  await podman([
    "run",
    "-d",
    "--name",
    name,
    "--network",
    edge,
    "-v",
    `${data}:${PKI_MOUNT}:ro`,
    `${CURL_IMAGE_REPOSITORY}:latest`,
    "--cacert",
    `${PKI_MOUNT}${CADDY_ROOT_CERTIFICATE}`,
    flag,
    "-sS",
    "-N",
    "--max-time",
    String(seconds),
    "-H",
    `Authorization: Bearer ${token}`,
    "-H",
    "Accept: text/event-stream",
    "-w",
    "\n%{http_version} %{http_code}",
    `${HTTPS_SCHEME}${PROXY_HOST}:${PROXY_PORT}${path}`,
  ]);
}

export async function containerOutput(name: string): Promise<string> {
  return (await podman(["logs", name])).stdout;
}

export async function removeContainer(name: string): Promise<void> {
  await podman(["rm", "-f", name]);
}

export async function proxyRequest(
  environment: EnvironmentName,
  flag: string,
  path: string,
  headers: readonly string[],
): Promise<number> {
  const edge = await containerNameOf(environment, StackNetwork.Edge);
  const data = join(
    REPO_ROOT,
    STACK_DIR,
    STACK_DATA_DIR,
    await containerNameOf(environment, CADDY_DATA_FOLDER),
  );
  const result = await podman([
    "run",
    "--rm",
    "--network",
    edge,
    "-v",
    `${data}:${PKI_MOUNT}:ro`,
    `${CURL_IMAGE_REPOSITORY}:latest`,
    "--cacert",
    `${PKI_MOUNT}${CADDY_ROOT_CERTIFICATE}`,
    flag,
    "-sS",
    "-o",
    "/dev/null",
    "-w",
    "%{http_code}",
    ...headers.flatMap((header) => ["-H", header]),
    `${HTTPS_SCHEME}${PROXY_HOST}:${PROXY_PORT}${path}`,
  ]);
  return Number(result.stdout);
}

export async function proxyErrorLines(environment: EnvironmentName): Promise<string[]> {
  const name = await containerNameOf(environment, StackService.Proxy);
  const logs = await podman(["logs", name]);
  return logs.stderr
    .split("\n")
    .filter((line) => line.includes('"level":"error"'))
    .map((line) => line.slice(0, 400));
}

export async function waitForContainer(name: string): Promise<void> {
  await podman(["wait", name]);
}

export async function containerUsage(names: readonly string[]) {
  if (names.length === 0) return [];
  const result = await podman(["stats", "--no-stream", "--format", "json", ...names]);
  return ContainerUsageListSchema.parse(JSON.parse(result.stdout));
}

export async function recordContainerUsage(
  environment: EnvironmentName,
  services: readonly string[],
): Promise<boolean[]> {
  const names = await all(
    services.map((service) => async () => containerNameOf(environment, service)),
  );
  const usage = await containerUsage(names);
  const report = Bun.env[PROTOCOL_REPORT_ENV];
  if (report !== undefined) {
    await Bun.write(join(dirname(report), CONTAINERS_FILE), JSON.stringify(usage));
  }
  return names.map((name) => usage.some((item) => item.name === name && item.mem_usage.length > 0));
}
