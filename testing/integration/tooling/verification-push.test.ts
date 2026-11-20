import { afterAll, expect, test } from "bun:test";
import { join } from "node:path";
import { gitRepo, makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { VerificationPushReason } from "../../../packages/constants/src/verification-push.ts";
import { VerificationPushSchema } from "../../../packages/types/src/verification-push.ts";
import { REPO_ROOT, run } from "../../../tooling/scripts/tools.ts";
import { inspectVerificationTree } from "../../../tooling/scripts/verification-inputs.ts";

afterAll(removeAll);

const helpers = await makeDir();
const receiver = await makeDir();
const hook = join(helpers, "record.ts");
const config = `pre-push:\n  jobs:\n    - name: record\n      run: bun ${hook}\n      use_stdin: true\n      env:\n        PUSH_FIXTURE: "1"\n`;
const root = await gitRepo(
  { "README.md": "initial", ".gitignore": ".stack/\n", "lefthook.yml": config },
  true,
  true,
);
const script = `import { recordPushUpdates } from ${JSON.stringify(join(REPO_ROOT, "tooling/scripts/verification-push.ts"))};\nif (Bun.env.PUSH_FIXTURE !== "1") throw new Error("hook environment missing");\nawait recordPushUpdates(await Bun.stdin.text(), ${JSON.stringify(root)});\n`;
await writeFiles(helpers, { "record.ts": script });

const git = async (...args: string[]) => {
  const result = await run(["git", ...args], { cwd: root });
  expect(result.exitCode).toBe(0);
  return result.stdout.trim();
};
const saved = async () =>
  VerificationPushSchema.parse(await Bun.file(join(root, ".stack/verify/push.json")).json());
const commit = async () =>
  git(
    "-c",
    "user.name=Integration",
    "-c",
    "user.email=integration@example.test",
    "commit",
    "-qm",
    "test: update fixture",
  );
await git("branch", "-M", "main");
await git("init", "--bare", "-q", receiver);
const installed = await run([join(REPO_ROOT, "node_modules/.bin/lefthook"), "install"], {
  cwd: root,
});
const base = await git("rev-parse", "HEAD");
await git("push", receiver, "refs/heads/main:refs/heads/main");
const creation = await saved();
await writeFiles(root, { "README.md": "updated" });
await git("add", "README.md");
await commit();
const head = await git("rev-parse", "HEAD");
await git("update-ref", "refs/remotes/origin/main", head);
await git("push", receiver, "refs/heads/main:refs/heads/main");
const update = await saved();
const tree = await inspectVerificationTree(update.range, root);
await git("branch", "side", base);
await writeFiles(root, { "README.md": "another update" });
await git("add", "README.md");
await commit();
await git("push", receiver, "refs/heads/main:refs/heads/main", "refs/heads/side:refs/heads/side");
const multiple = await saved();
await git("push", receiver, ":refs/heads/side");
const deletion = await saved();

test("Lefthook forwards Git stdin and the configured environment to one recorder", async () => {
  expect(installed.exitCode).toBe(0);
  expect(update.updates).toEqual([["refs/heads/main", head, "refs/heads/main", base]]);
  expect(update.reasons).toEqual([]);
});

test("the planner receives the real old and new commits despite a misleading tracking ref", async () => {
  expect(update.range).toEqual({ base, head });
  expect(tree.range).toEqual({ base, head });
  expect(tree.changed).toEqual(["README.md"]);
  expect(tree.dirty).toEqual([]);
  expect(tree.problems).toEqual([]);
});

test("a real new remote branch has no prior comparison baseline", async () => {
  expect(creation.range).toBeUndefined();
  expect(creation.reasons).toEqual([VerificationPushReason.Creation]);
});

test("a real push with two refs cannot certify just one of them", async () => {
  expect(multiple.updates).toHaveLength(2);
  expect(multiple.range).toBeUndefined();
  expect(multiple.reasons).toEqual([VerificationPushReason.Multiple]);
});

test("a real deletion is recorded without a working-tree range", async () => {
  expect(deletion.updates[0]?.[0]).toBe("(delete)");
  expect(deletion.range).toBeUndefined();
  expect(deletion.reasons).toEqual([VerificationPushReason.Deletion]);
});
