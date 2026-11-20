import { join } from "node:path";
import {
  CHECKS_RUNNER_COMMAND,
  MessageId,
  Separator,
  StdioMode,
  Text,
  VERIFICATION_PLAN_FILE,
  VERIFY_COMMANDS,
  VERIFY_REPORT_DIR,
  VERIFY_STEPS_FILE,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { StepTiming } from "@platform/types";
import { FAST_SHIP_ENV } from "../../packages/constants/src/fast-shipping.ts";
import { VERIFICATION_PUSH_ENV } from "../../packages/constants/src/verification-push.ts";
import type { VerificationPush } from "../../packages/types/src/verification-push.ts";
import { documentShipping } from "./document-shipping.ts";
import { fastShipping } from "./fast-shipping.ts";
import { REPO_ROOT } from "./tools.ts";
import { recordPushUpdates } from "./verification-push.ts";
import { reportVerificationPlan } from "./verification-report.ts";

const MILLISECONDS = 1000;
const DECIMALS = 1;

export async function verificationCommands(
  commands: Readonly<Record<string, readonly string[]>>,
): Promise<Record<string, readonly string[]>> {
  return Object.fromEntries(
    Object.entries(commands).map(([step, command]) => [
      step,
      [...CHECKS_RUNNER_COMMAND, ...command],
    ]),
  );
}

async function runStep(step: string, command: readonly string[]): Promise<StepTiming> {
  console.log(Text.Newline + message(MessageId.StepBanner, { step }));
  const started = performance.now();
  const proc = Bun.spawn([...command], {
    cwd: REPO_ROOT,
    stdout: StdioMode.Inherit,
    stderr: StdioMode.Inherit,
  });
  const ok = (await proc.exited) === 0;
  return { step, ok, seconds: (performance.now() - started) / MILLISECONDS };
}

export async function runSteps(
  commands: Readonly<Record<string, readonly string[]>>,
): Promise<number> {
  const entries = Object.entries(commands);
  const results = await entries.reduce<Promise<StepTiming[]>>(
    async (previous, [step, command]) => [...(await previous), await runStep(step, command)],
    Promise.resolve([]),
  );
  await Bun.write(
    join(REPO_ROOT, VERIFY_REPORT_DIR, VERIFY_STEPS_FILE),
    JSON.stringify(results, null, 2),
  );
  const failed = results.filter((result) => !result.ok).map((result) => result.step);
  console.log(Text.Newline + message(MessageId.SummaryBanner));
  for (const result of [...results].sort((a, b) => b.seconds - a.seconds)) {
    console.log(
      message(MessageId.StepTimed, {
        seconds: result.seconds.toFixed(DECIMALS),
        step: result.step,
      }),
    );
  }
  if (failed.length > 0) {
    console.error(message(MessageId.ChecksFailed, { steps: failed.join(Separator.ListSpaced) }));
    return 1;
  }
  console.log(message(MessageId.ChecksPassed, { count: entries.length }));
  return 0;
}

export async function verify(
  source: Readonly<Record<string, readonly string[]>> = VERIFY_COMMANDS,
  report = reportVerificationPlan,
  execute = runSteps,
  push?: VerificationPush,
): Promise<number> {
  const commands = await verificationCommands(source);
  let recorded = false;
  try {
    await report(push?.range, REPO_ROOT, undefined, commands);
    recorded = true;
    console.log(
      message(MessageId.VerificationPlanReport, {
        count: Object.keys(commands).length,
        file: join(VERIFY_REPORT_DIR, VERIFICATION_PLAN_FILE),
      }),
    );
  } catch (error) {
    console.error(error);
  }
  const status = await execute(commands);
  return status === 0 && !recorded ? 1 : status;
}

export async function verificationEntry(
  environment: Record<string, string | undefined> = Bun.env,
  input?: string,
  full = verify,
  fast = fastShipping,
  record = recordPushUpdates,
  documents = documentShipping,
): Promise<number> {
  const push =
    environment[VERIFICATION_PUSH_ENV] === undefined
      ? undefined
      : await record(input ?? (await Bun.stdin.text()));
  const reduced =
    push === undefined
      ? undefined
      : await documents(push, await verificationCommands(VERIFY_COMMANDS));
  if (reduced !== undefined) return reduced;
  return environment[FAST_SHIP_ENV] === undefined
    ? full(undefined, undefined, undefined, push)
    : fast(await verificationCommands(VERIFY_COMMANDS));
}

if (import.meta.main) process.exit(await verificationEntry());
