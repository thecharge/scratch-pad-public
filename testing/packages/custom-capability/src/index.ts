import { resolve } from "node:path";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CustomCapabilityId,
  GREETING_DESCRIPTION,
  GREETING_RESOURCE,
  GREETING_SKILLS_DIR,
  GREETING_SUMMARY,
  MethodKind,
  SHOUT_DESCRIPTION,
  SHOUT_SUMMARY,
  SHOUT_VERB,
  TransportKind,
} from "@platform/constants";
import type { Capability } from "@platform/types";
import { z } from "zod";

const GreetingInputSchema = z.strictObject({ name: z.string() });
const GreetingOutputSchema = z.object({ text: z.string() });
const GREETING_PREFIX = "greetings/";

async function textOf(name: string): Promise<string> {
  return name.startsWith(GREETING_PREFIX) ? name.slice(GREETING_PREFIX.length) : name;
}

export async function greetingCapability(): Promise<Capability> {
  return defineCapability({
    id: CustomCapabilityId.Greeting,
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: GREETING_RESOURCE,
    summary: GREETING_SUMMARY,
    description: GREETING_DESCRIPTION,
    auth: AuthMode.None,
    input: GreetingInputSchema,
    output: GreetingOutputSchema,
    handler: async ({ name }) => ({ text: await textOf(name) }),
  });
}

export async function shoutCapability(): Promise<Capability> {
  return defineCapability({
    id: CustomCapabilityId.Shout,
    version: ApiVersion.V1,
    method: MethodKind.Custom,
    customVerb: SHOUT_VERB,
    resource: GREETING_RESOURCE,
    summary: SHOUT_SUMMARY,
    description: SHOUT_DESCRIPTION,
    auth: AuthMode.None,
    onlyOver: TransportKind.Mcp,
    input: GreetingInputSchema,
    output: GreetingOutputSchema,
    handler: async ({ name }) => ({ text: (await textOf(name)).toUpperCase() }),
  });
}

export async function customCapabilities(): Promise<Capability[]> {
  return [await greetingCapability(), await shoutCapability()];
}

export const GREETING_SKILL_DIRS: readonly string[] = [
  resolve(import.meta.dir, GREETING_SKILLS_DIR),
];
