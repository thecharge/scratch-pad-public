import { paginate, requireResourceName } from "@platform/aip";
import { defineCapability } from "@platform/capability";
import {
  AuthMode,
  MessageId,
  MethodKind,
  SkillCapabilityId,
  SkillPattern,
  Text,
} from "@platform/constants";
import { listVisibleSkills, readVisibleSkill } from "@platform/skill-protocol";
import {
  type CapabilityContext,
  type PageLimits,
  type PageTokenCodec,
  type SkillAppOptions,
  SkillDocumentSchema,
  type SkillListInput,
  SkillListInputSchema,
  SkillListSchema,
  type SkillNameInput,
  SkillNameInputSchema,
} from "@platform/types";
import { describe, notFound } from "./support.ts";

export async function listSkillsHandler(
  options: () => Promise<SkillAppOptions>,
  input: SkillListInput,
  context: CapabilityContext,
  codec: PageTokenCodec,
  limits: PageLimits,
) {
  const visible = await listVisibleSkills(await options(), context.principal);
  const page = await paginate(
    visible,
    { pageSize: input.pageSize, pageToken: input.pageToken, query: [] },
    codec,
    limits,
  );
  return { skills: page.items, nextPageToken: page.nextPageToken };
}

export async function getSkillHandler(
  options: () => Promise<SkillAppOptions>,
  { name }: SkillNameInput,
  context: CapabilityContext,
) {
  const { skill = Text.Empty } = await requireResourceName(SkillPattern.Item, name);
  const found = await readVisibleSkill(await options(), context.principal, skill);
  if (found === undefined) {
    throw await notFound(name);
  }
  return found;
}

export async function listSkills(
  options: () => Promise<SkillAppOptions>,
  codec: PageTokenCodec,
  limits: PageLimits,
) {
  return defineCapability({
    ...(await describe(
      SkillCapabilityId.List,
      MethodKind.List,
      SkillPattern.Collection,
      MessageId.SummarySkillsList,
    )),
    auth: AuthMode.Optional,
    input: SkillListInputSchema,
    output: SkillListSchema,
    handler: async (input, context) => listSkillsHandler(options, input, context, codec, limits),
  });
}

export async function getSkill(options: () => Promise<SkillAppOptions>) {
  return defineCapability({
    ...(await describe(
      SkillCapabilityId.Get,
      MethodKind.Get,
      SkillPattern.Item,
      MessageId.SummarySkillsGet,
    )),
    auth: AuthMode.Optional,
    input: SkillNameInputSchema,
    output: SkillDocumentSchema,
    handler: async (input, context) => getSkillHandler(options, input, context),
  });
}
