import { appendFile } from "node:fs/promises";
import { PROTOCOL_REPORT_ENV, Text } from "@platform/constants";
import type { ProtocolOutcome, ProtocolStepSpec } from "@platform/types";

export async function documentStep(
  spec: ProtocolStepSpec,
  run: () => Promise<void>,
): Promise<void> {
  const file = Bun.env[PROTOCOL_REPORT_ENV];
  const write = async (outcome: ProtocolOutcome) => {
    if (file !== undefined) {
      await appendFile(file, JSON.stringify({ ...spec, ...outcome }) + Text.Newline);
    }
  };
  try {
    await run();
  } catch (error) {
    await write({ passed: false, detail: String(error) });
    throw error;
  }
  await write({ passed: true, detail: Text.Empty });
}
