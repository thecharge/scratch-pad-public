import { afterAll, beforeAll, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { EnvironmentName, MCP_RECORD_PATH } from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { documentStep } from "@platform/test-scenarios";
import { stackDown, stackUp } from "../../../apps/infra/src/cli.ts";
import { runProxyClient } from "../../packages/scenarios/src/asset-client-fixtures.ts";
import { mcpRecordedPage } from "../../packages/scenarios/src/mcp-recording.ts";
import { scopedApiFixture } from "../../packages/scenarios/src/scoped-api-fixtures.ts";

const environment = EnvironmentName.Test;
const budget = 1_800_000;
let token = "";
let scoped: Awaited<ReturnType<typeof scopedApiFixture>> | undefined;
const record = join(REPO_ROOT, ".stack/e2e/mcp-tasks.json");
beforeAll(async () => {
  await rm(record, { force: true });
  await rm(join(REPO_ROOT, MCP_RECORD_PATH), { force: true });
  expect(await stackUp(environment)).toBe(0);
  scoped = await scopedApiFixture(environment, 5, true);
  token = scoped.owner;
}, budget);
afterAll(async () => {
  await scoped?.stop();
  expect(await stackDown(environment)).toBe(0);
}, budget);

test(
  "official MCP Tasks and progress work through Caddy from the isolated edge network",
  () =>
    documentStep(
      {
        id: "mcp-tasks-proxy",
        title: "MCP task handles and progress work through the proxy",
        checked:
          "The official client verifies TLS, discovers tools, completes and cancels tasks, receives inline wait progress, refuses unknown tasks and refuses GET.",
        version: "all",
      },
      async () => {
        const result = await runProxyClient(environment, "mcp-task", [], {
          TEST_MCP_ORIGIN: TEST_PROXY_ORIGIN,
          TEST_MCP_TOKEN: token,
        });
        expect(result.exitCode, result.stderr).toBe(0);
        const proof = JSON.parse(result.stdout);
        expect(proof.cancelled).toBe(true);
        expect(proof.completed.structuredContent.done).toBe(true);
        expect(proof.progress.length).toBeGreaterThan(1);
        await Bun.write(record, JSON.stringify(proof));
        await Bun.write(
          join(REPO_ROOT, MCP_RECORD_PATH),
          JSON.stringify(await mcpRecordedPage(proof.exchanges)),
        );
      },
    ),
  budget,
);
