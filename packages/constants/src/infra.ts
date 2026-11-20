export enum EnvironmentName {
  Development = "development",
  Test = "test",
  Production = "production",
}

export enum CertificateSource {
  Internal = "internal",
  Public = "public",
}

export enum StackNetwork {
  Edge = "edge",
  Backend = "backend",
}

export enum StackService {
  Proxy = "proxy",
  Api = "api",
  Identity = "identity",
  Console = "console",
  Docs = "docs",
  ObjectStore = "object-store",
}

export const OBJECT_STORE_DATA_FOLDER = "object-store-data";
export const OBJECT_STORE_LOG_FOLDER = "object-store-logs";
export const OBJECT_STORE_DATA_PATH = "/data";
export const OBJECT_STORE_LOG_PATH = "/logs";
export const OBJECT_STORE_OWNER = "10001:10001";
export const OBJECT_STORE_ACCESS_ENV = "RUSTFS_ACCESS_KEY";
export const OBJECT_STORE_SECRET_ENV = "RUSTFS_SECRET_KEY";
export const OBJECT_STORE_HOST_ENV = "PLATFORM_ASSET_HOST";
export const OBJECT_STORE_ADDRESS_ENV = "RUSTFS_ADDRESS";
export const OBJECT_STORE_WEBSITE_ENV = "RUSTFS_WEBSITE_DOMAINS";
export const STATIC_SITE_INDEX = "index.html";
export const OBJECT_STORE_CONSOLE_ENV = "RUSTFS_CONSOLE_ENABLE";
export const OBJECT_STORE_ENV_KEYS = [
  OBJECT_STORE_ACCESS_ENV,
  OBJECT_STORE_SECRET_ENV,
  OBJECT_STORE_HOST_ENV,
] as const;

export enum PortProtocol {
  Tcp = "tcp",
  Udp = "udp",
}

export enum MountKind {
  Volume = "volume",
  Bind = "bind",
}

export const STACK_PROJECT = "platform";
export const STACK_CONFIG_ENVIRONMENT = "environment";
export const STACK_NAME_SEPARATOR = "-";
export const CADDY_CONFIG_PATH = "/etc/caddy/Caddyfile";
export const CADDY_DATA_PATH = "/data";
export const API_DATA_PATH = "/data";
export const API_SOURCE_PATH = "/app";
export const API_DATABASE_FILE = "/data/app.sqlite";
export const API_START_COMMAND = ["bun", "dist/main.js"] as const;
export const API_WATCH_COMMAND = ["bun", "--watch", "apps/api/src/main.ts"] as const;
export const CADDY_ROOT_CERTIFICATE = "/caddy/pki/authorities/local/root.crt";
export const PODMAN_SOCKET_PREFIX = "unix://";
export const CADDY_TLS_INTERNAL_LINE = "\ttls internal\n";
export const PUBLIC_HTTPS_PORT = 443;
export const PORT_SEPARATOR = ":";
export const CONTAINER_NAME_PREFIX = "platform";
export const CADDY_DATA_FOLDER = "caddy-data";
export const API_DATA_FOLDER = "api-data";
export const STACK_DATA_DIR = "data";
export const CADDY_DATA_OWNER = "0:0";
export const API_DATA_OWNER = "1000:1000";
export const STACK_IMAGE_LABEL = "platform.stack=true";
export const STACK_LABEL_FLAG = "--label";
export const STACK_FILTER_FLAG = "--filter";
export const PODMAN_FORCE_FLAG = "-f";
export const PODMAN_QUIET_FLAG = "-q";
export const PODMAN_ALL_FLAG = "-a";
export const PODMAN_NAME_FILTER = "name=^platform-";
export const PODMAN_DANGLING_FILTER = "dangling=true";
export const PODMAN_LABEL_FILTER = "label=platform.stack=true";
export const PODMAN_JSON_FORMAT = "json";
export const NO_LAYERS_FLAG = "--layers=false";
export const CACHED_LAYERS_FLAG = "--layers=true";
export const FROM_PATTERN = "^FROM";
export const GREP_NO_FILENAME_FLAG = "-h";
export const FROM_IMAGE_COLUMN = 1;
export const FROM_FIELD_SEPARATOR = " ";
export const EMPTY_BASE_IMAGE = "scratch";
export const IMAGE_SIZE_FORMAT = "{{.Size}}";
export const DU_BYTES_FLAGS = "-sb";
export const DU_SEPARATOR = "\t";
export const NETWORK_LIST = "ls";
export const NETWORK_NAME_FILTER = "name=^platform-";
export const NAME_FORMAT = "{{.Name}}";
export const PODMAN_FORMAT_FLAG = "--format";
export const REMOVE_RECURSIVE_FLAGS = ["-rf"] as const;
export const API_IMAGE_TAG_SEPARATOR = ":";
export const ENV_TRUE = "true";
export const ENV_FALSE = "false";
export const PROVIDER_NAME_PREFIX = "podman-";
export const STACK_CONFIG_PUBLIC_HOST = "publicHost";
export const STACK_CONFIG_SOCKET = "podmanSocket";
export const STACK_CONFIG_ROOT = "repositoryRoot";
export const STACK_CONFIG_API_IMAGE = "apiImageId";
export const IMAGE_ID_FORMAT = "{{.Id}}";
export const IMAGE_ID_LABEL = "platform.image";
export const PODMAN_SOCKET_FILE = "/podman/podman.sock";
export const XDG_RUNTIME_DIR_ENV = "XDG_RUNTIME_DIR";
export const REPOSITORY_ROOT_DEPTH = ["..", "..", ".."] as const;
export const ENV_ASSIGNMENT = "=";
export const IMAGE_RESOURCE_SUFFIX = "-image";
export const NETWORK_IGNORED_PROPERTY = "ipamOptions";

export enum PulumiCommand {
  Plugin = "plugin",
  Install = "install",
  Resource = "resource",
  Stack = "stack",
  Select = "select",
  Config = "config",
  Set = "set",
  Up = "up",
  Destroy = "destroy",
  Preview = "preview",
}

export const PODMAN_VERSION_FLAG = "--version";
export const PODMAN_INSTALL_COMMAND = "sudo apt-get -y install podman";
export const COMMAND_NOT_FOUND_EXIT = 127;
export const STACK_BUILD_ARG_FLAG = "--build-arg";
export const BUILD_ARG_PORT = "PORT";
export const BUILD_ARG_GITHUB = "GITHUB_ORIGIN";
export const BUILD_ARG_SEPARATOR = "=";

export enum PodmanCommand {
  Build = "build",
  Exec = "exec",
  Tag = "tag",
  Unshare = "unshare",
  Chown = "chown",
  Rm = "rm",
  Rmi = "rmi",
  Ps = "ps",
  Logs = "logs",
  Images = "images",
  Image = "image",
  Prune = "prune",
  Network = "network",
  Inspect = "inspect",
}

export enum StackAction {
  Up = "up",
  Down = "down",
  Check = "check",
  Prune = "prune",
  Status = "status",
  Logs = "logs",
  Reset = "reset",
  Tools = "tools",
}

export const DEVELOPMENT_IMAGE =
  "docker.io/oven/bun:1.3.10-alpine@sha256:32f1fcccb1523960b254c4f80973bee1a910d60be000a45c20c9129a1efcffee";
export const DEVELOPMENT_APPS = [StackService.Console, StackService.Docs] as const;
export const DEVELOPMENT_POLLING_ENV = "CHOKIDAR_USEPOLLING";
export const CONSOLE_API_ENV = "VITE_API_ORIGIN";
export const STACK_STATUS_FORMAT = "table {{.Names}}\t{{.Status}}\t{{.Ports}}";
export const STACK_LOG_TAIL_FLAG = "--tail";
export const STACK_LOG_TAIL = "200";
export const STACK_ENVIRONMENT_FILTER_PREFIX = "name=platform-";

export enum PulumiEnv {
  Backend = "PULUMI_BACKEND_URL",
  Passphrase = "PULUMI_CONFIG_PASSPHRASE",
  Home = "PULUMI_HOME",
  SkipUpdateCheck = "PULUMI_SKIP_UPDATE_CHECK",
  Path = "PATH",
  ProxySecret = "PLATFORM_PROXY_SECRET",
}

export const STACK_DIR = ".stack";
export const STACK_STATE_DIR = "state";
export const STACK_HOME_DIR = "home";
export const STACK_INFRA_DIR = "apps/infra";
export const STACK_FILE_BACKEND_PREFIX = "file://";
export const STACK_EMPTY_PASSPHRASE = "";
export const STACK_DOCKER_PLUGIN = "docker";
export const STACK_CHECKSUM_FLAG = "--checksum";
export const STACK_YES_FLAGS = ["--yes", "--skip-preview"] as const;
export const STACK_CREATE_FLAG = "--create";
export const STACK_FILE_FLAG = "-f";
export const STACK_CONTEXT_FLAG = "-t";
export const API_CONTAINERFILE = "apps/infra/containers/api/Containerfile";
export const CURL_CONTAINERFILE = "apps/infra/containers/curl-h3/Containerfile";
export const CURL_CONTEXT = "apps/infra/containers/curl-h3";
export const API_IMAGE_ROOT_CONTEXT = ".";
export const CURL_IMAGE_TAG = "latest";
export const READY_ATTEMPTS = 30;
export const READY_INTERVAL_MS = 1000;
export const READY_URL_PATH = "/v1/config";
export const WGET = "wget";
export const WGET_HEADER_FLAG = "--header";
export const HEADER_SEPARATOR = ": ";
export const HEX_ENCODING = "hex";
export const PROXY_SECRET_FILE = "proxy-secret";
export const PROXY_SECRET_BYTES = 32;
export const WGET_QUIET_FLAGS = ["-q", "-O", "/dev/null"] as const;
export const PUBLIC_HOST_ENV = "PLATFORM_PUBLIC_HOST";
export const API_BACKEND_PORT_SEPARATOR = ":";

export enum StackStepName {
  Watchers = "check development watcher availability",
  Podman = "check that Podman is installed",
  Tools = "install the stack tools",
  State = "prepare the state folder",
  Data = "prepare the data folders",
  ImageId = "give the stack the identity of the API image",
  Replaced = "remove the images that were replaced",
  RemoveContainers = "remove the containers of the stack",
  RemoveNetworks = "remove the networks of the stack",
  RemoveData = "remove the data folders and the state",
  RemoveImages = "remove the images of the stack",
  StaticBuild = "build the static application images",
  StaticPublish = "publish static applications through the proxy",
  ApiImage = "build the API image",
  CurlImage = "build the HTTP/3 client image",
  Plugin = "install the Docker provider plugin",
  Select = "select the stack",
  Environment = "set the environment",
  PublicHost = "set the public host",
  Create = "create the containers",
  Wait = "wait for the API",
  Remove = "remove the containers",
  Compare = "compare the containers with the program",
}
export const DEVELOPMENT_WATCH_ROOTS = ["apps/api/src", "packages"] as const;
export const CHECKS_CONTAINERFILE = "apps/infra/containers/checks/Containerfile";
export const CHECKS_RUN_FLAGS = ["--rm", "--userns=keep-id", "--cap-drop=all", "-i"] as const;
export const CHECKS_GIT_ENV_FLAGS = [
  "--env",
  "GIT_INDEX_FILE",
  "--env",
  "GIT_DIR",
  "--env",
  "GIT_WORK_TREE",
  "--env",
  "GIT_COMMON_DIR",
] as const;
export const CHECKS_WORKDIR_FLAG = "--workdir";
export const CHECKS_VOLUME_FLAG = "--volume";
export const CHECKS_STACK_FLAG = "--stack";
export const CHECKS_CONTAINER_ENV = "PLATFORM_CHECKS_CONTAINER";
export const CHECKS_TEMP_PREFIX = "platform-checks-";
export const CHECKS_TEMP_ENV = "TMPDIR";
export const CHECKS_ENGINE_ENV = "CONTAINER_HOST";
export const CHECKS_ENV_FLAG = "--env";
export const DATA_OWNER_FLAGS = [
  "--rm",
  "--network=none",
  "--user=0:0",
  "--cap-drop=all",
  "--cap-add=CHOWN",
] as const;
export const IMAGE_EXISTS_COMMAND = "exists";
export const IMAGE_ABSENT_EXIT = 1;
export const MKDIR_PARENTS_FLAG = "-p";
export const STACK_EXPECT_NO_CHANGES = "--expect-no-changes";

export const BENCH_REPEATS = 3;
export const BENCH_H1_FLAG = "--http1.1";
export const BENCH_H2_FLAG = "--http2";
export const BENCH_H3_FLAG = "--http3-only";
export const BENCH_READ_OPERATION = "read";
export const BENCH_STREAM_OPERATION = "stream";
export const BENCH_START_PATH = "/v1/publishers/bench/books:reindex";
export const BENCH_OPERATION_PLACEHOLDER = "{operation}";
export const BENCH_BARE_PORT = 3001;
export const BENCH_BARE_SCRIPT =
  'Bun.serve({ port: 3001, fetch: () => new Response("{}", { headers: { "content-type": "application/json" } }) })';
export const BENCH_NETWORK_SUFFIX = "bench";
export const BENCH_BARE_LEG = "bare Bun server, direct";
export const BENCH_BASELINE_LEG = "bare Bun server behind Caddy, HTTP/2";
export const BENCH_API_LEG = "API, direct on the benchmark network";
export const BENCH_BARE_PATH = "/";
export const BENCH_JSON_HEADER = "content-type: application/json";
export const BENCH_FLAGS: readonly (readonly [string, string])[] = [
  ["--http1.1", "HTTP/1.1 through the proxy"],
  ["--http2", "HTTP/2 through the proxy"],
  ["--http3-only", "HTTP/3 through the proxy"],
];
export const BENCH_ROWS_FILE = "7.4-benchmark-rows.json";
export const BENCH_EVIDENCE_FILE = "7.4-benchmark.json";
export const BENCH_EVIDENCE_DIR = ".stack/benchmarks";
export const BENCH_ROUND_DIGITS = 2;

export const DEX_CONFIG_PATH = "/etc/dex/config.yaml";
export const DEX_START_COMMAND: readonly string[] = ["dex", "serve", "/etc/dex/config.yaml"];
export const DEX_KEYS_PATH = "/keys";
export const DEX_TOKEN_PATH = "/token";
export const DEX_TOKEN_SCOPE = "openid groups email";
export const DEX_PASSWORD_GRANT = "password";
export const DEX_USER_ID = "11111111-1111-1111-1111-111111111111";
export const DEX_GRANT_FIELD = "grant_type";
export const DEX_USER_FIELD = "username";
export const DEX_PASSWORD_FIELD = "password";
export const DEX_SCOPE_FIELD = "scope";
export const DEX_CLIENT_FIELD = "client_id";
export const DEX_SECRET_FIELD = "client_secret";

export const STATIC_OUTPUT_DIR = "static";
export const STATIC_SITE_PATH = "/site";
export const STATIC_EXPORT_PREFIX = "platform-static-export-";
export const STATIC_BUILD_CONTEXT = ".";
export const STATIC_COPY_SEPARATOR = ":";
export const STATIC_COPY_CONTENTS = "/site/.";
export const STATIC_CREATE = "create";
export const STATIC_COPY = "cp";
export const STATIC_NAME_FLAG = "--name";
export const STATIC_INTERACTIVE_FLAG = "-i";
export const STATIC_READ_ONLY_SUFFIX = ":ro";
export const STATIC_CURL_FLAGS = ["--fail-early", "--config", "-"] as const;
export const STATIC_CURL_DATA_FILE = "@";
export const STATIC_CURL_NEXT = "next\n";
export const STATIC_WEBSITE_XML =
  "<WebsiteConfiguration><IndexDocument><Suffix>index.html</Suffix></IndexDocument><ErrorDocument><Key>error.html</Key></ErrorDocument></WebsiteConfiguration>";
export const STATIC_POLICY_VERSION = "2012-10-17";
export const STATIC_POLICY_EFFECT = "Allow";
export const STATIC_POLICY_PRINCIPAL = "*";
export const STATIC_POLICY_ACTION = "s3:GetObject";
export const STATIC_POLICY_RESOURCE_PREFIX = "arn:aws:s3:::";
export const STATIC_POLICY_RESOURCE_SUFFIX = "/*";
export const STATIC_WEBSITE_QUERY = "?website";
export const STATIC_POLICY_QUERY = "?policy";
export const STATIC_PKI_MOUNT = "/pki";
export const STATIC_PKI_CERTIFICATE = "/pki/caddy/pki/authorities/local/root.crt";
export const STATIC_CURL_DATA_PREFIX = "data-binary = ";
export const STATIC_CURL_HEADER_PREFIX = "header = ";
export const STATIC_CONTENT_TYPE_PREFIX = "Content-Type: ";
export const STATIC_PATH_SEPARATOR = "/";
export const STATIC_FILE_GLOB = "**/*";
export const STATIC_REMOVE_FLAG = "--rm";
export const STATIC_NETWORK_FLAG = "--network";
export const STATIC_VOLUME_FLAG = "-v";

export const CHECKS_DPRINT_CACHE_ENV = "DPRINT_CACHE_DIR";
export const CHECKS_DPRINT_CACHE_DIR = ".stack/check-cache/dprint";

export const CHECKS_DPRINT_THREADS_ENV = "DPRINT_MAX_THREADS";
export const CHECKS_DPRINT_THREADS = "16";
