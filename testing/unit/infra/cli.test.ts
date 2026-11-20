import { afterAll } from "bun:test";
import { EnvironmentName } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, mentions, recordingDeps, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  runStackCommand,
  stackCheck,
  stackDown,
  stackPrune,
  stackUp,
  storedSecret,
} from "../../../apps/infra/src/cli.ts";

const ZOD_ERROR = { name: "ZodError" };
const development = recordingDeps();
const storageEnv = {
  RUSTFS_ACCESS_KEY: "fixture-access",
  RUSTFS_SECRET_KEY: "fixture-secret-for-object-store",
};
const storage = recordingDeps({}, storageEnv);
const test = recordingDeps();
const production = recordingDeps(
  {},
  { PATH: "/usr/bin", PLATFORM_PUBLIC_HOST: "api.example.test" },
);
const staticBuildFails = recordingDeps({ "static build": 14 });
const staticPublishFails = recordingDeps({ "static publish": 15 });
const buildFails = recordingDeps({ "podman build": 7 });
const curlBuildFails = recordingDeps({ "podman build --layers=true": 16 });
const dataFails = recordingDeps({ " chown ": 6 });
const folderFails = recordingDeps({ "mkdir -p /work/repo/.stack/data": 8 });
const inspectFails = recordingDeps({ "image inspect": 3 });
const checkInspectFails = recordingDeps({ "image inspect": 5 });
const replacedFails = recordingDeps({ "image prune": 4 });
const pluginFails = recordingDeps({ "plugin install": 9 });
const upFails = recordingDeps({ " up ": 5 });
const neverReady = recordingDeps({ "podman exec": 1 });
const toolsFail = recordingDeps({}, { PATH: "/usr/bin" }, 4);
const noPodman = recordingDeps({ "podman --version": 127 });
const podmanThrows = {
  ...recordingDeps().deps,
  run: async (): Promise<never> => {
    throw new Error("spawn podman ENOENT");
  },
};
const downOk = recordingDeps();
const downFails = recordingDeps({ destroy: 3 });
const viaCommandUp = recordingDeps();
const viaCommandDown = recordingDeps();
const unknownAction = recordingDeps();
const status = recordingDeps({}, undefined, 0, { "ps -a": "development containers" });
const logs = recordingDeps({}, undefined, 0, { "logs --tail": "application output" });
const statusFails = recordingDeps({ "ps -a": 8 });
const logsFail = recordingDeps({ "logs --tail": 9 });
const reset = recordingDeps();
const resetFails = recordingDeps({ destroy: 6 });
const resetDataFails = recordingDeps({ "unshare rm -rf": 7 });
const watchersFail = recordingDeps({}, undefined, 0, {}, 1);

const sees =
  (recorded: ReturnType<typeof recordingDeps>, ...parts: string[]) =>
  () =>
    mentions(recorded.commands, ...parts);

unit(stackUp, {
  positive: [
    positive(
      "configured object storage prepares owned folders and forwards credentials only in the environment",
      [EnvironmentName.Test, storage.deps],
      seen(
        async () => [
          mentions(
            storage.commands,
            "chown 10001:10001 /work/repo/.stack/data/platform-test-object-store-data",
            "chown 10001:10001 /work/repo/.stack/data/platform-test-object-store-logs",
          ),
          storage.environments.some(
            (env) =>
              env.RUSTFS_ACCESS_KEY === storageEnv.RUSTFS_ACCESS_KEY &&
              env.RUSTFS_SECRET_KEY === storageEnv.RUSTFS_SECRET_KEY,
          ),
          storage.commands.some((line) => line.includes(storageEnv.RUSTFS_SECRET_KEY)),
        ],
        [true, true, false],
      ),
    ),
    positive(
      "builds the API image, installs the pinned plugin, creates the stack and waits behind the proxy",
      [EnvironmentName.Development, development.deps],
      seen(
        sees(
          development,
          "mkdir -p /work/repo/.stack/state",
          "mkdir -p /work/repo/.stack/data/platform-development-api-data",
          "chown 1000:1000 /work/repo/.stack/data/platform-development-api-data",
          "chown 0:0 /work/repo/.stack/data/platform-development-caddy-data",
          "podman build --layers=false --label platform.stack=true --build-arg PORT=3000 -t localhost/platform/api:development -f apps/infra/containers/api/Containerfile .",
          "podman image prune -f --filter label=platform.stack=true --filter dangling=true",
          "podman image inspect --format {{.Id}} localhost/platform/api:development",
          "config set apiImageId",
          "plugin install resource docker 5.2.0 --checksum cedc3247",
          "stack select --create development",
          "config set environment development",
          "up --yes --skip-preview",
          "podman exec platform-development-proxy wget -q -O /dev/null --header accept: application/json --header x-platform-proxy: the-proxy-secret-used-only-in-tests http://10.91.1.10:3000/v1/config",
        ),
        true,
      ),
    ),
    positive(
      "the test stack also builds the HTTP/3 client image",
      [EnvironmentName.Test, test.deps],
      seen(
        sees(
          test,
          "podman build --layers=true --label platform.stack=true --build-arg GITHUB_ORIGIN=",
          "-t localhost/platform/curl-h3:latest",
        ),
        true,
      ),
    ),
    positive(
      "production stores the public host from the environment",
      [EnvironmentName.Production, production.deps],
      seen(sees(production, "config set publicHost api.example.test"), true),
    ),
  ],
  negative: [
    rejected(
      "cached client build failures still block stack creation",
      [EnvironmentName.Test, curlBuildFails.deps],
      16,
    ),
    rejected(
      "static image failures block stack creation",
      [EnvironmentName.Test, staticBuildFails.deps],
      14,
    ),
    rejected(
      "static publication failures block startup",
      [EnvironmentName.Test, staticPublishFails.deps],
      15,
    ),
    rejected(
      "watcher exhaustion stops development before images are built",
      [EnvironmentName.Development, watchersFail.deps],
      seen(
        async (exitCode: number) => ({
          exitCode,
          built: mentions(watchersFail.commands, "podman build"),
        }),
        { exitCode: 1, built: false },
      ),
    ),
    rejected(
      "stops at the first command that fails and gives its code",
      [EnvironmentName.Development, buildFails.deps],
      7,
    ),
    rejected(
      "stops when a data folder cannot be given to the user of the container",
      [EnvironmentName.Test, dataFails.deps],
      6,
    ),
    rejected(
      "stops when a data folder cannot be created",
      [EnvironmentName.Test, folderFails.deps],
      8,
    ),
    rejected(
      "stops when the identity of the API image cannot be read",
      [EnvironmentName.Test, inspectFails.deps],
      3,
    ),
    rejected(
      "fails when the images that were replaced cannot be removed",
      [EnvironmentName.Test, replacedFails.deps],
      4,
    ),
    rejected(
      "does not create containers when the plugin cannot be installed",
      [EnvironmentName.Development, pluginFails.deps],
      9,
    ),
    rejected(
      "reports a missing Podman with the install command before anything else",
      [EnvironmentName.Development, noPodman.deps],
      127,
    ),
    rejected(
      "a Podman that cannot be started is reported as missing",
      [EnvironmentName.Development, podmanThrows],
      127,
    ),
    rejected("gives the code of the tool installation", [EnvironmentName.Test, toolsFail.deps], 4),
    rejected(
      "fails when the API never answers behind the proxy",
      [EnvironmentName.Test, neverReady.deps],
      1,
    ),
    rejected("fails when the stack cannot be created", [EnvironmentName.Test, upFails.deps], 5),
    negative(
      "refuses an environment that does not exist",
      ["staging" as never, development.deps],
      ZOD_ERROR,
    ),
  ],
});

unit(stackDown, {
  positive: [
    positive(
      "selects the stack and removes its containers",
      [EnvironmentName.Test, downOk.deps],
      0,
    ),
    positive(
      "runs the destroy command",
      [EnvironmentName.Development, downOk.deps],
      seen(sees(downOk, "stack select development", "destroy --yes --skip-preview"), true),
    ),
  ],
  negative: [
    rejected("gives the code of the destroy that fails", [EnvironmentName.Test, downFails.deps], 3),
    negative(
      "refuses an environment that does not exist",
      ["staging" as never, downOk.deps],
      ZOD_ERROR,
    ),
  ],
});

unit(runStackCommand, {
  positive: [
    positive(
      "status prints the containers of the chosen environment",
      [["status", "development"], status.deps],
      seen(async () => mentions(status.commands, "--filter name=platform-development-"), true),
    ),
    positive(
      "logs prints the API log of the chosen environment",
      [["logs", "test"], logs.deps],
      seen(async () => mentions(logs.commands, "podman logs --tail 200 platform-test-api"), true),
    ),
    positive(
      "tools installs the stack tools without an environment",
      [["tools"], development.deps],
      0,
    ),
    positive(
      "reset removes only the chosen data folders and recreates that stack",
      [["reset", "development"], reset.deps],
      seen(
        async () =>
          mentions(
            reset.commands,
            "unshare rm -rf /work/repo/.stack/data/platform-development-caddy-data /work/repo/.stack/data/platform-development-api-data",
            "up --yes",
          ),
        true,
      ),
    ),
    positive(
      "up creates the stack of the environment",
      [["up", "development"], viaCommandUp.deps],
      0,
    ),
    positive(
      "down removes the stack of the environment",
      [["down", "test"], viaCommandDown.deps],
      0,
    ),
  ],
  negative: [
    rejected("status gives the failed command code", [["status", "test"], statusFails.deps], 8),
    rejected("logs gives the failed command code", [["logs", "test"], logsFail.deps], 9),
    rejected("status requires Podman", [["status", "test"], noPodman.deps], 127),
    rejected("reset stops if destroy fails", [["reset", "development"], resetFails.deps], 6),
    rejected(
      "reset stops if data cannot be removed",
      [["reset", "development"], resetDataFails.deps],
      7,
    ),
    rejected("tools propagates installation failure", [["tools"], toolsFail.deps], 4),
    rejected(
      "an action that is not up or down prints the usage and fails",
      [["restart", "test"], unknownAction.deps],
      1,
    ),
    rejected(
      "an environment that does not exist prints the usage and fails",
      [["up", "staging"], unknownAction.deps],
      1,
    ),
    rejected("nothing was run for the wrong arguments", [["up"], unknownAction.deps], 1),
  ],
});

const checkOk = recordingDeps();
const checkDrifts = recordingDeps({ "--expect-no-changes": 2 });
const viaCommandCheck = recordingDeps();
const viaCheckAction = recordingDeps();
const viaDownAction = recordingDeps();
const checkNoPodman = recordingDeps({ "podman --version": 127 });

unit(stackCheck, {
  positive: [
    positive(
      "selects the stack and compares it with the program",
      [EnvironmentName.Test, checkOk.deps],
      0,
    ),
    positive(
      "asks Pulumi to expect no changes",
      [EnvironmentName.Test, checkOk.deps],
      seen(sees(checkOk, "stack select test", "preview --expect-no-changes"), true),
    ),
  ],
  negative: [
    rejected(
      "gives the code of a comparison that finds changes",
      [EnvironmentName.Test, checkDrifts.deps],
      2,
    ),
    rejected(
      "gives the code of an API image that cannot be found",
      [EnvironmentName.Test, checkInspectFails.deps],
      5,
    ),
    negative(
      "refuses an environment that does not exist",
      ["staging" as never, checkOk.deps],
      ZOD_ERROR,
    ),
  ],
});

unit(runStackCommand, {
  positive: [
    positive(
      "check compares the stack of the environment",
      [["check", "test"], viaCommandCheck.deps],
      0,
    ),
    positive(
      "check compares and never destroys",
      [["check", "test"], viaCheckAction.deps],
      seen(
        async () =>
          sees(viaCheckAction, "preview --expect-no-changes")() &&
          !sees(viaCheckAction, "destroy")(),
        true,
      ),
    ),
    positive(
      "down destroys and never compares",
      [["down", "test"], viaDownAction.deps],
      seen(
        async () =>
          sees(viaDownAction, "destroy")() && !sees(viaDownAction, "--expect-no-changes")(),
        true,
      ),
    ),
    positive(
      "check with the same stack twice gives the same answer",
      [["check", "development"], viaCommandCheck.deps],
      0,
    ),
  ],
  negative: [
    rejected(
      "check without Podman gives the code of the missing tool",
      [["check", "test"], checkNoPodman.deps],
      127,
    ),
    rejected(
      "an action that does not exist prints the usage and fails",
      [["compare", "test"], unknownAction.deps],
      1,
    ),
    rejected(
      "an environment that does not exist prints the usage and fails",
      [["check", "staging"], unknownAction.deps],
      1,
    ),
  ],
});

afterAll(removeAll);

const GIVEN = "g".repeat(40);
const KEPT = "k".repeat(40);
const givenRoot = await makeDir();
const keptRoot = await makeDir();
const createdRoot = await makeDir();
const emptyEnvRoot = await makeDir();
await writeFiles(keptRoot, { ".stack/proxy-secret": `${KEPT}\n` });
await writeFiles(emptyEnvRoot, { ".stack/proxy-secret": `${KEPT}\n` });
const fileAsRoot = await makeDir();
await writeFiles(fileAsRoot, { ".stack": "a file where a folder should be" });
const HEX_64 = /^[0-9a-f]{64}$/;
const isHex64 = async (value: string) => HEX_64.test(value);

unit(storedSecret, {
  positive: [
    positive("the environment variable wins", [givenRoot, { PLATFORM_PROXY_SECRET: GIVEN }], GIVEN),
    positive("an existing secret file is read and trimmed", [keptRoot, {}], KEPT),
    positive(
      "a missing file is created with 32 random bytes in hex",
      [createdRoot, {}],
      seen(isHex64, true),
    ),
    positive(
      "an empty variable is ignored in favour of the file",
      [emptyEnvRoot, { PLATFORM_PROXY_SECRET: "" }],
      KEPT,
    ),
  ],
  negative: [
    negative("a root that cannot be written throws", ["/proc/nowhere", {}], { code: "ENOENT" }),
    negative("a file where the folder should be throws", [fileAsRoot, {}], { code: "ENOTDIR" }),
  ],
});

const SIZE_ROWS = JSON.stringify([
  { Id: "image-one", Size: 1000 },
  { Id: "image-two", Size: 2000 },
]);
const OUTPUTS = {
  "ps -a -q": "c1\nc2\n",
  "network ls": "platform-test-edge\nplatform-test-backend\n",
  "images -a": SIZE_ROWS,
  "du -sb": "500\t/work/repo/.stack/data",
  "grep -h":
    "FROM docker.io/library/alpine:3.23@sha256:aa AS build\nFROM scratch\nFROM docker.io/oven/bun:1@sha256:bb\nFROM docker.io/library/alpine:3.23@sha256:aa\n",
  "image inspect --format {{.Size}}": "70",
};
const pruning = recordingDeps({}, undefined, 0, OUTPUTS);
const idle = recordingDeps();
const listFails = recordingDeps({ "ps -a -q": 3 }, undefined, 0, OUTPUTS);
const rmFails = recordingDeps({ "rm -f c1 c2": 9 }, undefined, 0, OUTPUTS);
const dataStays = recordingDeps({ "unshare rm -rf": 11 }, undefined, 0, OUTPUTS);
const imagesStay = recordingDeps({ "rmi -f image-one": 12 }, undefined, 0, OUTPUTS);
const onceOnly = recordingDeps({}, undefined, 0, OUTPUTS);
const baseInUse = recordingDeps({ "rmi -f docker.io/oven": 1 }, undefined, 0, OUTPUTS);
const noBases = recordingDeps({ "grep -h": 2 }, undefined, 0, OUTPUTS);
const noPodmanPrune = recordingDeps({ "podman --version": 127 });
const viaPrune = recordingDeps({}, undefined, 0, OUTPUTS);

unit(stackPrune, {
  positive: [
    positive(
      "removes the containers, the networks, the data folders and the images of the stack",
      [pruning.deps],
      seen(
        sees(
          pruning,
          "podman rm -f c1 c2",
          "podman network rm -f platform-test-edge platform-test-backend",
          "podman unshare rm -rf /work/repo/.stack/data /work/repo/.stack/state",
          "podman rmi -f image-one image-two",
          "podman rmi -f docker.io/library/alpine:3.23@sha256:aa",
          "podman rmi -f docker.io/oven/bun:1@sha256:bb",
          "podman rmi -f docker.io/library/caddy",
        ),
        true,
      ),
    ),
    positive(
      "each base image is removed once, though two Containerfiles name it",
      [onceOnly.deps],
      seen(
        async () =>
          onceOnly.commands.filter((line) => line.includes("rmi -f docker.io/library/alpine"))
            .length,
        1,
      ),
    ),
    positive(
      "a base image that is used elsewhere stays and the prune goes on",
      [baseInUse.deps],
      0,
    ),
    positive("without Containerfiles to read no base image is removed", [noBases.deps], 0),
    positive(
      "with nothing to remove it removes nothing and succeeds",
      [idle.deps],
      seen(async () => !sees(idle, "podman rm -f")() && !sees(idle, "podman rmi -f image")(), true),
    ),
    positive(
      "a listing that fails removes nothing and does not stop the prune",
      [listFails.deps],
      0,
    ),
  ],
  negative: [
    rejected("reports a missing Podman first", [noPodmanPrune.deps], 127),
    rejected("gives the code of the containers that cannot be removed", [rmFails.deps], 9),
    rejected("gives the code of the data folders that cannot be removed", [dataStays.deps], 11),
    rejected("gives the code of the images that cannot be removed", [imagesStay.deps], 12),
  ],
});

unit(runStackCommand, {
  positive: [
    positive("prune needs no environment and removes the stack", [["prune"], viaPrune.deps], 0),
    positive(
      "prune removes the containers and never creates a stack",
      [["prune"], viaPrune.deps],
      seen(async () => sees(viaPrune, "podman rm -f c1 c2")() && !sees(viaPrune, " up ")(), true),
    ),
  ],
  negative: [
    rejected(
      "prune without Podman gives the code of the missing tool",
      [["prune"], noPodmanPrune.deps],
      127,
    ),
    rejected(
      "an action that does not exist still prints the usage",
      [["clean"], unknownAction.deps],
      1,
    ),
  ],
});
