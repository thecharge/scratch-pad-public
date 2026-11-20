import { rm } from "node:fs/promises";
import { join } from "node:path";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { EnvironmentName } from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { stackDown, stackUp } from "../../../../apps/infra/src/cli.ts";
import { runProxyClient } from "./asset-client-fixtures.ts";
import { scopedApiFixture } from "./scoped-api-fixtures.ts";

export async function startHarness() {
  const environment = EnvironmentName.Test;
  if ((await stackUp(environment)) !== 0) throw new Error("The model test stack could not start.");
  let fixture: Awaited<ReturnType<typeof scopedApiFixture>>;
  try {
    fixture = await scopedApiFixture(environment);
  } catch (error) {
    await stackDown(environment);
    throw error;
  }
  const directory = join(REPO_ROOT, ".stack/e2e/model-config");
  const token = async (scopes: readonly string[]) =>
    scopes.length === 0
      ? undefined
      : fixture.issuer.issue({ scopes: [...scopes], expiresInSeconds: 1800 });
  const configFor = async (scopes: readonly string[]) => {
    const bearer = await token(scopes);
    const headers = { authorization: `Bearer ${bearer}` };
    const entry = {
      type: "http",
      url: `${TEST_PROXY_ORIGIN}/mcp`,
      ...(bearer === undefined ? {} : { headers }),
    };
    const path = join(directory, `${scopes.join("-") || "anonymous"}.json`);
    await Bun.write(path, JSON.stringify({ mcpServers: { platform: entry } }));
    return path;
  };
  return {
    origin: TEST_PROXY_ORIGIN,
    token,
    configFor,
    run: async (variables: Record<string, string>) =>
      runProxyClient(environment, "mcp-harness", [], variables),
    stop: async () => {
      await fixture.stop();
      const code = await stackDown(environment);
      await rm(directory, { recursive: true, force: true });
      if (code !== 0) throw new Error("The model test stack did not stop successfully.");
    },
  };
}
