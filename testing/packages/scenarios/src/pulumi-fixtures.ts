import type { Registration } from "@platform/types";
import { PortRowSchema } from "@platform/types";
import { all } from "@platform/util";
import * as pulumi from "@pulumi/pulumi";
import { z } from "zod";

export const registered: Registration[] = [];

export function installPulumiMocks(stack: string): void {
  pulumi.runtime.setMocks(
    {
      newResource: (args: pulumi.runtime.MockResourceArgs) => {
        registered.push({ type: args.type, name: args.name, inputs: args.inputs });
        return { id: `${args.name}-id`, state: { ...args.inputs, imageId: "sha256:mock" } };
      },
      call: (args: pulumi.runtime.MockCallArgs) => args.inputs,
    },
    "platform",
    stack,
    false,
  );
}

export async function settled(resources: readonly pulumi.CustomResource[]): Promise<void> {
  await all(resources.map((item) => async () => new Promise((resolve) => item.id.apply(resolve))));
}

export async function typesRegistered(
  resources: readonly pulumi.CustomResource[],
  ...prefixes: string[]
): Promise<(string | undefined)[]> {
  await settled(resources);
  return registered
    .filter((item) => prefixes.some((prefix) => item.name.startsWith(prefix)))
    .map((item) => item.type.split(":").at(-1))
    .sort();
}

export async function inputsRegistered(
  resources: readonly pulumi.CustomResource[],
  name: string,
): Promise<Record<string, unknown> | undefined> {
  await settled(resources);
  return registered.find((item) => item.name === name)?.inputs;
}

export async function portsRegistered(
  resources: readonly pulumi.CustomResource[],
  name: string,
): Promise<[number, string][]> {
  const inputs = await inputsRegistered(resources, name);
  return z
    .array(PortRowSchema)
    .parse(inputs?.ports)
    .map((port): [number, string] => [port.external, port.protocol]);
}

export async function resolved(outputs: readonly pulumi.Output<string>[]): Promise<string[]> {
  return all(
    outputs.map((output) => async () => new Promise<string>((resolve) => output.apply(resolve))),
  );
}

export async function configure(values: Readonly<Record<string, string>>): Promise<void> {
  pulumi.runtime.setAllConfig(
    Object.fromEntries(Object.entries(values).map(([key, value]) => [`platform:${key}`, value])),
  );
}

export function fakeConfig(values: Readonly<Record<string, string>>): pulumi.Config {
  return {
    get: (key: string) => values[key],
    require: (key: string) => {
      const value = values[key];
      if (value === undefined) {
        const error = new Error(`Missing required configuration variable '${key}'`);
        error.name = "ConfigMissingError";
        throw error;
      }
      return value;
    },
  } as unknown as pulumi.Config;
}
