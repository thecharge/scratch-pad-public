import { expect, test } from "bun:test";
import { MCP_HARNESS_E2E_EVIDENCE_PATH } from "@platform/constants";
import { documentStep } from "@platform/test-scenarios";
import { runMcpModelCheck } from "../../packages/scenarios/src/mcp-llm-check.ts";

test(
  "a scripted harness uses MCP through Caddy from the isolated edge network",
  () =>
    documentStep(
      {
        id: "mcp-model-proxy",
        title: "A scripted harness uses the proxy MCP endpoint",
        checked:
          "Administrator writes, reader refusal, anonymous configuration and skill guidance pass with recorded client exchanges and an independent server-state check. No model inference is used.",
        version: "all",
      },
      async () => {
        expect(await runMcpModelCheck(MCP_HARNESS_E2E_EVIDENCE_PATH)).toBe(0);
      },
    ),
  1_800_000,
);
