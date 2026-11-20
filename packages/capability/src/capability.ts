import { AuthMode, MessageId, MethodKind } from "@platform/constants";
import { message } from "@platform/messages";
import type { Capability, CapabilityDefinition, MessageParams } from "@platform/types";
import type { z } from "zod";

export class CapabilityDefinitionError extends Error {
  readonly messageId: MessageId;

  constructor(messageId: MessageId, params: MessageParams = {}) {
    super(message(messageId, params));
    this.name = new.target.name;
    this.messageId = messageId;
  }
}

const AUTH_MODES: readonly string[] = Object.values(AuthMode);

async function assertDefinition<I extends z.ZodType, O extends z.ZodType>(
  definition: CapabilityDefinition<I, O>,
): Promise<void> {
  if (definition.id.trim().length === 0) {
    throw new CapabilityDefinitionError(MessageId.EmptyCapabilityId);
  }
  if (!AUTH_MODES.includes(definition.auth)) {
    throw new CapabilityDefinitionError(MessageId.MissingAuthMode, { id: definition.id });
  }
  const isCustom = definition.method === MethodKind.Custom;
  const hasVerb = definition.customVerb !== undefined && definition.customVerb.length > 0;
  if (isCustom !== hasVerb) {
    throw new CapabilityDefinitionError(MessageId.CustomVerbMismatch, { id: definition.id });
  }
  if (!isCustom && definition.httpMethod !== undefined) {
    throw new CapabilityDefinitionError(MessageId.HttpMethodForStandard, { id: definition.id });
  }
}

export async function defineCapability<I extends z.ZodType, O extends z.ZodType>(
  definition: CapabilityDefinition<I, O>,
): Promise<Capability> {
  await assertDefinition(definition);
  return Object.freeze({ ...definition }) as unknown as Capability;
}
