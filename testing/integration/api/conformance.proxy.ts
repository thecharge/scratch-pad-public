import { afterAll, describe, expect, test } from "bun:test";
import { publicPath, routeFor } from "@platform/aip";
import {
  BookCapabilityId,
  CanonicalCode,
  CUSTOM_VERB_SEPARATOR,
  ErrorMetadataKey,
  ErrorReason,
  HttpHeader,
  MASK_REPLACEMENT,
  MethodKind,
  RATE_LIMIT_PROBE_CALLS,
  ResourcePattern,
  TransportKind,
} from "@platform/constants";
import { ADMIN_SCOPES, READER_SCOPES, tokenFor } from "@platform/test-framework";
import type { ApiErrorBody, Capability, Operation } from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";
import { createRegistry } from "../../../apps/api/src/registry.ts";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const PARENT = "publishers/p1";
const PLACEHOLDER = /\{\w+\}/g;
const PATH_VALUES = ["p1", "b1"];
afterAll(finishProxyIntegration);

async function start(captureLogs = false) {
  const fixture = await proxyFixture({
    enabled: true,
    captureLogs,
    enableSuggest: true,
    domain: "api.test",
  });
  return { base: fixture.origin, issuer: fixture.issuer };
}

function bearer(token: string | undefined): Record<string, string> {
  return token === undefined ? {} : { [HttpHeader.Authorization]: `Bearer ${token}` };
}

function post(base: string, path: string, token: string | undefined) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { ...bearer(token), [HttpHeader.ContentType]: "application/json" },
    body: "{}",
  });
}

function fill(path: string): string {
  const values = [...PATH_VALUES];
  return path.replace(PLACEHOLDER, () => values.shift() ?? "x");
}

async function customCapabilities(): Promise<Capability[]> {
  const capabilities = await (await createRegistry()).list();
  return capabilities.filter(
    (capability) =>
      capability.method === MethodKind.Custom && capability.onlyOver !== TransportKind.Mcp,
  );
}

const CUSTOM = await customCapabilities();

async function operationPath(base: string, token: string, verb: string): Promise<string> {
  const started = await post(base, `/v1/${PARENT}/books:reindex`, token);
  const { name } = (await started.json()) as Operation;
  return `/v1/${name}${CUSTOM_VERB_SEPARATOR}${verb}`;
}

async function seedBook(base: string, token: string) {
  const book = { title: "T" };
  return fetch(`${base}/v1/${PARENT}/books?bookId=b1`, {
    method: "POST",
    headers: { ...bearer(token), [HttpHeader.ContentType]: "application/json" },
    body: JSON.stringify(book),
  });
}

describe("rate limiting over HTTP", () => {
  test("the call over the limit is RESOURCE_EXHAUSTED with retryAfterSeconds and Retry-After", async () => {
    const { base, issuer } = await start();
    const token = await tokenFor(issuer, ADMIN_SCOPES);
    const path = `/v1/${PARENT}/books:reindex`;
    const responses = await all(
      Array.from({ length: RATE_LIMIT_PROBE_CALLS }, () => async () => post(base, path, token)),
    );
    const limited = responses.filter((response) => response.status === 429);
    const body = (await limited[0]?.json()) as ApiErrorBody;
    expect(limited).toHaveLength(1);
    expect(body.error.status).toBe(CanonicalCode.ResourceExhausted);
    expect(body.error.details[0]).toMatchObject({
      reason: ErrorReason.RateLimited,
      metadata: { [ErrorMetadataKey.RetryAfterSeconds]: expect.stringMatching(/^\d+$/) },
    });
    expect(Number(limited[0]?.headers.get(HttpHeader.RetryAfter))).toBeGreaterThan(0);
  });
});

describe("security headers on the real API", () => {
  test.each([
    ["a 404", "/v1/nothing-here", false, 404],
    ["a 401", `/v1/${PARENT}/books`, false, 401],
    ["a 200", "/v1/config", false, 200],
    ["an authorized 200", `/v1/${PARENT}/books`, true, 200],
  ])("%s carries every security header", async (_name, path, authorized, status) => {
    const { base, issuer } = await start();
    const token = authorized ? await tokenFor(issuer, ADMIN_SCOPES) : undefined;
    const response = await fetch(`${base}${path}`, { headers: bearer(token) });
    expect(response.status).toBe(status);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("strict-transport-security")).toContain("max-age=");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  });
});

describe("token redaction in the real logger", () => {
  test("an Authorization header is censored and the credential never appears in the output", async () => {
    const { base, issuer } = await start(true);
    const token = (await tokenFor(issuer, ADMIN_SCOPES)) as string;
    await fetch(`${base}/v1/config`, { headers: bearer(token) });
    const headers = { authorization: `Bearer ${token}` };
    const payload = { req: { headers } };
    const logged = await fetch(`${base}/__log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const output = z.string().parse(await logged.json());
    expect(output).toContain(MASK_REPLACEMENT);
    expect(output).not.toContain(token);
    expect(output).not.toMatch(/Bearer\s+\S/);
  });
});

describe("the admin only streams", () => {
  test("a non-admin is 403 on the event stream and on the log capability", async () => {
    const { base, issuer } = await start();
    const token = await tokenFor(issuer, READER_SCOPES);
    const [stream, logs] = (await all([
      async () => fetch(`${base}/v1/events`, { headers: bearer(token) }),
      async () => fetch(`${base}/v1/logs`, { headers: bearer(token) }),
    ])) as [Response, Response];
    expect([stream.status, logs.status]).toEqual([403, 403]);
  });
});

describe("conformance over all custom methods", () => {
  test.each(CUSTOM.map((capability) => [capability.id, capability] as const))(
    "%s is reachable on its public colon path",
    async (_id, capability) => {
      const { base, issuer } = await start();
      const token = (await tokenFor(issuer, ADMIN_SCOPES)) as string;
      await seedBook(base, token);
      const route = await routeFor(capability);
      const path =
        capability.resource === ResourcePattern.Operation
          ? await operationPath(base, token, String(route.verb))
          : fill(await publicPath(route, capability.version));
      const response = await post(base, path, token);
      expect([404, 405]).not.toContain(response.status);
    },
  );

  test("the registry has custom methods to exercise", () => {
    expect(CUSTOM.map((capability) => capability.id)).toContain(BookCapabilityId.Archive);
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
