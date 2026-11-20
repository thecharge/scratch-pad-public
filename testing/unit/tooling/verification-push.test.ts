import { afterAll, expect, test } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { VerificationPushReason } from "../../../packages/constants/src/verification-push.ts";
import {
  type VerificationPush,
  VerificationPushSchema,
} from "../../../packages/types/src/verification-push.ts";
import { parsePushUpdates, recordPushUpdates } from "../../../tooling/scripts/verification-push.ts";

afterAll(removeAll);

const base = "a".repeat(40);
const head = "b".repeat(40);
const zero = "0".repeat(40);
const update = `refs/heads/main ${head} refs/heads/main ${base}\n`;
const wide = `refs/heads/topic ${"c".repeat(64)} refs/heads/topic ${"d".repeat(64)}\n`;
const rangeOf = async (push: VerificationPush) => push.range;
const reasonsOf = async (push: VerificationPush) => push.reasons;

unit(parsePushUpdates, {
  positive: [
    positive(
      "uses the remote old object and the proposed new object",
      [update],
      seen(rangeOf, { base, head }),
    ),
    positive(
      "accepts SHA-256 repository object IDs",
      [wide],
      seen(rangeOf, { base: "d".repeat(64), head: "c".repeat(64) }),
    ),
  ],
  negative: [
    rejected(
      "missing hook input cannot supply a range",
      [""],
      seen(reasonsOf, [VerificationPushReason.Missing]),
    ),
    rejected(
      "malformed hook input cannot supply a range",
      ["refs/heads/main nope refs/heads/main nope"],
      seen(reasonsOf, [VerificationPushReason.Invalid]),
    ),
    rejected(
      "multiple updates cannot be collapsed into one range",
      [update + wide],
      seen(reasonsOf, [VerificationPushReason.Multiple]),
    ),
    rejected(
      "new remote branches have no reusable baseline",
      [`refs/heads/main ${head} refs/heads/main ${zero}`],
      seen(reasonsOf, [VerificationPushReason.Creation]),
    ),
    rejected(
      "a deletion does not certify working-tree bytes",
      [`(delete) ${zero} refs/heads/main ${base}`],
      seen(reasonsOf, [VerificationPushReason.Deletion]),
    ),
    rejected(
      "tag updates require conservative verification",
      [`refs/tags/v1 ${head} refs/tags/v1 ${base}`],
      seen(reasonsOf, [VerificationPushReason.NonBranch]),
    ),
    rejected(
      "mixed object formats cannot supply a range",
      [`refs/heads/main ${head} refs/heads/main ${"d".repeat(64)}`],
      seen(reasonsOf, [VerificationPushReason.Invalid]),
    ),
    rejected(
      "extra fields are not silently ignored",
      [`${update.trim()} extra`],
      seen(reasonsOf, [VerificationPushReason.Invalid]),
    ),
  ],
});

const root = await makeDir();
const other = await makeDir();
const blocked = await makeDir();
await writeFiles(blocked, { ".stack": "blocked" });
const directory = await makeDir();
await mkdir(join(directory, ".stack/verify/push.json"), { recursive: true });

unit(recordPushUpdates, {
  positive: [
    positive(
      "records the complete offered branch update",
      [update, root],
      seen(rangeOf, { base, head }),
    ),
    positive(
      "records fallback reasons for unsupported updates",
      [update + wide, other],
      seen(reasonsOf, [VerificationPushReason.Multiple]),
    ),
  ],
  negative: [
    negative("a blocked report folder fails visibly", [update, blocked], { code: "ENOTDIR" }),
    negative("a report destination that is a directory fails visibly", [update, directory], {
      code: "EISDIR",
    }),
  ],
});

test("the saved update record round trips through its schema", async () => {
  expect(
    VerificationPushSchema.parse(await Bun.file(join(root, ".stack/verify/push.json")).json()),
  ).toEqual(await parsePushUpdates(update));
});

test.each([update + wide, "", "malformed", `refs/heads/main ${head} refs/heads/main ${zero}`])(
  "unsupported input retains no reusable range: %s",
  async (input) => {
    expect((await parsePushUpdates(input)).range).toBeUndefined();
  },
);
