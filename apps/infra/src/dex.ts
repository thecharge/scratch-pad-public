import { DEX_REDIRECT_URI } from "@platform/config/environments";
import { DEX_USER_ID, MessageId, PORT_SEPARATOR, Text } from "@platform/constants";
import { message } from "@platform/messages";
import { type IdentityEnvironment, IdentityEnvironmentSchema } from "@platform/types";

export async function dexIssuerOf(identity: IdentityEnvironment, scheme: string): Promise<string> {
  const checked = IdentityEnvironmentSchema.parse(identity);
  return [scheme, checked.alias, PORT_SEPARATOR, checked.port, checked.path].join(Text.Empty);
}

export async function renderDexConfig(
  identity: IdentityEnvironment,
  scheme: string,
): Promise<string> {
  const checked = IdentityEnvironmentSchema.parse(identity);
  return message(MessageId.DexConfigTemplate, {
    issuer: await dexIssuerOf(checked, scheme),
    port: checked.port,
    clientId: checked.clientId,
    clientSecret: checked.clientSecret,
    redirect: DEX_REDIRECT_URI,
    email: checked.email,
    hash: checked.passwordHash,
    userId: DEX_USER_ID,
    groups: JSON.stringify(checked.groups),
  });
}
