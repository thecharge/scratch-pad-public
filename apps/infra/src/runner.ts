import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { exit } from "node:process";
import { CHECKS_IMAGE_REPOSITORY } from "@platform/config/environments";
import {
  CHECKS_CONTAINER_ENV,
  CHECKS_CONTAINERFILE,
  CHECKS_DPRINT_CACHE_DIR,
  CHECKS_DPRINT_CACHE_ENV,
  CHECKS_DPRINT_THREADS,
  CHECKS_DPRINT_THREADS_ENV,
  CHECKS_ENGINE_ENV,
  CHECKS_ENV_FLAG,
  CHECKS_GIT_ENV_FLAGS,
  CHECKS_RUN_FLAGS,
  CHECKS_STACK_FLAG,
  CHECKS_TEMP_ENV,
  CHECKS_TEMP_PREFIX,
  CHECKS_VOLUME_FLAG,
  CHECKS_WORKDIR_FLAG,
  DigestEncoding,
  ENV_ASSIGNMENT,
  ENV_TRUE,
  HashAlgorithm,
  IMAGE_ABSENT_EXIT,
  IMAGE_EXISTS_COMMAND,
  MessageId,
  PODMAN_SOCKET_FILE,
  PODMAN_SOCKET_PREFIX,
  PORT_SEPARATOR,
  PodmanCommand,
  Runner,
  STACK_CONTEXT_FLAG,
  STACK_FILE_FLAG,
  STACK_IMAGE_LABEL,
  STACK_LABEL_FLAG,
  STATIC_READ_ONLY_SUFFIX,
  StdioMode,
  Text,
  XDG_RUNTIME_DIR_ENV,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { RunResult } from "@platform/types";
import { FAST_SHIP_ENV } from "../../../packages/constants/src/fast-shipping.ts";
import { VERIFICATION_PUSH_ENV } from "../../../packages/constants/src/verification-push.ts";
import { REPO_ROOT, type run } from "../../../tooling/scripts/tools.ts";

async function inherited(command: readonly string[]): Promise<RunResult> {
  const child = Bun.spawn([...command], {
    cwd: REPO_ROOT,
    stdin: StdioMode.Inherit,
    stdout: StdioMode.Inherit,
    stderr: StdioMode.Inherit,
  });
  return { exitCode: await child.exited, stdout: Text.Empty, stderr: Text.Empty };
}

export async function runnerCommand(
  command: readonly string[],
  root: string,
  image: string,
  flags: readonly string[] = [],
): Promise<string[]> {
  if (!isAbsolute(root) || root.includes(PORT_SEPARATOR) || command.length === 0 || !command[0]) {
    throw new Error(message(MessageId.RunnerArguments));
  }
  return [
    Runner.Podman,
    Runner.Run,
    ...CHECKS_RUN_FLAGS,
    ...CHECKS_GIT_ENV_FLAGS,
    CHECKS_ENV_FLAG,
    [CHECKS_DPRINT_CACHE_ENV, join(root, CHECKS_DPRINT_CACHE_DIR)].join(ENV_ASSIGNMENT),
    CHECKS_ENV_FLAG,
    [CHECKS_DPRINT_THREADS_ENV, CHECKS_DPRINT_THREADS].join(ENV_ASSIGNMENT),
    CHECKS_WORKDIR_FLAG,
    root,
    CHECKS_VOLUME_FLAG,
    [root, root].join(PORT_SEPARATOR),
    ...flags,
    image,
    ...command,
  ];
}

async function output(command: readonly string[], execute: typeof run): Promise<number> {
  const result = await execute(command);
  if (result.stdout !== Text.Empty) console.log(result.stdout);
  if (result.stderr !== Text.Empty) console.error(result.stderr);
  return result.exitCode;
}

export async function runInContainer(
  command: readonly string[],
  root: string = REPO_ROOT,
  execute: typeof run = inherited,
  flags: readonly string[] = [],
): Promise<number> {
  const source = await Bun.file(join(root, CHECKS_CONTAINERFILE)).text();
  const digest = new Bun.CryptoHasher(HashAlgorithm.Sha256)
    .update(source)
    .digest(DigestEncoding.Hex);
  const image = [CHECKS_IMAGE_REPOSITORY, digest].join(PORT_SEPARATOR);
  const launch = await runnerCommand(command, root, image, flags);
  const present = await execute([Runner.Podman, PodmanCommand.Image, IMAGE_EXISTS_COMMAND, image]);
  if (present.exitCode !== 0 && present.exitCode !== IMAGE_ABSENT_EXIT) {
    console.error(present.stderr);
    return present.exitCode;
  }
  if (present.exitCode === IMAGE_ABSENT_EXIT) {
    const built = await output(
      [
        Runner.Podman,
        PodmanCommand.Build,
        STACK_LABEL_FLAG,
        STACK_IMAGE_LABEL,
        STACK_CONTEXT_FLAG,
        image,
        STACK_FILE_FLAG,
        join(root, CHECKS_CONTAINERFILE),
        root,
      ],
      execute,
    );
    if (built !== 0) return built;
  }
  return output(launch, execute);
}

async function orchestrationFlags(temporary: string, runtime: string): Promise<string[]> {
  const socket = runtime + PODMAN_SOCKET_FILE;
  return [
    CHECKS_VOLUME_FLAG,
    [temporary, temporary].join(PORT_SEPARATOR),
    CHECKS_VOLUME_FLAG,
    [socket, socket].join(PORT_SEPARATOR) + STATIC_READ_ONLY_SUFFIX,
    CHECKS_ENV_FLAG,
    [CHECKS_ENGINE_ENV, PODMAN_SOCKET_PREFIX + socket].join(ENV_ASSIGNMENT),
    CHECKS_ENV_FLAG,
    [CHECKS_CONTAINER_ENV, ENV_TRUE].join(ENV_ASSIGNMENT),
    CHECKS_ENV_FLAG,
    [CHECKS_TEMP_ENV, temporary].join(ENV_ASSIGNMENT),
    CHECKS_ENV_FLAG,
    FAST_SHIP_ENV,
    CHECKS_ENV_FLAG,
    VERIFICATION_PUSH_ENV,
  ];
}

export async function runChecks(
  args: readonly string[],
  root: string = REPO_ROOT,
  environment: Readonly<Record<string, string | undefined>> = Bun.env,
  execute = runInContainer,
  direct: typeof run = inherited,
  prepare = mkdtemp,
  cleanup = rm,
): Promise<number> {
  const stack = args[0] === CHECKS_STACK_FLAG;
  const command = stack ? args.slice(1) : args;
  if (environment[CHECKS_CONTAINER_ENV] === ENV_TRUE) return (await direct(command)).exitCode;
  if (!stack) return execute(command, root);
  const runtime = environment[XDG_RUNTIME_DIR_ENV] ?? Text.Empty;
  if (!isAbsolute(runtime) || runtime.includes(PORT_SEPARATOR)) {
    throw new Error(message(MessageId.RunnerArguments));
  }
  const temporary = await prepare(join(tmpdir(), CHECKS_TEMP_PREFIX));
  try {
    return await execute(command, root, undefined, await orchestrationFlags(temporary, runtime));
  } finally {
    await cleanup(temporary, { recursive: true, force: true });
  }
}

if (import.meta.main) exit(await runChecks(Bun.argv.slice(2)));
