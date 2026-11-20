import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  CHECKS_RUNNER_COMMAND,
  MessageId,
  MILLISECONDS_PER_SECOND,
  VERIFY_COMMANDS,
  VERIFY_REPORT_DIR,
  VerifyStep,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { StepTiming } from "@platform/types";
import { all } from "@platform/util";
import {
  DOCUMENT_SHIPPING_BANNER,
  DOCUMENT_SHIPPING_BUDGET_SECONDS,
  DOCUMENT_SHIPPING_CONCURRENCY,
  DOCUMENT_SHIPPING_REPORT,
  DOCUMENT_SHIPPING_SOURCE_ONLY,
  DocumentPhase,
} from "../../packages/constants/src/document-shipping.ts";
import type { VerificationPush } from "../../packages/types/src/verification-push.ts";
import { inspectDocumentScope } from "./document-scope.ts";
import { launchShippingCommand } from "./fast-shipping.ts";
import { REPO_ROOT } from "./tools.ts";
import { measurePhase } from "./verification-timing.ts";

export async function documentCommands(
  commands: Readonly<Record<string, readonly string[]>>,
): Promise<Record<string, readonly string[]>> {
  const expected = Object.entries(VERIFY_COMMANDS).map(([step, command]) => [
    step,
    [...CHECKS_RUNNER_COMMAND, ...command],
  ]);
  if (JSON.stringify(Object.entries(commands)) !== JSON.stringify(expected))
    throw new Error(message(MessageId.DocumentRegistryInvalid));
  return Object.fromEntries(
    Object.entries(commands).filter(([step]) => !DOCUMENT_SHIPPING_SOURCE_ONLY.includes(step)),
  );
}

export async function documentShipping(
  push: VerificationPush,
  commands: Readonly<Record<string, readonly string[]>>,
  inspect = inspectDocumentScope,
  execute = launchShippingCommand,
  root = REPO_ROOT,
  budget = DOCUMENT_SHIPPING_BUDGET_SECONDS,
): Promise<number | undefined> {
  const started = performance.now();
  const before = await inspect(DocumentPhase.Push, push, root);
  if (!before.eligible) return undefined;
  console.log(DOCUMENT_SHIPPING_BANNER);
  const selected = await documentCommands(commands);
  const results: StepTiming[] = [];
  await all(
    Object.entries(selected)
      .filter(([step]) => step !== VerifyStep.Untracked)
      .map(
        ([step, command]) =>
          async () =>
            measurePhase(step, async () => execute(command), results, true),
      ),
    DOCUMENT_SHIPPING_CONCURRENCY,
  );
  await measurePhase(
    VerifyStep.Untracked,
    async () => execute(selected[VerifyStep.Untracked] as readonly string[]),
    results,
    true,
  );
  const after = await inspect(DocumentPhase.Push, push, root);
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  if (!unchanged) console.error(message(MessageId.DocumentSnapshotChanged));
  const seconds = (performance.now() - started) / MILLISECONDS_PER_SECOND;
  const ok =
    unchanged && after.eligible && results.every((result) => result.ok) && seconds <= budget;
  await mkdir(join(root, VERIFY_REPORT_DIR), { recursive: true });
  await Bun.write(
    join(root, VERIFY_REPORT_DIR, DOCUMENT_SHIPPING_REPORT),
    JSON.stringify(
      {
        before,
        after,
        selected,
        excluded: Object.keys(commands).filter((step) => !(step in selected)),
        results,
        seconds,
        ok,
      },
      null,
      2,
    ),
  );
  return ok ? 0 : 1;
}
