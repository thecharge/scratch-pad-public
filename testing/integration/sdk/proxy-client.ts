import { tokenFor } from "@platform/test-framework";
import { createSdkClient } from "../../../packages/sdk/src/index.ts";
import { proxyFixture } from "../../packages/scenarios/src/integration-proxy-client.ts";

export {
  finishProxyIntegration as finishSdkIntegration,
  proxyBackendRefused as sdkBackendRefused,
  waitForProxyIntegration as waitForSdkIntegration,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

export async function proxyBoot(enabled = true) {
  const { origin, issuer } = await proxyFixture({ enabled });
  const as = async (scopes: readonly string[]) => {
    const token = await tokenFor(issuer, scopes);
    return createSdkClient({ origin, ...(token === undefined ? {} : { token }) });
  };
  return { as, issuer, origin };
}
