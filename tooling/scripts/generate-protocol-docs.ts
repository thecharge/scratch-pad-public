import { join } from "node:path";
import {
  PROTOCOL_FAILED,
  PROTOCOL_PASSED,
  PROTOCOL_REPORT_DIR,
  PROTOCOL_REPORT_FILE,
  PROTOCOLS_COLUMNS,
  PROTOCOLS_FRONT,
  PROTOCOLS_INTRO,
  PROTOCOLS_PAGE,
  Text,
} from "@platform/constants";
import { type ProtocolStep, ProtocolStepSchema } from "@platform/types";
import { markdownTable } from "@platform/util";

export async function protocolPage(steps: readonly ProtocolStep[]): Promise<string> {
  return [
    ...PROTOCOLS_FRONT,
    Text.Empty,
    PROTOCOLS_INTRO,
    Text.Empty,
    ...(await markdownTable(
      PROTOCOLS_COLUMNS,
      steps.map((step) => [
        step.id,
        step.passed ? PROTOCOL_PASSED : PROTOCOL_FAILED,
        step.version,
        step.title,
        step.checked,
      ]),
    )),
  ].join(Text.Newline);
}

export async function generateProtocolDocs(content: string, root: string): Promise<boolean> {
  const file = Bun.file(join(root, PROTOCOL_REPORT_DIR, PROTOCOL_REPORT_FILE));
  if (!(await file.exists())) {
    return false;
  }
  const steps = (await file.text())
    .split(Text.Newline)
    .filter((line) => line.length > 0)
    .map((line) => ProtocolStepSchema.parse(JSON.parse(line)));
  if (steps.length === 0) {
    return false;
  }
  await Bun.write(join(content, PROTOCOLS_PAGE), await protocolPage(steps));
  return true;
}
