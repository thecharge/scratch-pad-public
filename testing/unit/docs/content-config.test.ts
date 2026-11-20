import { describe, expect, mock, test } from "bun:test";

const defined: unknown[] = [];
mock.module("astro:content", () => ({
  defineCollection: (config: unknown) => {
    defined.push(config);
    return config;
  },
}));

const { collections } = await import("../../../apps/docs/src/content.config.ts");

describe("the documentation content collection", () => {
  test("the site has one collection, named docs", () => {
    expect(Object.keys(collections)).toEqual(["docs"]);
  });

  test("the collection is defined once with a loader and a schema", () => {
    expect(defined).toHaveLength(1);
    expect(Object.keys(collections.docs as object).sort()).toEqual(["loader", "schema"]);
  });

  test("the loader reads the pages of the site", () => {
    const loader = Reflect.get(collections.docs, "loader");
    expect(Reflect.get(loader, "name")).toBe("starlight-docs-loader");
  });
});
