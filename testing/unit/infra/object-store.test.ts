import { expect, test } from "bun:test";
import { environmentFor, OBJECT_STORE_IMAGE } from "@platform/config/environments";
import { EnvironmentName } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { TEST_PROXY_SECRET } from "@platform/test-scenarios";
import type { StackEnvironment, StackPlan } from "@platform/types";
import { renderCaddyfile } from "../../../apps/infra/src/caddy.ts";
import { dataFoldersOf, planFor } from "../../../apps/infra/src/plan.ts";

const credentials = {
  RUSTFS_ACCESS_KEY: "fixture-access",
  RUSTFS_SECRET_KEY: "fixture-secret-for-object-store",
};
const productionCredentials = { ...credentials, PLATFORM_ASSET_HOST: "assets.example.test" };
const development = await environmentFor(
  EnvironmentName.Development,
  TEST_PROXY_SECRET,
  credentials,
);
const configured = await environmentFor(EnvironmentName.Test, TEST_PROXY_SECRET, credentials);
const invalid = { ...configured, objectStore: { ...configured.objectStore, secretKey: "short" } };
const unpinned = {
  ...configured,
  objectStore: { ...configured.objectStore, image: "unversioned" },
};
const zodError = { name: "ZodError" };
const storeOf = async (plan: StackPlan) =>
  plan.containers.find((item) => item.name.endsWith("-object-store"));
const summary = async (plan: StackPlan) => {
  const store = await storeOf(plan);
  return [
    store?.image,
    store?.ports,
    store?.attachments,
    store?.mounts.map((mount) => [mount.source, mount.target]),
    store?.env.RUSTFS_CONSOLE_ENABLE,
  ];
};
const testAttachments = [
  { network: "platform-test-backend", aliases: ["object-store"], address: "10.91.2.13" },
];
const testMounts = [
  ["/work/repo/.stack/data/platform-test-object-store-data", "/data"],
  ["/work/repo/.stack/data/platform-test-object-store-logs", "/logs"],
];

unit(environmentFor, {
  positive: [
    positive(
      "test enables the pinned store only with configured credentials",
      [EnvironmentName.Test, TEST_PROXY_SECRET, credentials],
      seen(
        async (environment: StackEnvironment) => environment.objectStore?.image,
        OBJECT_STORE_IMAGE,
      ),
    ),
    positive(
      "production uses the supplied public asset host",
      [EnvironmentName.Production, TEST_PROXY_SECRET, productionCredentials],
      seen(
        async (environment: StackEnvironment) => environment.objectStore?.host,
        "assets.example.test",
      ),
    ),
  ],
  negative: [
    negative(
      "partial credentials cannot start a store",
      [EnvironmentName.Test, TEST_PROXY_SECRET, { RUSTFS_ACCESS_KEY: "fixture-access" }],
      zodError,
    ),
    negative(
      "production credentials require an asset host",
      [EnvironmentName.Production, TEST_PROXY_SECRET, credentials],
      zodError,
    ),
  ],
});

unit(planFor, {
  positive: [
    positive(
      "store has only backend access, no published port and persistent separate mounts",
      [configured, "/work/repo"],
      seen(summary, [OBJECT_STORE_IMAGE, [], testAttachments, testMounts, "false"]),
    ),
    positive(
      "development has its own store address and isolated folders",
      [development, "/work/repo"],
      seen(async (plan) => (await storeOf(plan))?.attachments[0]?.address, "10.91.1.13"),
    ),
  ],
  negative: [
    negative("invalid credentials stop planning", [invalid, "/work/repo"], zodError),
    negative("an unpinned store image stops planning", [unpinned, "/work/repo"], zodError),
  ],
});

const rendered = await renderCaddyfile(configured.proxy, "api", 3000, [], configured.objectStore);
test("object-store route streams to the fixed backend address and preserves the signed host", async () => {
  expect(rendered).toContain("assets.proxy:8443 {");
  expect(rendered).toContain("reverse_proxy 10.91.2.13:9000");
  expect(rendered).not.toContain("header_up Host");
  expect(rendered).not.toContain(credentials.RUSTFS_ACCESS_KEY);
  expect(rendered).not.toContain(credentials.RUSTFS_SECRET_KEY);
});
test("store mounts have the image user's ownership and separate names", async () => {
  const folders = await dataFoldersOf(configured, "/work/repo");
  expect(folders.slice(2).map((folder) => folder.owner)).toEqual(["10001:10001", "10001:10001"]);
  expect(folders.map((folder) => folder.path)).toHaveLength(4);
});
test("omitting storage credentials preserves the ordinary environment", async () => {
  expect(
    (await environmentFor(EnvironmentName.Test, TEST_PROXY_SECRET)).objectStore,
  ).toBeUndefined();
});

test("website hosts use the same object store and only console has an index fallback", async () => {
  expect(configured.objectStore?.websites.map((site) => site.host)).toEqual([
    "console.sites.assets.proxy",
    "docs.sites.assets.proxy",
  ]);
  expect(rendered).toContain("console.sites.assets.proxy:8443 {");
  expect(rendered).toContain("docs.sites.assets.proxy:8443 {");
  expect(rendered.match(/handle_response @missing/g)).toHaveLength(1);
  expect(rendered).toContain("rewrite * /index.html");
  const plan = await planFor(configured);
  const store = await storeOf(plan);
  expect(store?.env.RUSTFS_WEBSITE_DOMAINS).toBe("sites.assets.proxy");
  expect(plan.containers[0]?.attachments[0]?.aliases).toContain("console.sites.assets.proxy");
});

const productionStore = await environmentFor(
  EnvironmentName.Production,
  TEST_PROXY_SECRET,
  productionCredentials,
);
unit(renderCaddyfile, {
  positive: [
    positive(
      "public website hosts use public certificates",
      [productionStore.proxy, "api", 3000, [], productionStore.objectStore],
      seen(
        async (text: string) => [
          text.includes("console.sites.assets.example.test:443"),
          text.includes("tls internal"),
        ],
        [true, false],
      ),
    ),
    positive(
      "internal website hosts use the internal authority",
      [configured.proxy, "api", 3000, [], configured.objectStore],
      seen(async (text: string) => text.includes("tls internal"), true),
    ),
  ],
  negative: [
    negative(
      "invalid store port cannot render a route",
      [configured.proxy, "api", 3000, [], { ...configured.objectStore, port: 0 }],
      zodError,
    ),
    negative(
      "invalid website host cannot render a route",
      [configured.proxy, "api", 3000, [], { ...configured.objectStore, websiteDomain: "" }],
      zodError,
    ),
  ],
});
