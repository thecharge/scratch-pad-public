import { MessageId } from "@platform/constants";
import { message } from "@platform/messages";
import { misplaced, testFiles, unitViolations } from "./test-tiers.ts";
import { finish, REPO_ROOT } from "./tools.ts";

export async function checkTiers(root: string = REPO_ROOT): Promise<number> {
  const files = await testFiles(root);
  const violations = await unitViolations(files, root);
  const stray = await misplaced(files);
  return finish(
    [
      ...violations.map(({ file, pattern }) => message(MessageId.TierViolation, { file, pattern })),
      ...stray.map((file) => message(MessageId.TierMisplaced, { file })),
    ],
    message(MessageId.TiersOk),
  );
}

if (import.meta.main) process.exit(await checkTiers());
