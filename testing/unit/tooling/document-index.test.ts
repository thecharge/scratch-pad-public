import { afterAll } from "bun:test";
import { createHash } from "node:crypto";
import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { documentIndexMatches } from "../../../tooling/scripts/document-index.ts";

afterAll(removeAll);
const root = await makeDir();
await writeFiles(root, { "guide.md": "guide", "guide.sh": "guide" });
await chmod(join(root, "guide.sh"), 0o755);
const sha1 = createHash("sha1").update("blob 5\0guide").digest("hex");
const sha256 = createHash("sha256").update("blob 5\0guide").digest("hex");
const normal = async () => ({ exitCode: 0, stdout: `100644 ${sha1} 0\tguide.md\0`, stderr: "" });
const alternate = async () => ({
  exitCode: 0,
  stdout: `100644 ${sha256} 0\tguide.md\0`,
  stderr: "",
});
const executable = async () => ({
  exitCode: 0,
  stdout: `100755 ${sha1} 0\tguide.sh\0`,
  stderr: "",
});
const wrongMode = async () => ({ exitCode: 0, stdout: `100644 ${sha1} 0\tguide.sh\0`, stderr: "" });
const wrong = async () => ({
  exitCode: 0,
  stdout: `100644 ${"a".repeat(40)} 0\tguide.md\0`,
  stderr: "",
});
const conflict = async () => ({ exitCode: 0, stdout: `100644 ${sha1} 1\tguide.md\0`, stderr: "" });
const absent = async () => ({ exitCode: 0, stdout: `100644 ${sha1} 0\tabsent.md\0`, stderr: "" });
const escaping = async () => ({
  exitCode: 0,
  stdout: `100644 ${sha1} 0\t../guide.md\0`,
  stderr: "",
});
const failure = async () => ({ exitCode: 1, stdout: "", stderr: "git failed" });
unit(documentIndexMatches, {
  positive: [
    positive("SHA-1 blobs match actual bytes", [root, normal], true),
    positive("SHA-256 blobs match actual bytes", [root, alternate], true),
    positive("an executable matches the executable mode in the index", [root, executable], true),
  ],
  negative: [
    rejected("escaping parent cannot certify repository bytes", [root, escaping], false),
    rejected("changed bytes fail regardless of cached Git stats", [root, wrong], false),
    rejected("a mode change fails even when the bytes match", [root, wrongMode], false),
    rejected("unmerged index fails", [root, conflict], false),
    rejected("missing file fails", [root, absent], false),
    rejected("failed Git inspection fails", [root, failure], false),
  ],
});
