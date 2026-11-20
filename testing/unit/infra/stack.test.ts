import { join } from "node:path";
import { negative, positive, seen, unit } from "@platform/test-factories";
import {
  fakeConfig,
  installPulumiMocks,
  registered,
  resolved,
  TEST_PROXY_SECRET,
} from "@platform/test-scenarios";
import type { MountPlan } from "@platform/types";
import type * as pulumi from "@pulumi/pulumi";
import { runStack } from "../../../apps/infra/src/stack.ts";

installPulumiMocks("stack");

const SOCKET = "unix:///run/user/1000/podman/podman.sock";
const ROOT = "/work/repo";
const REPOSITORY = join(import.meta.dir, "..", "..", "..");
const SECRET_ENV = { PLATFORM_PROXY_SECRET: TEST_PROXY_SECRET };
const RUNTIME = { XDG_RUNTIME_DIR: "/run/user/4242", ...SECRET_ENV };
const WITH_BOTH = fakeConfig({
  environment: "development",
  podmanSocket: SOCKET,
  repositoryRoot: ROOT,
});
const WITH_IMAGE = fakeConfig({
  environment: "development",
  podmanSocket: SOCKET,
  repositoryRoot: ROOT,
  apiImageId: "sha256:abc",
});
const WITH_NEITHER = fakeConfig({ environment: "development" });
const PRODUCTION = fakeConfig({ environment: "production", publicHost: "api.example.test" });
const STAGING = fakeConfig({ environment: "staging" });
const NO_HOST = fakeConfig({ environment: "production" });
const ZOD_ERROR = { name: "ZodError" };
const MISSING = { name: "ConfigMissingError" };

const lastInputs = (name: string) => registered.findLast((item) => item.name === name)?.inputs;
const providerHost = (name: string) => async (names: pulumi.Output<string>[]) => {
  await resolved(names);
  return lastInputs(name)?.host;
};
const mountSources = (name: string) => async (names: pulumi.Output<string>[]) => {
  await resolved(names);
  const mounts = lastInputs(name)?.mounts as MountPlan[] | undefined;
  return (mounts ?? []).map((mount) => mount.source);
};

unit(runStack, {
  positive: [
    positive(
      "names the containers and uses the socket and the root it is given",
      [WITH_BOTH, SECRET_ENV],
      seen(resolved, [
        "platform-development-proxy",
        "platform-development-api",
        "platform-development-console",
        "platform-development-docs",
      ]),
    ),
    positive(
      "takes the remote engine endpoint when running in the checks container",
      [WITH_NEITHER, { ...SECRET_ENV, CONTAINER_HOST: SOCKET }],
      seen(providerHost("podman-development"), SOCKET),
    ),
    positive(
      "an explicit configured socket takes precedence over the inherited remote endpoint",
      [WITH_BOTH, { ...SECRET_ENV, CONTAINER_HOST: "unix:///other/socket" }],
      seen(providerHost("podman-development"), SOCKET),
    ),
    positive(
      "takes the socket from the user runtime directory when the configuration has none",
      [WITH_NEITHER, RUNTIME],
      seen(providerHost("podman-development"), "unix:///run/user/4242/podman/podman.sock"),
    ),
    positive(
      "takes the repository root from the location of the program when the configuration has none",
      [WITH_NEITHER, RUNTIME],
      seen(mountSources("platform-development-api"), [
        join(REPOSITORY, ".stack", "data", "platform-development-api-data"),
        REPOSITORY,
      ]),
    ),
    positive(
      "labels the API container with the image identity of the configuration, so a new build replaces it",
      [WITH_IMAGE, SECRET_ENV],
      seen(
        async (names: pulumi.Output<string>[]) => {
          await resolved(names);
          return lastInputs("platform-development-api")?.labels;
        },
        [{ label: "platform.image", value: "sha256:abc" }],
      ),
    ),
    positive(
      "uses the public host of the configuration for production",
      [PRODUCTION, SECRET_ENV],
      seen(resolved, ["platform-production-proxy", "platform-production-api"]),
    ),
  ],
  negative: [
    negative("refuses an environment that does not exist", [STAGING, SECRET_ENV], ZOD_ERROR),
    negative("refuses a stack without the proxy secret", [WITH_BOTH, {}], ZOD_ERROR),
    negative("needs the public host for production", [NO_HOST, {}], MISSING),
  ],
});
