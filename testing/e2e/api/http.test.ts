import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import {
  DocCategory,
  EnvironmentName,
  FeatureFlag,
  HTTP_API_RECORD_PATH,
} from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { documentStep } from "@platform/test-scenarios";
import { type RecordedPage, RecordedPageSchema } from "@platform/types";
import { stackDown, stackUp } from "../../../apps/infra/src/cli.ts";
import { runProxyClient } from "../../packages/scenarios/src/asset-client-fixtures.ts";
import {
  assertHttpCoverage,
  prepareHttpCurl,
  publishHttpPage,
} from "../../packages/scenarios/src/http-api-fixtures.ts";
import {
  OBJECT_STORE_TEST_ENV,
  setObjectStoreEnvironment,
} from "../../packages/scenarios/src/object-store-fixtures.ts";
import { scopedApiFixture } from "../../packages/scenarios/src/scoped-api-fixtures.ts";

const environment = EnvironmentName.Test;
const previousAccess = Bun.env.RUSTFS_ACCESS_KEY;
const previousSecret = Bun.env.RUSTFS_SECRET_KEY;
const budget = 1_800_000;
let fixture: Awaited<ReturnType<typeof scopedApiFixture>> | undefined;
let curl = "";
const recordings: RecordedPage[] = [];
const versions = [
  ["--http1.1", "1.1"],
  ["--http2", "2"],
  ["--http3-only", "3"],
];
beforeAll(async () => {
  await rm(join(REPO_ROOT, HTTP_API_RECORD_PATH), { force: true });
  await setObjectStoreEnvironment(OBJECT_STORE_TEST_ENV);
  expect(await stackUp(environment)).toBe(0);
  curl = await prepareHttpCurl();
}, budget);
beforeEach(async () => {
  fixture = await scopedApiFixture(environment, 200, true);
}, budget);
afterEach(async () => {
  await fixture?.stop();
  fixture = undefined;
}, budget);
afterAll(async () => {
  const stopped = await stackDown(environment);
  await rm(curl, { force: true });
  await setObjectStoreEnvironment({
    RUSTFS_ACCESS_KEY: previousAccess,
    RUSTFS_SECRET_KEY: previousSecret,
  });
  expect(stopped).toBe(0);
}, budget);

async function enabledAlpha(flag: string, version: string) {
  await fixture?.stop();
  fixture = undefined;
  fixture = await scopedApiFixture(
    environment,
    0,
    true,
    undefined,
    [],
    `${FeatureFlag.BooksSuggest}=true`,
  );
  const result = await runProxyClient(
    environment,
    "http-alpha",
    [],
    {
      TEST_HTTP_ORIGIN: TEST_PROXY_ORIGIN,
      TEST_HTTP_ADMIN: fixture.owner,
      TEST_HTTP_CURL: curl,
      TEST_HTTP_PROTOCOL: flag,
      TEST_HTTP_VERSION: version,
      TEST_HTTP_CASE_PREFIX: `alpha-${version.replace(".", "-")}`,
    },
    ["test"],
  );
  expect(result.exitCode, result.stderr).toBe(0);
  const line = result.stdout.split("\n").find((value) => value.startsWith("[{"));
  return JSON.parse(line ?? "[]");
}

test.each(versions)(
  "the HTTP API lifecycle, permissions and documents pass through Caddy with %s as HTTP %s",
  (flag, version) =>
    documentStep(
      {
        id: `http-api-proxy-${version}`,
        title: `The HTTP API passes through Caddy over HTTP ${version}`,
        checked:
          "Every existing lifecycle, ordering, permission, error, version and OpenAPI assertion runs from the isolated edge network against the authenticated packaged API.",
        version,
      },
      async () => {
        const writer = await fixture?.issuer.issue({
          scopes: ["read", "write"],
          expiresInSeconds: 1800,
        });
        const result = await runProxyClient(
          environment,
          "http-api",
          [],
          {
            TEST_HTTP_ORIGIN: TEST_PROXY_ORIGIN,
            TEST_HTTP_ADMIN: fixture?.owner ?? "",
            TEST_HTTP_WRITER: writer ?? "",
            TEST_HTTP_READER: fixture?.reader ?? "",
            TEST_HTTP_CURL: curl,
            TEST_HTTP_PROTOCOL: flag,
            TEST_HTTP_VERSION: version,
            TEST_HTTP_CASE_PREFIX: `http-${version.replace(".", "-")}`,
          },
          ["test"],
        );
        expect(result.exitCode, result.stderr).toBe(0);
        const recording = result.stdout.split("\n").find((line) => line.startsWith("[{"));
        const exchanges = JSON.parse(recording ?? "[]");
        expect(exchanges.length).toBeGreaterThan(15);
        const page = RecordedPageSchema.parse({
          id: "http-api-lifecycle",
          title: "Call the HTTP API",
          intent: "Create and manage books, list results and handle errors with the HTTP API.",
          category: DocCategory.ApiCalls,
          results: [...exchanges, ...(await enabledAlpha(flag, version))],
        });
        await assertHttpCoverage(page);
        await publishHttpPage(page, recordings, versions.length);
      },
    ),
  budget,
);
