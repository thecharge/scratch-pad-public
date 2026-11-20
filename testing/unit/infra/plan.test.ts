import { EnvironmentName, MountKind, PortProtocol } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { TEST_PROXY_SECRET } from "@platform/test-scenarios";
import type { FolderPlan, StackPlan } from "@platform/types";
import { dataFoldersOf, planFor } from "../../../apps/infra/src/plan.ts";
import { environmentFor } from "../../../packages/config/src/environments.ts";

const ROOT = "/work/repo";
const development = await environmentFor(EnvironmentName.Development, TEST_PROXY_SECRET);
const test = await environmentFor(EnvironmentName.Test, TEST_PROXY_SECRET);
const production = await environmentFor(EnvironmentName.Production, TEST_PROXY_SECRET);
const BAD_PORT = { ...test, proxy: { ...test.proxy, port: -1 } };
const BAD_NAME = { ...test, name: "staging" };
const BAD_DEVELOPMENT_PORT = { ...development.developmentApps[0], port: -1 };
const BAD_DEVELOPMENT_COMMAND = { ...development.developmentApps[0], command: [] };
const ZOD_ERROR = { name: "ZodError" };

const containerOf = (plan: StackPlan, part: string) =>
  plan.containers.find((candidate) => candidate.name.endsWith(part));

const proxyPorts = (plan: StackPlan) =>
  containerOf(plan, "-proxy")?.ports.map((port) => [port.external, port.protocol]);
const apiMounts = (plan: StackPlan) =>
  containerOf(plan, "-api")?.mounts.map((mount) => [mount.kind, mount.target]);
const apiCommand = (plan: StackPlan) => containerOf(plan, "-api")?.command;
const networks = (plan: StackPlan) => plan.networks.map((item) => [item.name, item.internal]);
const proxyNetworks = (plan: StackPlan) =>
  containerOf(plan, "-proxy")?.attachments.map((item) => item.network);
const apiNetworks = (plan: StackPlan) =>
  containerOf(plan, "-api")?.attachments.map((item) => item.network);
const apiPorts = (plan: StackPlan) => containerOf(plan, "-api")?.ports.length;
const apiEnv = (plan: StackPlan) => containerOf(plan, "-api")?.env;
const uploaded = (plan: StackPlan) =>
  containerOf(plan, "-proxy")?.uploads[0]?.content.includes("proxy:8443 {");

unit(planFor, {
  positive: [
    positive(
      "development sites mount the source, poll for edits and expose no ports",
      [development, ROOT],
      seen(
        (plan: StackPlan) => {
          const console = containerOf(plan, "-console");
          return [console?.ports, console?.mounts, console?.env, console?.attachments];
        },
        [
          [],
          [{ kind: MountKind.Bind, source: ROOT, target: "/app", readOnly: false }],
          { CHOKIDAR_USEPOLLING: "true", VITE_API_ORIGIN: "https://console.localhost:8443" },
          [
            {
              network: "platform-development-backend",
              aliases: ["console"],
              address: "10.91.1.11",
            },
          ],
        ],
      ),
    ),
    positive(
      "the documentation container uses its configured development command",
      [development, ROOT],
      seen(
        (plan: StackPlan) => containerOf(plan, "-docs")?.command,
        development.developmentApps[1]?.command,
      ),
    ),
    positive(
      "development publishes the proxy on TCP and UDP and mounts the source with watch mode",
      [development, ROOT],
      seen(
        (plan: StackPlan) => [proxyPorts(plan), apiMounts(plan), apiCommand(plan)],
        [
          [
            [8443, PortProtocol.Tcp],
            [8443, PortProtocol.Udp],
          ],
          [
            [MountKind.Bind, "/data"],
            [MountKind.Bind, "/app"],
          ],
          ["bun", "--watch", "apps/api/src/main.ts"],
        ],
      ),
    ),
    positive(
      "test publishes nothing, mounts no source and has two networks of which the backend is internal",
      [test, ROOT],
      seen(
        (plan: StackPlan) => [proxyPorts(plan), apiMounts(plan), networks(plan)],
        [
          [],
          [[MountKind.Bind, "/data"]],
          [
            ["platform-test-edge", false],
            ["platform-test-backend", true],
          ],
        ],
      ),
    ),
    positive(
      "production publishes the standard port, mounts no source and runs the plain start command",
      [production, ROOT],
      seen(
        (plan: StackPlan) => [proxyPorts(plan), apiMounts(plan), apiCommand(plan)],
        [
          [
            [443, PortProtocol.Tcp],
            [443, PortProtocol.Udp],
          ],
          [[MountKind.Bind, "/data"]],
          ["bun", "dist/main.js"],
        ],
      ),
    ),
    positive(
      "production has the proxy and the API only: no test service and no source mount",
      [production, ROOT],
      seen(
        (plan: StackPlan) => [
          plan.containers.map((item) => item.name),
          plan.containers.flatMap((item) => item.mounts.map((mount) => mount.kind)),
        ],
        [
          ["platform-production-proxy", "platform-production-api"],
          [MountKind.Bind, MountKind.Bind],
        ],
      ),
    ),
    positive(
      "the proxy is on both networks, the API on the backend only and publishes no port",
      [test, ROOT],
      seen(
        (plan: StackPlan) => [proxyNetworks(plan), apiNetworks(plan), apiPorts(plan)],
        [["platform-test-edge", "platform-test-backend"], ["platform-test-backend"], 0],
      ),
    ),
    positive(
      "the proxy carries its rendered configuration and the API its environment",
      [test, ROOT],
      seen(
        (plan: StackPlan) => [
          uploaded(plan),
          apiEnv(plan)?.AUTH_ENABLED,
          apiEnv(plan)?.AUTH_RESOURCE,
        ],
        [true, "true", "https://proxy:8443"],
      ),
    ),
  ],
  negative: [
    negative(
      "refuses a development service with an invalid port",
      [{ ...development, developmentApps: [BAD_DEVELOPMENT_PORT] }, ROOT],
      ZOD_ERROR,
    ),
    negative(
      "refuses a development service without a command",
      [{ ...development, developmentApps: [BAD_DEVELOPMENT_COMMAND] }, ROOT],
      ZOD_ERROR,
    ),
    negative("refuses a proxy port that is not positive", [BAD_PORT, ROOT], ZOD_ERROR),
    negative("refuses an environment name that does not exist", [BAD_NAME, ROOT], ZOD_ERROR),
  ],
});

const apiLabels = (plan: StackPlan) => containerOf(plan, "-api")?.labels;
const identityOf = (plan: StackPlan) => containerOf(plan, "-identity");
const apiIssuer = (plan: StackPlan) => [
  apiEnv(plan)?.AUTH_PROVIDER,
  apiEnv(plan)?.AUTH_ISSUER,
  apiEnv(plan)?.AUTH_JWKS_URL,
  apiEnv(plan)?.AUTH_AUDIENCE,
];

unit(planFor, {
  positive: [
    positive(
      "the test environment runs an identity server on the backend network",
      [test, ROOT],
      seen(
        (plan: StackPlan) => [
          identityOf(plan)?.attachments[0]?.aliases,
          identityOf(plan)?.uploads[0]?.content.includes("issuer: http://dex:5556/dex"),
        ],
        [["dex"], true],
      ),
    ),
    positive(
      "development and production run no identity server",
      [development, ROOT],
      seen((plan: StackPlan) => identityOf(plan), undefined),
    ),
    positive(
      "the API trusts the identity server of the test environment",
      [test, ROOT],
      seen(apiIssuer, ["jwks", "http://dex:5556/dex", "http://dex:5556/dex/keys", "platform-test"]),
    ),
    positive(
      "the API container has no image label when no identity is given",
      [test, ROOT],
      seen(async (plan: StackPlan) => apiLabels(plan), {}),
    ),
    positive(
      "the API container carries the identity of its image as a label, so a new build replaces it",
      [test, ROOT, "sha256:abc"],
      seen(async (plan: StackPlan) => apiLabels(plan), { "platform.image": "sha256:abc" }),
    ),
  ],
  negative: [
    negative(
      "an identity does not excuse a port that is not positive",
      [BAD_PORT, ROOT, "sha256:abc"],
      ZOD_ERROR,
    ),
    negative(
      "an identity does not excuse an environment that does not exist",
      [BAD_NAME, ROOT, "sha256:abc"],
      ZOD_ERROR,
    ),
  ],
});

const foldersOf = (plan: StackPlan) => plan.folders.map((folder) => [folder.path, folder.owner]);
const bindSources = (plan: StackPlan) =>
  plan.containers.flatMap((item) => item.mounts.map((mount) => mount.source));
const FOLDERS = [
  ["/work/repo/.stack/data/platform-test-caddy-data", "0:0"],
  ["/work/repo/.stack/data/platform-test-api-data", "1000:1000"],
];

unit(dataFoldersOf, {
  positive: [
    positive(
      "the data folders of the test stack are under .stack/data of the root",
      [test, ROOT],
      seen(
        async (folders: FolderPlan[]) => folders.map((folder) => [folder.path, folder.owner]),
        FOLDERS,
      ),
    ),
    positive(
      "the plan carries the same folders and mounts them as binds",
      [test, ROOT],
      seen(async () => {
        const plan = await planFor(test, ROOT);
        return [foldersOf(plan), bindSources(plan)];
      }, [FOLDERS, [FOLDERS[0]?.[0], FOLDERS[1]?.[0]]]),
    ),
  ],
  negative: [
    negative("an environment name that does not exist is refused", [BAD_NAME, ROOT], ZOD_ERROR),
    negative("a proxy port that is not positive is refused", [BAD_PORT, ROOT], ZOD_ERROR),
  ],
});
