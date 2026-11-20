import {
  ENV_ASSIGNMENT,
  IMAGE_RESOURCE_SUFFIX,
  NETWORK_IGNORED_PROPERTY,
  PROVIDER_NAME_PREFIX,
} from "@platform/constants";
import {
  type ContainerPlan,
  type NetworkPlan,
  type StackPlan,
  StackPlanSchema,
} from "@platform/types";
import * as docker from "@pulumi/docker";
import type * as pulumi from "@pulumi/pulumi";

async function containerOf(
  plan: ContainerPlan,
  options: pulumi.CustomResourceOptions,
  images: Readonly<Record<string, docker.RemoteImage>>,
): Promise<docker.Container> {
  return new docker.Container(
    plan.name,
    {
      name: plan.name,
      image: images[plan.image]?.imageId ?? plan.image,
      ...(plan.command.length > 0 ? { command: plan.command } : {}),
      envs: Object.entries(plan.env).map(([key, value]) => [key, value].join(ENV_ASSIGNMENT)),
      networksAdvanced: plan.attachments.map((item) => ({
        name: item.network,
        aliases: item.aliases,
        ...(item.address === undefined ? {} : { ipv4Address: item.address }),
      })),
      ports: plan.ports.map((item) => ({ ...item })),
      mounts: plan.mounts.map((item) => ({
        type: item.kind,
        source: item.source,
        target: item.target,
        readOnly: item.readOnly,
      })),
      uploads: plan.uploads.map((item) => ({ ...item })),
      labels: Object.entries(plan.labels).map(([label, value]) => ({ label, value })),
    },
    options,
  );
}

async function networkArgs(item: NetworkPlan): Promise<docker.NetworkArgs> {
  const ipam = item.subnet === undefined ? [] : [{ subnet: item.subnet }];
  return {
    name: item.name,
    internal: item.internal,
    ...(ipam.length > 0 ? { ipamConfigs: ipam } : {}),
  };
}

export async function applyPlan(plan: StackPlan, host: string): Promise<docker.Container[]> {
  const checked = StackPlanSchema.parse(plan);
  const provider = new docker.Provider(`${PROVIDER_NAME_PREFIX}${checked.environment}`, { host });
  const networks: docker.Network[] = [];
  for (const item of checked.networks) {
    networks.push(
      new docker.Network(item.name, await networkArgs(item), {
        provider,
        ignoreChanges: [NETWORK_IGNORED_PROPERTY],
      }),
    );
  }
  const images = Object.fromEntries(
    checked.containers
      .filter((item) => item.pull)
      .map((item) => [
        item.image,
        new docker.RemoteImage(
          `${item.name}${IMAGE_RESOURCE_SUFFIX}`,
          { name: item.image, keepLocally: true },
          { provider },
        ),
      ]),
  );
  const options = { provider, dependsOn: networks };
  const containers: docker.Container[] = [];
  for (const item of checked.containers) {
    containers.push(await containerOf(item, options, images));
  }
  return containers;
}
