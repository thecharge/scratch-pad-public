import {
  ASSET_BINARY_FORMAT,
  CanonicalCode,
  ErrorReason,
  FileSuffix,
  MessageId,
  PARAM_SEGMENT_PATTERN,
  SchemaIo,
  Separator,
  SKILL_MAX_BYTES,
  SKILL_MAX_RESOURCES,
  SkillFileName,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { message } from "@platform/messages";
import { filterAsync } from "@platform/store";
import type { Capability, ReferenceCache, SkillGroup } from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";

const JSON_INDENT = 2;

export async function groupNameOf(capability: Capability): Promise<string> {
  const segments = capability.resource
    .split(Separator.Resource)
    .filter((segment) => !PARAM_SEGMENT_PATTERN.test(segment));
  return (segments.at(-1) ?? capability.id).toLowerCase();
}

export async function groupCapabilities(
  capabilities: readonly Capability[],
): Promise<SkillGroup[]> {
  const names = [
    ...new Set(await all(capabilities.map((item) => async () => groupNameOf(item)))),
  ].sort();
  return all(
    names.map((name) => async () => ({
      name,
      capabilities: await filterAsync(
        capabilities,
        async (capability) => (await groupNameOf(capability)) === name,
      ),
    })),
  );
}

async function schemaText(schema: z.ZodType, io: SchemaIo): Promise<string> {
  return JSON.stringify(z.toJSONSchema(schema, { io }), null, JSON_INDENT);
}

async function referenceFor(capability: Capability, references?: ReferenceCache): Promise<string> {
  const known = references?.get(capability);
  if (known !== undefined) {
    return known;
  }
  const text = message(MessageId.SkillReference, {
    id: capability.id,
    description: capability.description,
    auth: capability.auth,
    input: await schemaText(await documentedInput(capability), SchemaIo.Input),
    output: await schemaText(capability.output, SchemaIo.Output),
  });
  references?.set(capability, text);
  return text;
}

async function documentedInput(capability: Capability): Promise<z.ZodType> {
  const { input, media } = capability;
  if (media === undefined || !(input instanceof z.ZodObject)) return input;
  const shape = {
    ...input.shape,
    [media.bodyField]: z.string().meta({ format: ASSET_BINARY_FORMAT }),
  };
  return z.object(shape);
}

async function mainFor(group: SkillGroup): Promise<string> {
  const frontmatter = message(MessageId.SkillFrontmatter, {
    name: group.name,
    description: message(MessageId.SkillDescription, {
      name: group.name,
      count: group.capabilities.length,
    }),
  });
  const lines = group.capabilities.map((capability) =>
    message(MessageId.SkillCapabilityLine, { id: capability.id, summary: capability.summary }),
  );
  return [frontmatter, message(MessageId.SkillHeading, { name: group.name }), ...lines].join(
    Text.Empty,
  );
}

export async function skillFilesFor(
  group: SkillGroup,
  cache?: ReferenceCache,
): Promise<Record<string, string>> {
  const references = await all(
    group.capabilities.map((capability) => async () => [
      [SkillFileName.References, [capability.id, FileSuffix.Markdown].join(Text.Empty)].join(
        Separator.Resource,
      ),
      await referenceFor(capability, cache),
    ]),
  );
  return Object.fromEntries([[SkillFileName.Main, await mainFor(group)], ...references]);
}

export async function exceedsSkillLimits(files: Record<string, string>): Promise<boolean> {
  const texts = Object.values(files);
  const bytes = texts.reduce((total, text) => total + new TextEncoder().encode(text).byteLength, 0);
  return texts.length > SKILL_MAX_RESOURCES || bytes > SKILL_MAX_BYTES;
}

export async function assertSkillLimits(
  name: string,
  files: Record<string, string>,
): Promise<void> {
  if (await exceedsSkillLimits(files)) {
    throw new ApiError(
      CanonicalCode.OutOfRange,
      ErrorReason.BatchTooLarge,
      MessageId.SkillLimitExceeded,
      { name, resources: SKILL_MAX_RESOURCES, bytes: SKILL_MAX_BYTES },
    );
  }
}
