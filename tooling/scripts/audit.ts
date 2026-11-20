import {
  AUDIT_ATTEMPTS,
  AUDIT_COMMAND,
  AUDIT_CONNECTION_FAILURE,
  AUDIT_RETRY_DELAY_MS,
  AUDIT_TIMEOUT_EXIT,
  MessageId,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { run } from "./tools.ts";

export async function runAudit(
  execute: typeof run = run,
  pause: typeof Bun.sleep = Bun.sleep,
): Promise<number> {
  let attempt = 0;
  while (attempt < AUDIT_ATTEMPTS) {
    const result = await execute(AUDIT_COMMAND);
    console.log(result.stdout);
    console.error(result.stderr);
    const retryable =
      result.stdout.trim() === Text.Empty &&
      (result.exitCode === AUDIT_TIMEOUT_EXIT ||
        (result.exitCode === 1 && result.stderr.includes(AUDIT_CONNECTION_FAILURE)));
    if (result.exitCode === 0 || !retryable) {
      return result.exitCode;
    }
    attempt += 1;
    if (attempt < AUDIT_ATTEMPTS) {
      console.error(message(MessageId.AuditRetry, { attempt, limit: AUDIT_ATTEMPTS }));
      await pause(AUDIT_RETRY_DELAY_MS * attempt);
    }
  }
  return 1;
}

if (import.meta.main) process.exit(await runAudit());
