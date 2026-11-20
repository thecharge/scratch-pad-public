import { requireResourceName } from "@platform/aip";
import { defineCapability } from "@platform/capability";
import {
  AuthMode,
  ConfigCapabilityId,
  DomainPattern,
  MessageId,
  MethodKind,
} from "@platform/constants";
import { type ApiDeps, ConfigSchema, UpdateConfigInputSchema } from "@platform/types";
import { z } from "zod";
import { ADMIN_POLICY, describe } from "./support.ts";

const ConfigNameInputSchema = z.strictObject({ name: z.string() });

export async function getConfig(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      ConfigCapabilityId.Get,
      MethodKind.Get,
      DomainPattern.Config,
      MessageId.SummaryConfigGet,
    )),
    auth: AuthMode.None,
    input: ConfigNameInputSchema,
    output: ConfigSchema,
    handler: async ({ name }) => {
      await requireResourceName(DomainPattern.Config, name);
      return deps.settings.read();
    },
  });
}

export async function updateConfig(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      ConfigCapabilityId.Update,
      MethodKind.Update,
      DomainPattern.Config,
      MessageId.SummaryConfigUpdate,
    )),
    auth: AuthMode.Required,
    input: UpdateConfigInputSchema,
    output: ConfigSchema,
    policy: ADMIN_POLICY,
    handler: async ({ name, ...patch }) => {
      await requireResourceName(DomainPattern.Config, name);
      const current = await deps.settings.read();
      const next = {
        ...current,
        bannerText: patch.bannerText ?? current.bannerText,
        pageSizeDefault: patch.pageSizeDefault ?? current.pageSizeDefault,
      };
      await deps.settings.write(next);
      return next;
    },
  });
}
