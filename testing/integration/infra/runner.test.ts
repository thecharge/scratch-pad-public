import { afterAll, expect, test } from "bun:test";
import { stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CHECKS_CONTAINERFILE } from "@platform/constants";
import { gitRepo, removeAll, writeFiles } from "@platform/test-scenarios";
import { runChecks, runInContainer } from "../../../apps/infra/src/runner.ts";
import { REPO_ROOT, run } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

const proof = ".stack/checks-owner-proof.txt";
const write = `await Bun.write(${JSON.stringify(proof)}, "container output\\n")`;

test.each([
  { name: "the pinned Bun runtime starts", command: ["bun", "--version"], code: 0 },
  { name: "the Node runtime starts", command: ["node", "--version"], code: 0 },
  { name: "a failing command stays blocking", command: ["sh", "-c", "exit 23"], code: 23 },
  {
    name: "a missing executable stays blocking",
    command: ["platform-missing-executable"],
    code: 127,
  },
])("container checks: $name", async ({ command, code }) => {
  expect(await runInContainer(command)).toBe(code);
});

test.each([proof])("container output %s belongs to the calling user", async (file) => {
  expect(await runInContainer(["bun", "-e", write])).toBe(0);
  const written = join(REPO_ROOT, file);
  const owner = await stat(written);
  expect(process.getuid?.()).toBe(owner.uid);
  expect(process.getgid?.()).toBe(owner.gid);
  expect(await Bun.file(written).text()).toBe("container output\n");
});

test.each(["hook input\nsecond line\n", ""])(
  "the container receives stdin unchanged: %j",
  async (stdin) => {
    const result = await run(
      [
        "bun",
        "run",
        "apps/infra/src/runner.ts",
        "bun",
        "-e",
        "process.stdout.write(await Bun.stdin.text())",
      ],
      { stdin },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(stdin);
  },
);

const root = await gitRepo({ "original.txt": "original" }, true, true);
await writeFiles(root, {
  "candidate.txt": "candidate",
  [CHECKS_CONTAINERFILE]: await Bun.file(join(REPO_ROOT, CHECKS_CONTAINERFILE)).text(),
});
const index = join(root, ".git", "candidate-index");
const env = { GIT_INDEX_FILE: index };
const execute = async (command: readonly string[]) => run(command, { env });
const prepared = await run(["git", "read-tree", "HEAD"], { cwd: root, env });
const staged = await run(["git", "add", "candidate.txt"], { cwd: root, env });
const observed: string[] = [];
const capture = async (command: readonly string[]) => {
  const result = await execute(command);
  observed.push(result.stdout);
  return result;
};

test("the container reads Git's alternate index without changing the normal index", async () => {
  expect(prepared.exitCode).toBe(0);
  expect(staged.exitCode).toBe(0);
  expect(await runInContainer(["git", "diff", "--cached", "--name-only"], root, capture)).toBe(0);
  expect(observed.at(-1)).toBe("candidate.txt\n");
  const normal = await run(["git", "diff", "--cached", "--name-only"], { cwd: root });
  expect(normal.exitCode).toBe(0);
  expect(normal.stdout).toBe("");
});

test.each([
  { name: "successful nested execution", command: ["bun", "--version"], code: 0 },
  { name: "nested failure propagation", command: ["sh", "-c", "exit 23"], code: 23 },
])("the controller preserves $name without another container", async ({ command, code }) => {
  expect(await runChecks(command, REPO_ROOT, { PLATFORM_CHECKS_CONTAINER: "true" })).toBe(code);
});

const runtime =
  Bun.env.XDG_RUNTIME_DIR ??
  dirname(dirname((Bun.env.CONTAINER_HOST ?? "").replace("unix://", "")));

test.each([
  { name: "successful stack execution", command: ["bun", "--version"], code: 0 },
  { name: "stack failure propagation", command: ["sh", "-c", "exit 23"], code: 23 },
])("the controller preserves $name with isolated temporary mounts", async ({ command, code }) => {
  expect(await runChecks(["--stack", ...command], REPO_ROOT, { XDG_RUNTIME_DIR: runtime })).toBe(
    code,
  );
});
