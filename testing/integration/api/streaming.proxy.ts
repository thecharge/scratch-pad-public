import { afterAll, describe, expect, test } from "bun:test";
import { PROXY_HOST, PROXY_PORT } from "@platform/config/environments";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { HttpHeader, MediaType } from "@platform/constants";
import { chunksOfBody, headOf, makeDir, rawHttp, removeAll } from "@platform/test-scenarios";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const STEP_MS = 40;
const MIN_GAP_MS = 50;
const fixture = await proxyFixture({
  enabled: true,
  domain: "api.test",
  slowStreamMs: STEP_MS,
  skillDirs: [await makeDir()],
});

const token = await fixture.issuer.issue({ scopes: ["read"] });
const raw = await rawHttp(
  PROXY_PORT,
  `GET /__fixture/${fixture.id}/slow HTTP/1.1\r\nHost: ${PROXY_HOST}\r\nConnection: close\r\n\r\n`,
  TEST_PROXY_ORIGIN,
);
const started = Date.now();
const reader = (await fetch(`${fixture.origin}/slow`)).body?.getReader();
const first = await reader?.read();
const firstAt = Date.now() - started;
await reader?.cancel();
const whole = await (await fetch(`${fixture.origin}/slow`)).text();
const wholeAt = Date.now() - started;
const listed = await fetch(`${fixture.origin}/v1/publishers/p1/books`, {
  headers: { [HttpHeader.Authorization]: `Bearer ${token}` },
});
const page = await listed.json();

afterAll(async () => {
  await removeAll();
  await finishProxyIntegration();
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});

describe("a response produced over time is written as it is produced (HTTP/1.1)", () => {
  test("the response is chunked and carries no length", async () => {
    const head = (await headOf(raw)).toLowerCase();
    expect(head).toContain("transfer-encoding: chunked");
    expect(head).not.toContain("content-length");
  });

  test("the document leaves in one chunk per element", async () => {
    const chunks = await chunksOfBody(raw);
    expect(chunks[0]).toBe('{"books":[');
    expect(chunks.join("")).toBe('{"books":[1,2,3,4],"nextPageToken":""}');
  });

  test("the first bytes arrive well before the last element is produced", async () => {
    expect(first?.done).toBe(false);
    expect(wholeAt - firstAt).toBeGreaterThanOrEqual(MIN_GAP_MS);
    expect(whole).toBe('{"books":[1,2,3,4],"nextPageToken":""}');
  });
});

describe("a list through the API is one AIP-158 page", () => {
  test("it answers 200 as JSON", async () => {
    expect(listed.status).toBe(200);
    expect(listed.headers.get(HttpHeader.ContentType)).toBe(MediaType.Json);
  });

  test("it holds the resources and the token field", async () => {
    expect(Array.isArray(page.books)).toBe(true);
    expect(typeof page.nextPageToken).toBe("string");
  });
});
