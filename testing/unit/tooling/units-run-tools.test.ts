import { afterAll } from "bun:test";
import { chmod, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { SdkLeak } from "@platform/types";
import { buildSkills } from "../../../tooling/scripts/build-skills.ts";
import { packedFiles, sdkLeaks } from "../../../tooling/scripts/check-sdk-pack.ts";
import { compare } from "../../../tooling/scripts/openapi-check.ts";
import { scanPages } from "../../../tooling/scripts/record-kb.ts";
import { scanText } from "../../../tooling/scripts/secret-scan.ts";
import { runSteps } from "../../../tooling/scripts/verify.ts";

afterAll(removeAll);

const PASSING = ["true"];
const FAILING = ["false"];
const MISSING = ["definitely-not-a-command-on-this-machine"];

unit(runSteps, {
  positive: [
    positive("steps that pass give exit code 0", [{ first: PASSING, second: PASSING }], 0),
    positive("no steps give exit code 0", [{}], 0),
  ],
  negative: [
    rejected("a failing step gives exit code 1", [{ first: PASSING, second: FAILING }], 1),
    rejected("every step still runs after a failure", [{ first: FAILING, second: FAILING }], 1),
    negative("a command that does not exist throws", [{ only: MISSING }], { code: "ENOENT" }),
  ],
});

const random = (alphabet: string, length: number) =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(length)),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
const FAKE_CREDENTIAL = [
  `aws_access_key_id = AKIA${random("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", 16)}`,
  `aws_secret_access_key = ${random("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 40)}`,
  "",
].join("\n");
const CLEAN_TEXT = "nothing sensitive here\n";
const scripts = await makeDir();
await writeFiles(scripts, {
  "pass.sh": "#!/bin/sh\nexit 0\n",
  "fail.sh": "#!/bin/sh\nexit 1\n",
});
await chmod(join(scripts, "pass.sh"), 0o755);
await chmod(join(scripts, "fail.sh"), 0o755);
const PASS_SCANNER = join(scripts, "pass.sh");
const FAIL_SCANNER = join(scripts, "fail.sh");

unit(scanText, {
  positive: [
    positive("clean text passes the real scanner", [CLEAN_TEXT], 0),
    positive("a scanner that finds nothing gives 0", [FAKE_CREDENTIAL, PASS_SCANNER], 0),
  ],
  negative: [
    rejected("a credential fails the real scanner", [FAKE_CREDENTIAL], 1),
    rejected("a scanner that finds something gives 1", [CLEAN_TEXT, FAIL_SCANNER], 1),
    negative("a scanner that does not exist throws", [CLEAN_TEXT, join(scripts, "absent.sh")], {
      code: "ENOENT",
    }),
  ],
});

const pages = await makeDir();
await writeFiles(pages, {
  "clean.md": CLEAN_TEXT,
  "other.md": "also clean\n",
  "leak.md": FAKE_CREDENTIAL,
});

unit(scanPages, {
  positive: [
    positive("clean pages pass", [[join(pages, "clean.md"), join(pages, "other.md")]], 0),
    positive("no pages pass", [[]], 0),
  ],
  negative: [
    rejected(
      "one page with a credential fails the scan",
      [[join(pages, "clean.md"), join(pages, "leak.md")]],
      1,
    ),
    negative("a page that is not there throws", [[join(pages, "absent.md")]], { code: "ENOENT" }),
  ],
});

const leakedSpecifiers = (found: SdkLeak[]) => found.map((leak) => leak.specifier);
const leakedFiles = (found: SdkLeak[]) => found.map((leak) => leak.file);
const MANIFEST_OK = JSON.stringify({
  name: "sdk",
  version: "1.0.0",
  dependencies: { zod: "^4.0.0" },
});
const MANIFEST_LEAK = JSON.stringify({
  name: "sdk",
  version: "1.0.0",
  dependencies: { "@platform/types": "workspace:*" },
});
const IMPORT_OK = 'import { z } from "zod";\n';
const IMPORT_LEAK = 'import { a } from "@platform/types";\n';
const SOURCE_LEAK = 'export { b } from "../src/index.ts";\n';

unit(sdkLeaks, {
  positive: [
    positive(
      "a clean manifest and import leak nothing",
      [{ "package.json": MANIFEST_OK, "index.js": IMPORT_OK }],
      [],
    ),
    positive(
      "a workspace dependency is a leak",
      [{ "package.json": MANIFEST_LEAK }],
      seen(leakedSpecifiers, ["@platform/types"]),
    ),
  ],
  negative: [
    rejected(
      "an import of a workspace package is a leak",
      [{ "index.js": IMPORT_LEAK }],
      seen(leakedSpecifiers, ["@platform/types"]),
    ),
    rejected(
      "an import of a source file is a leak",
      [{ "index.mjs": SOURCE_LEAK }],
      seen(leakedFiles, ["index.mjs"]),
    ),
    rejected("a file that is not code is not scanned", [{ "README.md": IMPORT_LEAK }], []),
  ],
});

const packed = await makeDir();
await writeFiles(packed, { "a.txt": "A", "nested/b.txt": "B" });
const emptyPacked = await makeDir();
const foldersOnly = await makeDir();
await mkdir(join(foldersOnly, "inner"));

unit(packedFiles, {
  positive: [
    positive("files are read by their relative path", [packed], {
      "a.txt": "A",
      "nested/b.txt": "B",
    }),
    positive("an empty folder has no files", [emptyPacked], {}),
  ],
  negative: [
    rejected("a folder of folders only has no files", [foldersOnly], {}),
    negative("a folder that does not exist throws", [join(packed, "absent")], { code: "ENOENT" }),
  ],
});

const DOCUMENT = (paths: string) =>
  `{"openapi":"3.1.0","info":{"title":"t","version":"1"},"paths":${paths}}`;
const WITH_GET = '{"/v1/a":{"get":{"operationId":"a","responses":{"200":{"description":"ok"}}}}}';
const WITH_TWO =
  '{"/v1/a":{"get":{"operationId":"a","responses":{"200":{"description":"ok"}}}},"/v1/b":{"get":{"operationId":"b","responses":{"200":{"description":"ok"}}}}}';

unit(compare, {
  positive: [
    positive("a document is compatible with itself", [DOCUMENT(WITH_GET), DOCUMENT(WITH_GET)], 0),
    positive("a new endpoint is compatible", [DOCUMENT(WITH_GET), DOCUMENT(WITH_TWO)], 0),
  ],
  negative: [
    rejected(
      "a removed endpoint breaks compatibility",
      [DOCUMENT(WITH_TWO), DOCUMENT(WITH_GET)],
      1,
    ),
    rejected(
      "removing every endpoint breaks compatibility",
      [DOCUMENT(WITH_GET), DOCUMENT("{}")],
      1,
    ),
  ],
});

const outputs = await makeDir();
const blocked = await makeDir();
await writeFiles(blocked, { blocker: "a file, not a folder" });
const listing = (directory: string) => async (count: number) =>
  (await readdir(directory, { recursive: true })).length >= count;

unit(buildSkills, {
  positive: [
    positive(
      "the number of written files is returned",
      [outputs],
      seen(async (count: number) => count > 0, true),
    ),
    positive(
      "the skill files exist on disk",
      [join(outputs, "again")],
      seen(async (count: number) => await listing(join(outputs, "again"))(count), true),
    ),
  ],
  negative: [
    negative("an output under a file cannot be written", [join(blocked, "blocker", "out")], {
      code: "ENOTDIR",
    }),
    negative("an output folder that cannot be created throws", [join(blocked, "blocker")], {
      code: "ENOTDIR",
    }),
  ],
});
