import { join } from "node:path";
import { environmentFor } from "@platform/config/environments";
import {
  CHECKS_ENGINE_ENV,
  EnvironmentName,
  PODMAN_SOCKET_FILE,
  PODMAN_SOCKET_PREFIX,
  PulumiEnv,
  REPOSITORY_ROOT_DEPTH,
  STACK_CONFIG_API_IMAGE,
  STACK_CONFIG_ENVIRONMENT,
  STACK_CONFIG_PUBLIC_HOST,
  STACK_CONFIG_ROOT,
  STACK_CONFIG_SOCKET,
  Text,
  XDG_RUNTIME_DIR_ENV,
} from "@platform/constants";
import type * as pulumi from "@pulumi/pulumi";
import { z } from "zod";
import { applyPlan } from "./apply.ts";
import { planFor } from "./plan.ts";

export async function runStack(
  config: pulumi.Config,
  env: Readonly<Record<string, string | undefined>>,
): Promise<pulumi.Output<string>[]> {
  const name = z.enum(EnvironmentName).parse(config.require(STACK_CONFIG_ENVIRONMENT));
  const base = await environmentFor(name, env[PulumiEnv.ProxySecret], env);
  const environment =
    name === EnvironmentName.Production
      ? { ...base, proxy: { ...base.proxy, host: config.require(STACK_CONFIG_PUBLIC_HOST) } }
      : base;
  const root = config.get(STACK_CONFIG_ROOT) ?? join(import.meta.dir, ...REPOSITORY_ROOT_DEPTH);
  const socket =
    config.get(STACK_CONFIG_SOCKET) ??
    env[CHECKS_ENGINE_ENV] ??
    `${PODMAN_SOCKET_PREFIX}${env[XDG_RUNTIME_DIR_ENV] ?? Text.Empty}${PODMAN_SOCKET_FILE}`;
  const containers = await applyPlan(
    await planFor(environment, root, config.get(STACK_CONFIG_API_IMAGE) ?? Text.Empty),
    socket,
  );
  return containers.map((container) => container.name);
}
