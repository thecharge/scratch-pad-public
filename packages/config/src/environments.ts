import {
  CertificateSource,
  CONTAINER_NAME_PREFIX,
  EnvironmentName,
  OBJECT_STORE_ACCESS_ENV,
  OBJECT_STORE_HOST_ENV,
  OBJECT_STORE_SECRET_ENV,
  STACK_NAME_SEPARATOR,
  StackService,
} from "@platform/constants";
import {
  type BenchOperation,
  type StackEnvironment,
  StackEnvironmentSchema,
  type StaticBuild,
} from "@platform/types";
import { z } from "zod";

export const CADDY_IMAGE =
  "docker.io/library/caddy@sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5";
export const API_IMAGE_REPOSITORY = "localhost/platform/api";
export const CURL_IMAGE_REPOSITORY = "localhost/platform/curl-h3";
export const CHECKS_IMAGE_REPOSITORY = "localhost/platform/checks";
export const OBJECT_STORE_IMAGE =
  "docker.io/rustfs/rustfs:1.0.4@sha256:ed9210d6411d77ffceb70d94b964a3cb7d225983368bc25bebe01e995293dcc2";
export const OBJECT_STORE_WEBSITE_PREFIX = "sites.";
export const OBJECT_STORE_ALIAS = "object-store";
export const OBJECT_STORE_PORT = 9000;
export const OBJECT_STORE_BIND_HOST = "0.0.0.0";
export const OBJECT_STORE_ADDRESSES: Readonly<Record<EnvironmentName, string>> = {
  [EnvironmentName.Development]: "10.91.1.13",
  [EnvironmentName.Test]: "10.91.2.13",
  [EnvironmentName.Production]: "10.91.3.13",
};
export const OBJECT_STORE_HOSTS: Readonly<Record<EnvironmentName, string>> = {
  [EnvironmentName.Development]: "assets.localhost",
  [EnvironmentName.Test]: "assets.proxy",
  [EnvironmentName.Production]: "",
};
export const HTTPS_SCHEME = "https://";
export const GITHUB_ORIGIN = "https://github.com";
export const HTTP_SCHEME = "http://";
export const PROXY_HOST = "proxy";
export const PROXY_PORT = 8443;
export const PUBLIC_PROXY_PORT = 443;
export const API_PORT = 3000;
export const API_BACKEND_ALIAS = "api";
export const DEX_IMAGE =
  "ghcr.io/dexidp/dex@sha256:65b72ca0f4b0bf6d4ada84ec21da8851782563404ac7b8f926923d27ceced9ab";
export const DEX_BACKEND_ALIAS = "dex";
export const DEX_PORT = 5556;
export const DEX_PATH = "/dex";
export const DEX_REDIRECT_URI = `${HTTP_SCHEME}localhost/callback`;
export const DEX_CLIENT_ID = "platform-test";
export const DEX_CLIENT_SECRET = "platform-test-client-secret";
export const DEX_ADMIN_EMAIL = "admin@example.test";
export const DEX_ADMIN_PASSWORD = "test-admin-password";
export const DEX_ADMIN_HASH = "$2b$10$lz//3e24PC/24KlQWzEjFuA/3CaBFCjxa3GyymsGPECT47tBfp0dq";
export const DEX_ADMIN_GROUPS: readonly string[] = ["admin"];
export const DEX_ISSUER = `${HTTP_SCHEME}${DEX_BACKEND_ALIAS}:${DEX_PORT}${DEX_PATH}`;

const DEVELOPMENT: StackEnvironment = {
  name: EnvironmentName.Development,
  backend: { subnet: "10.91.1.0/24", apiAddress: "10.91.1.10" },
  proxy: {
    host: PROXY_HOST,
    port: PROXY_PORT,
    certificates: CertificateSource.Internal,
    published: [PROXY_PORT],
  },
  api: { port: API_PORT, authEnabled: false },
  sourceMount: true,
  testServices: false,
  developmentApps: [
    {
      service: StackService.Console,
      host: "console.localhost",
      address: "10.91.1.11",
      port: 5173,
      command: [
        "bun",
        "run",
        "--cwd",
        "/app/apps/console",
        "dev",
        "--host",
        "0.0.0.0",
        "--port",
        "5173",
        "--strictPort",
      ],
    },
    {
      service: StackService.Docs,
      host: "docs.localhost",
      address: "10.91.1.12",
      port: 4321,
      command: [
        "bun",
        "run",
        "--cwd",
        "/app/apps/docs",
        "dev",
        "--host",
        "0.0.0.0",
        "--port",
        "4321",
      ],
    },
  ],
};

const TEST: StackEnvironment = {
  name: EnvironmentName.Test,
  backend: { subnet: "10.91.2.0/24", apiAddress: "10.91.2.10" },
  proxy: {
    host: PROXY_HOST,
    port: PROXY_PORT,
    certificates: CertificateSource.Internal,
    published: [],
  },
  api: { port: API_PORT, authEnabled: true },
  sourceMount: false,
  testServices: true,
  developmentApps: [],
  identity: {
    image: DEX_IMAGE,
    alias: DEX_BACKEND_ALIAS,
    port: DEX_PORT,
    path: DEX_PATH,
    clientId: DEX_CLIENT_ID,
    clientSecret: DEX_CLIENT_SECRET,
    email: DEX_ADMIN_EMAIL,
    passwordHash: DEX_ADMIN_HASH,
    groups: [...DEX_ADMIN_GROUPS],
  },
};

const PRODUCTION: StackEnvironment = {
  name: EnvironmentName.Production,
  backend: { subnet: "10.91.3.0/24", apiAddress: "10.91.3.10" },
  proxy: {
    host: PROXY_HOST,
    port: PUBLIC_PROXY_PORT,
    certificates: CertificateSource.Public,
    published: [PUBLIC_PROXY_PORT],
  },
  api: { port: API_PORT, authEnabled: true },
  sourceMount: false,
  testServices: false,
  developmentApps: [],
};

const BY_NAME: Readonly<Record<EnvironmentName, StackEnvironment>> = {
  [EnvironmentName.Development]: DEVELOPMENT,
  [EnvironmentName.Test]: TEST,
  [EnvironmentName.Production]: PRODUCTION,
};

export async function environmentFor(
  name: EnvironmentName,
  secret?: string,
  env: Readonly<Record<string, string | undefined>> = {},
): Promise<StackEnvironment> {
  const base = BY_NAME[name];
  const configured = secret === undefined ? base : { ...base, proxy: { ...base.proxy, secret } };
  const enabled =
    env[OBJECT_STORE_ACCESS_ENV] !== undefined || env[OBJECT_STORE_SECRET_ENV] !== undefined;
  const objectStore = enabled
    ? {
        image: OBJECT_STORE_IMAGE,
        alias: OBJECT_STORE_ALIAS,
        address: OBJECT_STORE_ADDRESSES[name],
        port: OBJECT_STORE_PORT,
        host: env[OBJECT_STORE_HOST_ENV] ?? OBJECT_STORE_HOSTS[name],
        websiteDomain:
          OBJECT_STORE_WEBSITE_PREFIX + (env[OBJECT_STORE_HOST_ENV] ?? OBJECT_STORE_HOSTS[name]),
        websites: [StackService.Console, StackService.Docs].map((bucket) => ({
          bucket,
          host: `${bucket}.${OBJECT_STORE_WEBSITE_PREFIX}${env[OBJECT_STORE_HOST_ENV] ?? OBJECT_STORE_HOSTS[name]}`,
          fallback: bucket === StackService.Console,
        })),
        accessKey: env[OBJECT_STORE_ACCESS_ENV],
        secretKey: env[OBJECT_STORE_SECRET_ENV],
      }
    : undefined;
  return StackEnvironmentSchema.parse({ ...configured, objectStore });
}

export async function containerNameOf(environment: EnvironmentName, part: string): Promise<string> {
  return [
    CONTAINER_NAME_PREFIX,
    z.enum(EnvironmentName).parse(environment),
    z.string().min(1).parse(part),
  ].join(STACK_NAME_SEPARATOR);
}

export const BENCH_SUBNET = "10.91.9.0/24";
export const BENCH_API_ADDRESS = "10.91.9.10";
export const BENCH_BARE_ADDRESS = "10.91.9.11";
export const BENCH_BASELINE_ADDRESS = "10.91.9.12";
export const BENCH_OPERATIONS: readonly BenchOperation[] = [
  { name: "read", method: "GET", path: "/v1/config", requests: 2000, levels: [1, 32] },
  {
    name: "list",
    method: "GET",
    path: "/v1/logs",
    requests: 1000,
    levels: [1, 32],
  },
  {
    name: "write",
    method: "PATCH",
    path: "/v1/config",
    body: '{"bannerText":"bench"}',
    requests: 500,
    levels: [1, 32],
  },
  {
    name: "stream",
    method: "GET",
    path: "/v1/events",
    maxTime: 1,
    requests: 64,
    levels: [32],
  },
  {
    name: "long-running",
    method: "GET",
    path: "/v1/{operation}",
    requests: 1000,
    levels: [1, 32],
  },
];

export const STATIC_BUILDS: readonly StaticBuild[] = [
  {
    service: StackService.Console,
    image: "localhost/platform/console-static",
    containerfile: "apps/infra/containers/console/Containerfile",
  },
  {
    service: StackService.Docs,
    image: "localhost/platform/docs-static",
    containerfile: "apps/infra/containers/docs/Containerfile",
  },
];
