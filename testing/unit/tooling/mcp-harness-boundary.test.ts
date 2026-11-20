import { expect, test } from "bun:test";
import { join } from "node:path";
import { REPO_ROOT } from "@platform/test-framework";

test.each([
  "testing/packages/scenarios/src/mcp-harness.ts",
  "testing/packages/scenarios/src/mcp-harness-entry.ts",
  "testing/packages/scenarios/src/mcp-llm-check.ts",
])("automated harness %s has no model launcher or provider account access", async (path) => {
  const source = await Bun.file(join(REPO_ROOT, path)).text();
  expect(source).not.toMatch(
    /Bun\.(spawn|which)|\.credentials\.json|homedir|CLAUDE_|ANTHROPIC_|OPENAI_API_KEY|from ["'](?:openai|@anthropic-ai\/sdk)["']/,
  );
});
