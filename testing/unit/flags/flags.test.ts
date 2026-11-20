import { describe, expect, test } from "bun:test";
import { FeatureFlag } from "@platform/constants";
import { createFlags } from "../../../packages/flags/src/flags.ts";

describe("feature flags through OpenFeature", () => {
  test("a flag set on evaluates on and a flag set off evaluates off", async () => {
    const flags = await createFlags({ [FeatureFlag.BooksSuggest]: true, other: false });
    expect([await flags.enabled(FeatureFlag.BooksSuggest), await flags.enabled("other")]).toEqual([
      true,
      false,
    ]);
  });

  test("a flag the provider does not know falls back to its documented default", async () => {
    expect(await (await createFlags({})).enabled(FeatureFlag.BooksSuggest)).toBe(false);
  });

  test("a flag changed while running is evaluated with the new value", async () => {
    const flags = await createFlags({ [FeatureFlag.BooksSuggest]: false });
    await flags.set({ [FeatureFlag.BooksSuggest]: true });
    expect(await flags.enabled(FeatureFlag.BooksSuggest)).toBe(true);
  });

  test("two clients do not share state", async () => {
    const first = await createFlags({ [FeatureFlag.BooksSuggest]: true });
    const second = await createFlags({ [FeatureFlag.BooksSuggest]: false });
    expect([
      await first.enabled(FeatureFlag.BooksSuggest),
      await second.enabled(FeatureFlag.BooksSuggest),
    ]).toEqual([true, false]);
  });
});
