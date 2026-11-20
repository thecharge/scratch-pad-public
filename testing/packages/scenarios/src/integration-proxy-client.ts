import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { waitUntil } from "@platform/test-framework";
import {
  type IssueOptions,
  SdkIntegrationInfoSchema,
  type SdkIntegrationInput,
  SignedTokenSchema,
  type TestIssuer,
} from "@platform/types";
import { createLocalJWKSet } from "jose";

export async function waitForProxyIntegration() {
  await waitUntil(async () => {
    const response = await fetch(`${TEST_PROXY_ORIGIN}/__ready`).catch(() => undefined);
    return response?.ok === true;
  });
}

export async function finishProxyIntegration() {
  const response = await fetch(`${TEST_PROXY_ORIGIN}/__finish`);
  if (!response.ok) throw new Error(`SDK backend finish failed: ${response.status}`);
}

export async function proxyBackendRefused() {
  const target = Bun.env.SDK_BACKEND_ORIGIN;
  if (target === undefined) throw new Error("missing SDK backend target");
  return fetch(`${target}/v1/config`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(500),
  }).then(
    () => false,
    () => true,
  );
}

export async function proxyFixture(input: SdkIntegrationInput) {
  await waitForProxyIntegration();
  const headers = { "content-type": "application/json", accept: "application/json" };
  const response = await fetch(`${TEST_PROXY_ORIGIN}/__fixture`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`SDK fixture failed: ${response.status}`);
  const info = SdkIntegrationInfoSchema.parse(await response.json());
  const origin = `${TEST_PROXY_ORIGIN}/__fixture/${info.id}`;
  const issuer: TestIssuer = {
    ...info,
    keys: createLocalJWKSet(info.jwks),
    issue: async (options: IssueOptions = {}) => {
      const result = await fetch(`${origin}/__token`, {
        method: "POST",
        headers,
        body: JSON.stringify(options),
      });
      if (!result.ok) throw new Error(`SDK token fixture failed: ${result.status}`);
      return SignedTokenSchema.parse(await result.json()).token;
    },
  };
  return { origin, issuer, id: info.id };
}
