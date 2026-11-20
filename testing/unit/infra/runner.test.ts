import { afterAll, expect, mock } from "bun:test";
import { CHECKS_CONTAINERFILE } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { runChecks, runInContainer, runnerCommand } from "../../../apps/infra/src/runner.ts";

afterAll(removeAll);

const command = ["bun", "test", "a file.test.ts"];
const expected = [
  "podman",
  "run",
  "--rm",
  "--userns=keep-id",
  "--cap-drop=all",
  "-i",
  "--env",
  "GIT_INDEX_FILE",
  "--env",
  "GIT_DIR",
  "--env",
  "GIT_WORK_TREE",
  "--env",
  "GIT_COMMON_DIR",
  "--env",
  "DPRINT_CACHE_DIR=/repo/.stack/check-cache/dprint",
  "--env",
  "DPRINT_MAX_THREADS=16",
  "--workdir",
  "/repo",
  "--volume",
  "/repo:/repo",
  "image",
  ...command,
];
const other = [
  "podman",
  "run",
  "--rm",
  "--userns=keep-id",
  "--cap-drop=all",
  "-i",
  "--env",
  "GIT_INDEX_FILE",
  "--env",
  "GIT_DIR",
  "--env",
  "GIT_WORK_TREE",
  "--env",
  "GIT_COMMON_DIR",
  "--env",
  "DPRINT_CACHE_DIR=/repo with spaces/.stack/check-cache/dprint",
  "--env",
  "DPRINT_MAX_THREADS=16",
  "--workdir",
  "/repo with spaces",
  "--volume",
  "/repo with spaces:/repo with spaces",
  "image",
  "true",
];

unit(runnerCommand, {
  positive: [
    positive("arguments are passed without shell parsing", [command, "/repo", "image"], expected),
    positive(
      "the repository keeps its absolute path and spaces",
      [["true"], "/repo with spaces", "image"],
      other,
    ),
  ],
  negative: [
    negative("relative mounts are refused", [command, "relative", "image"], {
      message: expect.stringContaining("absolute"),
    }),
    negative("an empty command is refused", [[], "/repo", "image"], {
      message: expect.stringContaining("command"),
    }),
    negative("ambiguous volume paths are refused", [command, "/repo:other", "image"], {
      message: expect.stringContaining("colon"),
    }),
  ],
});

const root = await makeDir();
await writeFiles(root, { [CHECKS_CONTAINERFILE]: "pinned fixture" });
const ok = { exitCode: 0, stdout: "runner output", stderr: "" };
const absent = { exitCode: 1, stdout: "", stderr: "" };
const buildFailure = { exitCode: 7, stdout: "", stderr: "build failed" };
const launchFailure = { exitCode: 9, stdout: "", stderr: "check failed" };
const inspectFailure = { exitCode: 125, stdout: "", stderr: "Podman unavailable" };
const present = mock(async () => ok);
const builds = mock(async () => ok).mockResolvedValueOnce(absent);
const brokenBuild = mock(async () => ok)
  .mockResolvedValueOnce(absent)
  .mockResolvedValueOnce(buildFailure);
const brokenLaunch = mock(async () => ok)
  .mockResolvedValueOnce(ok)
  .mockResolvedValueOnce(launchFailure);
const brokenInspect = mock(async () => inspectFailure);

unit(runInContainer, {
  positive: [
    positive(
      "a matching image runs without a rebuild",
      [command, root, present],
      seen(async (code: number) => ({ code, calls: present.mock.calls.length }), {
        code: 0,
        calls: 2,
      }),
    ),
    positive(
      "a missing image is built before execution",
      [command, root, builds],
      seen(async (code: number) => ({ code, calls: builds.mock.calls.length }), {
        code: 0,
        calls: 3,
      }),
    ),
  ],
  negative: [
    rejected(
      "a failed build prevents execution",
      [command, root, brokenBuild],
      seen(async (code: number) => ({ code, calls: brokenBuild.mock.calls.length }), {
        code: 7,
        calls: 2,
      }),
    ),
    rejected("the check exit code stays blocking", [command, root, brokenLaunch], 9),
    rejected(
      "an inspection error does not trigger a build",
      [command, root, brokenInspect],
      seen(async (code: number) => ({ code, calls: brokenInspect.mock.calls.length }), {
        code: 125,
        calls: 1,
      }),
    ),
  ],
});

const launched = mock(async () => 0);
const direct = mock(async () => ok);
const prepared = mock(async () => "/tmp/checks-fixture");
const cleaned = mock(async () => undefined);
const failedLaunch = mock(async () => 23);
const failedDirect = mock(async () => launchFailure);
const failedCleanup = mock(async (): Promise<never> => {
  throw new Error("temporary cleanup refused");
});
const failedPrepare = mock(async (): Promise<never> => {
  throw new Error("temporary folder refused");
});
const cleanupOptions = { recursive: true, force: true };
const stackEnvironment = { XDG_RUNTIME_DIR: "/run/user/1000" };
const inside = { PLATFORM_CHECKS_CONTAINER: "true" };
const flags = [
  "--volume",
  "/tmp/checks-fixture:/tmp/checks-fixture",
  "--volume",
  "/run/user/1000/podman/podman.sock:/run/user/1000/podman/podman.sock:ro",
  "--env",
  "CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock",
  "--env",
  "PLATFORM_CHECKS_CONTAINER=true",
  "--env",
  "TMPDIR=/tmp/checks-fixture",
  "--env",
  "PLATFORM_FAST_SHIP",
  "--env",
  "PLATFORM_VERIFY_PUSH",
];

unit(runChecks, {
  positive: [
    positive(
      "local checks keep the ordinary socket-free launcher",
      [command, "/repo", {}, launched, direct, prepared, cleaned],
      seen(async (code: number) => ({ code, call: launched.mock.calls.at(-1) }), {
        code: 0,
        call: [command, "/repo"],
      }),
    ),
    positive(
      "nested checks still execute inside the current runner",
      [["--stack", ...command], "/repo", inside, launched, direct, prepared, cleaned],
      seen(async (code: number) => ({ code, call: direct.mock.calls.at(-1) }), {
        code: 0,
        call: [command],
      }),
    ),
    positive(
      "stack orchestration shares the engine and temporary paths without account mounts",
      [["--stack", ...command], "/repo", stackEnvironment, launched, direct, prepared, cleaned],
      seen(async (code: number) => ({ code, call: launched.mock.calls.at(-1) }), {
        code: 0,
        call: [command, "/repo", undefined, flags],
      }),
    ),
  ],
  negative: [
    rejected(
      "stack failures still clean up the allocated temporary mount",
      [["--stack", ...command], "/repo", stackEnvironment, failedLaunch, direct, prepared, cleaned],
      seen(async (code: number) => ({ code, cleanup: cleaned.mock.calls.at(-1) }), {
        code: 23,
        cleanup: ["/tmp/checks-fixture", cleanupOptions],
      }),
    ),
    negative(
      "a failed temporary cleanup remains blocking",
      [
        ["--stack", ...command],
        "/repo",
        stackEnvironment,
        launched,
        direct,
        prepared,
        failedCleanup,
      ],
      { message: "temporary cleanup refused" },
    ),
    rejected("a container failure remains blocking", [command, "/repo", {}, failedLaunch], 23),
    rejected(
      "a nested command failure remains blocking",
      [command, "/repo", inside, launched, failedDirect],
      9,
    ),
    negative(
      "a missing runtime directory cannot nominate an engine socket",
      [["--stack", ...command], "/repo", {}, launched, direct, prepared, cleaned],
      { message: expect.stringContaining("absolute") },
    ),
    negative(
      "ambiguous runtime mount paths are refused",
      [["--stack", ...command], "/repo", { XDG_RUNTIME_DIR: "/runtime:other" }, launched],
      { message: expect.stringContaining("colon") },
    ),
    negative(
      "temporary directory failure prevents launch",
      [["--stack", ...command], "/repo", stackEnvironment, launched, direct, failedPrepare],
      { message: "temporary folder refused" },
    ),
  ],
});
