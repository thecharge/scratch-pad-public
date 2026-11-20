import { join } from "node:path";
import { LLM_EVIDENCE_PATH } from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { McpHarnessEvidenceListSchema } from "@platform/types";
import { llmScenarios } from "./llm-scenarios.ts";
import { startHarness } from "./mcp-harness.ts";

export async function runMcpModelCheck(
  evidencePath: string = LLM_EVIDENCE_PATH,
  start: typeof startHarness = startHarness,
  write: (path: string, content: string) => Promise<unknown> = Bun.write,
) {
  const harness = await start();
  try {
    const configs: Record<string, string> = {};
    for (const scenario of llmScenarios())
      configs[scenario.id] = await harness.configFor(scenario.scopes);
    const result = await harness.run({
      TEST_MODEL_CONFIGS: JSON.stringify(configs),
      TEST_MODEL_ORIGIN: harness.origin,
      TEST_MODEL_TOKEN: (await harness.token(["read", "write", "admin"])) ?? "",
    });
    if (result.exitCode !== 0) throw new Error(result.stderr);
    const evidence = McpHarnessEvidenceListSchema.parse(JSON.parse(result.stdout));
    await write(join(REPO_ROOT, evidencePath), JSON.stringify(evidence, null, 2));
    const failures = evidence.flatMap((item) => item.problems);
    console.log(
      JSON.stringify({
        mode: "scripted",
        scenarios: evidence.length,
        problems: failures,
        path: evidencePath,
      }),
    );
    return failures.length === 0 ? 0 : 1;
  } finally {
    await harness.stop();
  }
}

if (import.meta.main) process.exit(await runMcpModelCheck());
