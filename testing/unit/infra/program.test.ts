import { expect, test } from "bun:test";
import {
  configure,
  installPulumiMocks,
  resolved,
  TEST_PROXY_SECRET,
} from "@platform/test-scenarios";

installPulumiMocks("program");
Bun.env.PLATFORM_PROXY_SECRET = TEST_PROXY_SECRET;

test("the entry point of the stack builds the containers of the configured environment", async () => {
  await configure({
    environment: "development",
    podmanSocket: "unix:///run/user/1000/podman/podman.sock",
    repositoryRoot: "/work/repo",
  });
  const module = await import("../../../apps/infra/src/program.ts");
  expect(await resolved(module.containerNames)).toEqual([
    "platform-development-proxy",
    "platform-development-api",
    "platform-development-console",
    "platform-development-docs",
  ]);
});
