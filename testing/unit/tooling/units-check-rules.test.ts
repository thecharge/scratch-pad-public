import { afterAll, expect } from "bun:test";
import { join } from "node:path";
import { HookJob, RepoPath } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { checkReadmes, packagesWithoutReadme } from "../../../tooling/scripts/check-readmes.ts";
import { checkRules, jobsIn, missingJobs } from "../../../tooling/scripts/check-rules.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

const lefthook = await Bun.file(join(REPO_ROOT, RepoPath.Lefthook)).text();
const withoutFullGate = lefthook.replace("bun run verify", "bun run incomplete");
const withoutStructure = withoutFullGate.replace(/- name: structure/g, "- name: renamed");
const withoutRules = withoutFullGate.replace(/- name: rules/g, "- name: renamed");

const documented = await makeDir();
await writeFiles(documented, { "packages/a/README.md": "# a", "packages/b/README.md": "# b" });
const partial = await makeDir();
await writeFiles(partial, { "packages/a/README.md": "# a", "packages/b/package.json": "{}" });
const none = await makeDir();
await writeFiles(none, { "packages/b/package.json": "{}" });
const hooked = await makeDir();
await writeFiles(hooked, { [RepoPath.Lefthook]: lefthook });
const unhooked = await makeDir();
await writeFiles(unhooked, { [RepoPath.Lefthook]: withoutStructure });
const bare = await makeDir();
afterAll(removeAll);

unit(packagesWithoutReadme, {
  positive: [
    positive("every package has a README", [join(documented, "packages")], []),
    positive("an empty packages folder has none", [join(await makeDir(), "")], []),
  ],
  negative: [
    rejected("a package without a README is named", [join(partial, "packages")], ["b"]),
    negative("a missing folder throws", [join(bare, "packages")], { code: "ENOENT" }),
  ],
});

unit(checkReadmes, {
  positive: [
    positive("every package documented exits with 0", [documented], 0),
    positive("a different documented set exits with 0", [await readmeRoot("c")], 0),
  ],
  negative: [
    rejected("a package without a README exits with 1", [partial], 1),
    rejected("packages all without README exit with 1", [none], 1),
    negative("a root without packages throws", [bare], { code: "ENOENT" }),
  ],
});

async function setOf(items: string[]): Promise<Set<string>> {
  return new Set(items);
}

unit(jobsIn, {
  positive: [
    positive(
      "job names are listed",
      ["jobs:\n  - name: a\n  - name: b\n"],
      await setOf(["a", "b"]),
    ),
    positive(
      "the real file lists the structure job",
      [lefthook],
      seen((jobs: Set<string>) => jobs.has(HookJob.Structure), true),
    ),
  ],
  negative: [
    rejected("text without jobs has none", ["nothing here"], await setOf([])),
    rejected("an empty file has none", [""], await setOf([])),
  ],
});

unit(missingJobs, {
  positive: [
    positive("every rule is backed by a job", [lefthook], []),
    positive("the full push gate covers checks moved out of commit", [lefthook], []),
    positive(
      "an extra job changes nothing",
      [`${lefthook}\n    - name: extra\n      run: echo extra\n`],
      [],
    ),
  ],
  negative: [
    rejected(
      "a skipped full gate cannot cover missing checks",
      [lefthook.replace("- name: verify", "- name: verify\n      skip: true")],
      expect.arrayContaining([expect.stringContaining(HookJob.Docs)]),
    ),
    rejected(
      "a changed push command does not cover the documentation gate",
      [withoutFullGate],
      expect.arrayContaining([expect.stringContaining(HookJob.Docs)]),
    ),
    rejected(
      "a renamed push gate does not cover the knowledge base gate",
      [lefthook.replace("- name: verify", "- name: incomplete")],
      expect.arrayContaining([expect.stringContaining(HookJob.Kb)]),
    ),
    rejected(
      "a renamed structure job is reported",
      [withoutStructure],
      expect.arrayContaining([expect.stringContaining(HookJob.Structure)]),
    ),
    rejected(
      "a renamed rules job is reported",
      [withoutRules],
      expect.arrayContaining([expect.stringContaining(HookJob.Rules)]),
    ),
  ],
});

unit(checkRules, {
  positive: [
    positive("a repository with every job exits with 0", [hooked], 0),
    positive("the real repository exits with 0", [REPO_ROOT], 0),
  ],
  negative: [
    rejected("a missing job exits with 1", [unhooked], 1),
    negative("a root without the hook file throws", [bare], { code: "ENOENT" }),
  ],
});

async function readmeRoot(name: string): Promise<string> {
  const root = await makeDir();
  await writeFiles(root, { [`packages/${name}/README.md`]: "# x" });
  return root;
}
