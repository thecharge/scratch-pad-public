import { join } from "node:path";
import {
  API_IMAGE_REPOSITORY,
  API_PORT,
  BENCH_API_ADDRESS,
  BENCH_BARE_ADDRESS,
  BENCH_BASELINE_ADDRESS,
  BENCH_OPERATIONS,
  BENCH_SUBNET,
  CADDY_IMAGE,
  CURL_IMAGE_REPOSITORY,
  containerNameOf,
  environmentFor,
  HTTP_SCHEME,
  HTTPS_SCHEME,
  PROXY_HOST,
  PROXY_PORT,
} from "@platform/config/environments";
import {
  BENCH_API_LEG,
  BENCH_BARE_LEG,
  BENCH_BARE_PATH,
  BENCH_BARE_PORT,
  BENCH_BARE_SCRIPT,
  BENCH_BASELINE_LEG,
  BENCH_EVIDENCE_DIR,
  BENCH_EVIDENCE_FILE,
  BENCH_FLAGS,
  BENCH_H1_FLAG,
  BENCH_H2_FLAG,
  BENCH_H3_FLAG,
  BENCH_JSON_HEADER,
  BENCH_NETWORK_SUFFIX,
  BENCH_OPERATION_PLACEHOLDER,
  BENCH_READ_OPERATION,
  BENCH_REPEATS,
  BENCH_ROWS_FILE,
  BENCH_START_PATH,
  BENCH_STREAM_OPERATION,
  CADDY_CONFIG_PATH,
  CADDY_DATA_FOLDER,
  CADDY_DATA_PATH,
  CADDY_ROOT_CERTIFICATE,
  DEFAULT_BANNER_TEXT,
  EnvironmentName,
  Glyph,
  HttpHeader,
  MediaType,
  STACK_DATA_DIR,
  STACK_DIR,
  StackNetwork,
  StackService,
  Text,
} from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import {
  type BenchOperation,
  type BenchReport,
  type BenchRow,
  type BenchTarget,
  type BenchWhere,
  type ContainerUsage,
  type LoadRun,
  LoadSampleSchema,
  StartedOperationSchema,
  StatsSnapshotSchema,
} from "@platform/types";
import { renderCaddyfile } from "../../../../apps/infra/src/caddy.ts";
import { stackDown, stackUp } from "../../../../apps/infra/src/cli.ts";
import { benchProblems, benchTable, medianRow, rowOf } from "./bench-report.ts";
import { adminToken, containerUsage, LOAD_WRITE_OUT, runPodman } from "./proxy-fixtures.ts";
import { TEST_PROXY_SECRET } from "./stack-fixtures.ts";

const PROXY_SECRET_ENV = "PROXY_SECRET=";
const PKI_MOUNT = "/pki";
const BENCH_DIR = join(REPO_ROOT, STACK_DIR, "bench");
const READY_ATTEMPTS = 150;
const READY_STEP_MS = 200;
const MS_PER_SECOND = 1000;
const CURL_FLAGS = ["-sS", "-o", "/dev/null", "--parallel"];

async function podmanOk(args: readonly string[]): Promise<string> {
  const result = await runPodman(args);
  if (result.exitCode !== 0) {
    throw new Error(`${args.join(Glyph.Space)}: ${result.stderr}`);
  }
  return result.stdout;
}

async function curlArgs(
  target: BenchTarget,
  operation: BenchOperation,
  token: string,
  path: string,
  requests: number,
  parallel: number,
): Promise<string[]> {
  const accept = operation.name === "stream" ? MediaType.EventStream : MediaType.Json;
  return [
    "run",
    "--rm",
    "--network",
    target.network,
    ...(target.data === undefined ? [] : ["-v", `${target.data}:${PKI_MOUNT}:ro`]),
    `${CURL_IMAGE_REPOSITORY}:latest`,
    ...(target.data === undefined ? [] : ["--cacert", `${PKI_MOUNT}${CADDY_ROOT_CERTIFICATE}`]),
    ...(target.resolve === undefined ? [] : ["--resolve", target.resolve]),
    target.flag,
    ...CURL_FLAGS,
    "--parallel-max",
    String(parallel),
    "-X",
    operation.method,
    "-H",
    `${HttpHeader.Accept}: ${accept}`,
    "-H",
    `${HttpHeader.Authorization}: Bearer ${token}`,
    ...(target.marker === undefined ? [] : ["-H", `${HttpHeader.ProxyMarker}: ${target.marker}`]),
    ...(operation.body === undefined ? [] : ["-H", BENCH_JSON_HEADER, "-d", operation.body]),
    ...(operation.maxTime === undefined ? [] : ["--max-time", String(operation.maxTime)]),
    "-w",
    LOAD_WRITE_OUT,
    `${target.base}{${Array.from({ length: requests }, () => path).join(",")}}`,
  ];
}

async function load(
  target: BenchTarget,
  operation: BenchOperation,
  token: string,
  path: string,
  requests: number,
  parallel: number,
): Promise<LoadRun> {
  const started = performance.now();
  const result = await runPodman(
    await curlArgs(target, operation, token, path, requests, parallel),
  );
  const wallMs = performance.now() - started;
  const samples = result.stdout
    .split(Text.Newline)
    .filter((line) => line.length > 0)
    .map((line) => line.split(Glyph.Space))
    .map(([first = "0", second = "0", status = "0", httpVersion = Text.Empty]) =>
      LoadSampleSchema.parse({
        ttfbMs: Number(first) * MS_PER_SECOND,
        totalMs: Number(second) * MS_PER_SECOND,
        status: Number(status),
        httpVersion,
      }),
    );
  return { samples, wallMs };
}

async function rowFor(
  target: BenchTarget,
  operation: BenchOperation,
  token: string,
  path: string,
  parallel: number,
): Promise<BenchRow> {
  await load(target, operation, token, path, parallel * 2, parallel);
  const idle = await load(target, operation, token, path, 1, 1);
  const run = await load(target, operation, token, path, operation.requests, parallel);
  const startup = idle.wallMs - (idle.samples[0]?.totalMs ?? 0);
  return rowOf(
    operation.name,
    target.leg,
    parallel,
    run.samples.map((sample) => sample.totalMs),
    run.samples.map((sample) => sample.ttfbMs),
    run.samples.map((sample) => sample.status),
    run.wallMs - startup,
  );
}

async function repeated(
  target: BenchTarget,
  operation: BenchOperation,
  token: string,
  path: string,
  parallel: number,
): Promise<BenchRow> {
  const rows: BenchRow[] = [];
  for (let attempt = 0; attempt < BENCH_REPEATS; attempt += 1) {
    rows.push(await rowFor(target, operation, token, path, parallel));
  }
  return medianRow(rows);
}

async function waitFor(path: string): Promise<void> {
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
    if (await Bun.file(path).exists()) {
      return;
    }
    await Bun.sleep(READY_STEP_MS);
  }
  throw new Error(path);
}

async function usageOf(label: string, names: readonly string[]) {
  return (await containerUsage(names)).map((item) => ({
    ...item,
    name: `${item.name} (${label})`,
  }));
}

async function secretOf(api: string): Promise<string> {
  const out = await podmanOk([
    "inspect",
    api,
    "--format",
    "{{range .Config.Env}}{{println .}}{{end}}",
  ]);
  const line = out.split(Text.Newline).find((entry) => entry.startsWith(PROXY_SECRET_ENV));
  return (line ?? Text.Empty).slice(PROXY_SECRET_ENV.length);
}

async function startedOperation(network: string, token: string, secret: string): Promise<string> {
  const out = await podmanOk([
    "run",
    "--rm",
    "--network",
    network,
    `${CURL_IMAGE_REPOSITORY}:latest`,
    "-sS",
    "-X",
    "POST",
    "-H",
    BENCH_JSON_HEADER,
    "-d",
    "{}",
    "-H",
    `${HttpHeader.Accept}: ${MediaType.Json}`,
    "-H",
    `${HttpHeader.Authorization}: Bearer ${token}`,
    "-H",
    `${HttpHeader.ProxyMarker}: ${secret}`,
    `${HTTP_SCHEME}${BENCH_API_ADDRESS}:${API_PORT}${BENCH_START_PATH}`,
  ]);
  return StartedOperationSchema.parse(JSON.parse(out)).name;
}

async function restoreConfig(network: string, token: string, secret: string): Promise<void> {
  await podmanOk([
    "run",
    "--rm",
    "--network",
    network,
    `${CURL_IMAGE_REPOSITORY}:latest`,
    "-sS",
    "-X",
    "PATCH",
    "-H",
    BENCH_JSON_HEADER,
    "-d",
    JSON.stringify({ bannerText: DEFAULT_BANNER_TEXT }),
    "-H",
    `${HttpHeader.Accept}: ${MediaType.Json}`,
    "-H",
    `${HttpHeader.Authorization}: Bearer ${token}`,
    "-H",
    `${HttpHeader.ProxyMarker}: ${secret}`,
    `${HTTP_SCHEME}${BENCH_API_ADDRESS}:${API_PORT}/v1/config`,
  ]);
}

async function statsOf(network: string, token: string, secret: string) {
  const out = await podmanOk([
    "run",
    "--rm",
    "--network",
    network,
    `${CURL_IMAGE_REPOSITORY}:latest`,
    "-sS",
    "-H",
    `${HttpHeader.Accept}: ${MediaType.Json}`,
    "-H",
    `${HttpHeader.Authorization}: Bearer ${token}`,
    "-H",
    `${HttpHeader.ProxyMarker}: ${secret}`,
    `${HTTP_SCHEME}${BENCH_API_ADDRESS}:${API_PORT}/v1/stats`,
  ]);
  const parsed = StatsSnapshotSchema.safeParse(JSON.parse(out));
  if (!parsed.success) {
    throw new Error(out);
  }
  return parsed.data;
}

async function legsOf(where: BenchWhere): Promise<BenchTarget[]> {
  const proxyBase = `${HTTPS_SCHEME}${PROXY_HOST}:${PROXY_PORT}`;
  return [
    ...BENCH_FLAGS.map(([flag, leg]) => ({
      leg,
      network: where.edge,
      base: proxyBase,
      flag,
      data: where.proxyData,
      marker: undefined,
    })),
    {
      leg: BENCH_API_LEG,
      network: where.network,
      base: `${HTTP_SCHEME}${BENCH_API_ADDRESS}:${API_PORT}`,
      flag: BENCH_H1_FLAG,
      marker: where.secret,
    },
  ];
}

async function baselinesOf(where: BenchWhere): Promise<BenchTarget[]> {
  return [
    {
      leg: BENCH_BARE_LEG,
      network: where.network,
      base: `${HTTP_SCHEME}${BENCH_BARE_ADDRESS}:${BENCH_BARE_PORT}`,
      flag: BENCH_H1_FLAG,
      marker: undefined,
    },
    {
      leg: BENCH_BASELINE_LEG,
      network: where.network,
      base: `${HTTPS_SCHEME}${PROXY_HOST}:${PROXY_PORT}`,
      flag: BENCH_H2_FLAG,
      data: where.baselineData,
      resolve: `${PROXY_HOST}:${PROXY_PORT}:${BENCH_BASELINE_ADDRESS}`,
      marker: undefined,
    },
  ];
}

async function levelRows(
  where: BenchWhere,
  operation: BenchOperation,
  parallel: number,
): Promise<BenchRow[]> {
  const path = operation.path.replace(BENCH_OPERATION_PLACEHOLDER, where.started);
  const targets = (await legsOf(where)).filter(
    (target) => !(operation.name === BENCH_STREAM_OPERATION && target.flag === BENCH_H3_FLAG),
  );
  const rows: BenchRow[] = [];
  for (const target of targets) {
    rows.push(await repeated(target, operation, where.token, path, parallel));
  }
  for (const target of operation.name === BENCH_READ_OPERATION ? await baselinesOf(where) : []) {
    rows.push(await repeated(target, operation, where.token, BENCH_BARE_PATH, parallel));
  }
  return rows;
}

async function operationRows(where: BenchWhere, operation: BenchOperation): Promise<BenchRow[]> {
  const rows: BenchRow[] = [];
  for (const parallel of operation.levels) {
    rows.push(...(await levelRows(where, operation, parallel)));
  }
  return rows;
}

export async function runBench(): Promise<number> {
  const up = await stackUp(EnvironmentName.Test);
  if (up !== 0) {
    return up;
  }
  const api = await containerNameOf(EnvironmentName.Test, StackService.Api);
  const network = await containerNameOf(EnvironmentName.Test, BENCH_NETWORK_SUFFIX);
  const bare = await containerNameOf(EnvironmentName.Test, `${BENCH_NETWORK_SUFFIX}-bare`);
  const baseline = await containerNameOf(EnvironmentName.Test, `${BENCH_NETWORK_SUFFIX}-caddy`);
  const proxy = await containerNameOf(EnvironmentName.Test, StackService.Proxy);
  const identity = await containerNameOf(EnvironmentName.Test, StackService.Identity);
  const edge = await containerNameOf(EnvironmentName.Test, StackNetwork.Edge);
  const proxyData = join(
    REPO_ROOT,
    STACK_DIR,
    STACK_DATA_DIR,
    await containerNameOf(EnvironmentName.Test, CADDY_DATA_FOLDER),
  );
  const baselineData = join(BENCH_DIR, "data");
  const rows: BenchRow[] = [];
  const usage: ContainerUsage[] = [];
  let report: BenchReport | undefined;
  try {
    const token = await adminToken(EnvironmentName.Test);
    const secret = await secretOf(api);
    const environment = await environmentFor(EnvironmentName.Test, TEST_PROXY_SECRET);
    await Bun.$`rm -rf ${BENCH_DIR}`.quiet();
    await Bun.write(
      join(BENCH_DIR, "Caddyfile"),
      await renderCaddyfile(environment.proxy, BENCH_BARE_ADDRESS, BENCH_BARE_PORT),
    );
    await Bun.$`mkdir -p ${baselineData}`.quiet();
    await podmanOk(["network", "create", "--internal", "--subnet", BENCH_SUBNET, network]);
    await podmanOk(["network", "connect", "--ip", BENCH_API_ADDRESS, network, api]);
    await podmanOk([
      "run",
      "-d",
      "--name",
      bare,
      "--network",
      network,
      "--ip",
      BENCH_BARE_ADDRESS,
      "--entrypoint",
      "bun",
      `${API_IMAGE_REPOSITORY}:${EnvironmentName.Test}`,
      "-e",
      BENCH_BARE_SCRIPT,
    ]);
    await podmanOk([
      "run",
      "-d",
      "--name",
      baseline,
      "--network",
      network,
      "--ip",
      BENCH_BASELINE_ADDRESS,
      "-v",
      `${join(BENCH_DIR, "Caddyfile")}:${CADDY_CONFIG_PATH}:ro,Z`,
      "-v",
      `${baselineData}:${CADDY_DATA_PATH}:Z`,
      CADDY_IMAGE,
    ]);
    await waitFor(join(baselineData, CADDY_ROOT_CERTIFICATE));
    const started = await startedOperation(network, token, secret);
    const where: BenchWhere = {
      edge,
      network,
      proxyData,
      baselineData,
      secret,
      token,
      started,
    };
    for (const operation of BENCH_OPERATIONS) {
      rows.push(...(await operationRows(where, operation)));
      usage.push(...(await usageOf(operation.name, [api, proxy, identity, bare, baseline])));
    }
    await Bun.write(
      join(REPO_ROOT, BENCH_EVIDENCE_DIR, BENCH_ROWS_FILE),
      JSON.stringify(rows, null, 2) + Text.Newline,
    );
    await restoreConfig(network, token, secret);
    const snapshot = await statsOf(network, token, secret);
    report = {
      rows,
      usage,
      stages: Object.fromEntries(
        Object.entries(snapshot.stages).map(([name, value]) => [name, value.totalMs / value.count]),
      ),
      server: Object.fromEntries(
        Object.entries(snapshot.operations).map(([name, value]) => [
          name,
          value.firstByteTotalMs / value.count,
        ]),
      ),
    };
  } finally {
    await runPodman(["rm", "-f", bare, baseline]);
    await runPodman(["network", "disconnect", "-f", network, api]);
    await runPodman(["network", "rm", "-f", network]);
    await stackDown(EnvironmentName.Test);
  }
  if (report === undefined) {
    return 1;
  }
  const file = join(REPO_ROOT, BENCH_EVIDENCE_DIR, BENCH_EVIDENCE_FILE);
  await Bun.write(file, JSON.stringify(report, null, 2) + Text.Newline);
  console.log(await benchTable(report));
  const problems = await benchProblems(report.rows);
  for (const problem of problems) {
    console.error(problem);
  }
  return problems.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(await runBench());
