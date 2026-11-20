import { EnvironmentName } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import {
  inputsRegistered,
  installPulumiMocks,
  portsRegistered,
  TEST_PROXY_SECRET,
  typesRegistered,
} from "@platform/test-scenarios";
import { applyPlan } from "../../../apps/infra/src/apply.ts";
import { planFor } from "../../../apps/infra/src/plan.ts";
import { environmentFor } from "../../../packages/config/src/environments.ts";

installPulumiMocks("apply");

const SOCKET = "unix:///run/user/1000/podman/podman.sock";
const ROOT = "/work/repo";
const testPlan = await planFor(await environmentFor(EnvironmentName.Test, TEST_PROXY_SECRET), ROOT);
const productionPlan = await planFor(
  await environmentFor(EnvironmentName.Production, TEST_PROXY_SECRET),
  ROOT,
);
const BROKEN = { ...testPlan, networks: [{ name: 1 }] } as never;
const EMPTY = {} as never;
const ZOD_ERROR = { name: "ZodError" };
const EXPECTED_TYPES = [
  "Container",
  "Container",
  "Container",
  "Network",
  "Network",
  "RemoteImage",
  "RemoteImage",
  "docker",
];
const STANDARD_PORT = [
  [443, "tcp"],
  [443, "udp"],
];

unit(applyPlan, {
  positive: [
    positive(
      "registers the provider, two networks, the pulled images and three containers",
      [testPlan, SOCKET],
      seen(
        (containers) => typesRegistered(containers, "platform-test", "podman-test"),
        EXPECTED_TYPES,
      ),
    ),
    positive(
      "keeps shared pulled images when one stack is removed",
      [testPlan, SOCKET],
      seen(
        async (containers) =>
          (await inputsRegistered(containers, "platform-test-proxy-image"))?.keepLocally,
        true,
      ),
    ),
    positive(
      "makes the backend network internal",
      [testPlan, SOCKET],
      seen(
        async (containers) =>
          (await inputsRegistered(containers, "platform-test-backend"))?.internal,
        true,
      ),
    ),
    positive(
      "leaves the command of the pulled image alone, so a second run changes nothing",
      [testPlan, SOCKET],
      seen(
        async (containers) => (await inputsRegistered(containers, "platform-test-proxy"))?.command,
        undefined,
      ),
    ),
    positive(
      "gives the production proxy the standard port on TCP and UDP",
      [productionPlan, SOCKET],
      seen((containers) => portsRegistered(containers, "platform-production-proxy"), STANDARD_PORT),
    ),
  ],
  negative: [
    negative("refuses a plan whose network name is not text", [BROKEN, SOCKET], ZOD_ERROR),
    negative("refuses an empty plan", [EMPTY, SOCKET], ZOD_ERROR),
  ],
});
