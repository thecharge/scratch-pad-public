import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { VERIFY_REPORT_DIR } from "@platform/constants";
import {
  VERIFICATION_BRANCH_REF,
  VERIFICATION_PUSH_FIELDS,
  VERIFICATION_PUSH_FILE,
  VERIFICATION_PUSH_LINES,
  VERIFICATION_ZERO_OID,
  VerificationPushReason,
} from "../../packages/constants/src/verification-push.ts";
import {
  type VerificationPush,
  VerificationPushUpdateSchema,
} from "../../packages/types/src/verification-push.ts";
import { REPO_ROOT } from "./tools.ts";

export async function parsePushUpdates(input: string): Promise<VerificationPush> {
  const parsed = VerificationPushUpdateSchema.array().safeParse(
    input
      .split(VERIFICATION_PUSH_LINES)
      .filter(Boolean)
      .map((line) => line.split(VERIFICATION_PUSH_FIELDS)),
  );
  if (!parsed.success) return { updates: [], reasons: [VerificationPushReason.Invalid] };
  const updates = parsed.data;
  if (updates.length !== 1)
    return {
      updates,
      reasons: [
        updates.length === 0 ? VerificationPushReason.Missing : VerificationPushReason.Multiple,
      ],
    };
  const [localRef, head, remoteRef, base] = VerificationPushUpdateSchema.parse(updates[0]);
  if (VERIFICATION_ZERO_OID.test(head))
    return { updates, reasons: [VerificationPushReason.Deletion] };
  if (VERIFICATION_ZERO_OID.test(base))
    return { updates, reasons: [VerificationPushReason.Creation] };
  if (!VERIFICATION_BRANCH_REF.test(localRef) || !VERIFICATION_BRANCH_REF.test(remoteRef)) {
    return { updates, reasons: [VerificationPushReason.NonBranch] };
  }
  if (head.length !== base.length) return { updates, reasons: [VerificationPushReason.Invalid] };
  return { updates, range: { base, head }, reasons: [] };
}

export async function recordPushUpdates(
  input: string,
  root = REPO_ROOT,
): Promise<VerificationPush> {
  const push = await parsePushUpdates(input);
  await mkdir(join(root, VERIFY_REPORT_DIR), { recursive: true });
  await Bun.write(
    join(root, VERIFY_REPORT_DIR, VERIFICATION_PUSH_FILE),
    JSON.stringify(push, null, 2),
  );
  return push;
}
