import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  VERIFICATION_PLAN_FILE,
  VERIFICATION_ROOT_FLAG,
  VERIFY_COMMANDS,
  VERIFY_REPORT_DIR,
} from "@platform/constants";
import type { VerificationPlan, VerificationRange } from "@platform/types";
import { VerificationRangeSchema, VerificationReportArgumentsSchema } from "@platform/types";
import { REPO_ROOT, run } from "./tools.ts";
import { inspectVerificationTree } from "./verification-inputs.ts";
import { verificationPlan } from "./verification-plan.ts";

export async function reportVerificationPlan(
  range?: VerificationRange,
  root = REPO_ROOT,
  execute = run,
  commands: Readonly<Record<string, readonly string[]>> = VERIFY_COMMANDS,
): Promise<VerificationPlan> {
  const tree = await inspectVerificationTree(range, root, execute);
  const identity = [Bun.version, process.version, process.platform, process.arch];
  const plan = await verificationPlan(tree, commands, identity);
  await mkdir(join(root, VERIFY_REPORT_DIR), { recursive: true });
  await Bun.write(
    join(root, VERIFY_REPORT_DIR, VERIFICATION_PLAN_FILE),
    JSON.stringify(plan, null, 2),
  );
  return plan;
}

export async function explainVerification(
  arguments_: readonly string[] = [],
  root = REPO_ROOT,
  execute = run,
  print = console.log,
): Promise<number> {
  const supplied = VerificationReportArgumentsSchema.parse(arguments_);
  const selectedRoot = supplied[0] === VERIFICATION_ROOT_FLAG ? (supplied[1] as string) : root;
  const args = supplied[0] === VERIFICATION_ROOT_FLAG ? supplied.slice(2) : supplied;
  const range =
    args.length === 0
      ? undefined
      : VerificationRangeSchema.parse({
          base: args[0],
          head: args[1],
        });
  await print(JSON.stringify(await reportVerificationPlan(range, selectedRoot, execute), null, 2));
  return 0;
}

if (import.meta.main) process.exit(await explainVerification(process.argv.slice(2)));
