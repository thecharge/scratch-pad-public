import {
  FLAG_DEFAULTS,
  FLAG_DOMAIN,
  FlagProviderKind,
  FlagVariant,
  Separator,
} from "@platform/constants";
import { lazy } from "@platform/store";
import type { FeatureFlags, FlagValues } from "@platform/types";

async function configurationOf(values: FlagValues) {
  return Object.fromEntries(
    Object.entries(values).map(([key, on]) => [
      key,
      {
        disabled: false,
        variants: { [FlagVariant.On]: true, [FlagVariant.Off]: false },
        defaultVariant: on ? FlagVariant.On : FlagVariant.Off,
      },
    ]),
  );
}

async function inMemory(values: FlagValues) {
  const { InMemoryProvider } = await import("@openfeature/server-sdk");
  return new InMemoryProvider(await configurationOf(values));
}

const PROVIDERS: Readonly<
  Record<FlagProviderKind, (values: FlagValues) => ReturnType<typeof inMemory>>
> = {
  [FlagProviderKind.InMemory]: inMemory,
};

export async function createFlags(
  values: FlagValues = {},
  kind: FlagProviderKind = FlagProviderKind.InMemory,
): Promise<FeatureFlags> {
  const domain = [FLAG_DOMAIN, crypto.randomUUID()].join(Separator.Resource);
  let current: FlagValues = values;
  const ready = lazy(async () => {
    const { OpenFeature } = await import("@openfeature/server-sdk");
    const provider = await PROVIDERS[kind](current);
    await OpenFeature.setProviderAndWait(domain, provider);
    return { client: OpenFeature.getClient(domain), provider };
  });
  return {
    async enabled(key) {
      const { client } = await ready();
      return client.getBooleanValue(key, FLAG_DEFAULTS[key as keyof typeof FLAG_DEFAULTS] ?? false);
    },
    async set(next) {
      const { provider } = await ready();
      current = { ...current, ...next };
      await provider.putConfiguration(await configurationOf(current));
    },
  };
}
