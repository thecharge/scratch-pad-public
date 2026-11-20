import { delimiter, join } from "node:path";
import {
  API_IMAGE_REPOSITORY,
  API_PORT,
  CADDY_IMAGE,
  CURL_IMAGE_REPOSITORY,
  containerNameOf,
  environmentFor,
  GITHUB_ORIGIN,
  HTTP_SCHEME,
} from "@platform/config/environments";
import {
  API_BACKEND_PORT_SEPARATOR,
  API_CONTAINERFILE,
  API_IMAGE_ROOT_CONTEXT,
  API_IMAGE_TAG_SEPARATOR,
  BooleanText,
  BUILD_ARG_GITHUB,
  BUILD_ARG_PORT,
  BUILD_ARG_SEPARATOR,
  CACHED_LAYERS_FLAG,
  COMMAND_NOT_FOUND_EXIT,
  CURL_CONTAINERFILE,
  CURL_CONTEXT,
  CURL_IMAGE_TAG,
  DATA_OWNER_FLAGS,
  DEVELOPMENT_IMAGE,
  DU_BYTES_FLAGS,
  DU_SEPARATOR,
  EMPTY_BASE_IMAGE,
  EnvironmentName,
  FROM_FIELD_SEPARATOR,
  FROM_IMAGE_COLUMN,
  FROM_PATTERN,
  GREP_NO_FILENAME_FLAG,
  HEADER_SEPARATOR,
  HEX_ENCODING,
  HttpHeader,
  IMAGE_ID_FORMAT,
  IMAGE_SIZE_FORMAT,
  MediaType,
  MessageId,
  MKDIR_PARENTS_FLAG,
  NAME_FORMAT,
  NETWORK_LIST,
  NETWORK_NAME_FILTER,
  NO_LAYERS_FLAG,
  OBJECT_STORE_ENV_KEYS,
  PODMAN_ALL_FLAG,
  PODMAN_DANGLING_FILTER,
  PODMAN_FORCE_FLAG,
  PODMAN_FORMAT_FLAG,
  PODMAN_INSTALL_COMMAND,
  PODMAN_JSON_FORMAT,
  PODMAN_LABEL_FILTER,
  PODMAN_NAME_FILTER,
  PODMAN_QUIET_FLAG,
  PODMAN_VERSION_FLAG,
  PodmanCommand,
  PROXY_SECRET_BYTES,
  PROXY_SECRET_FILE,
  PUBLIC_HOST_ENV,
  PULUMI_DOCKER_PLUGIN_SHA256,
  PULUMI_DOCKER_PLUGIN_VERSION,
  PulumiCommand,
  PulumiEnv,
  READY_ATTEMPTS,
  READY_INTERVAL_MS,
  READY_URL_PATH,
  REMOVE_RECURSIVE_FLAGS,
  RepoPath,
  Runner,
  STACK_BUILD_ARG_FLAG,
  STACK_CHECKSUM_FLAG,
  STACK_CONFIG_API_IMAGE,
  STACK_CONFIG_ENVIRONMENT,
  STACK_CONFIG_PUBLIC_HOST,
  STACK_CONTEXT_FLAG,
  STACK_CREATE_FLAG,
  STACK_DATA_DIR,
  STACK_DIR,
  STACK_DOCKER_PLUGIN,
  STACK_EMPTY_PASSPHRASE,
  STACK_ENVIRONMENT_FILTER_PREFIX,
  STACK_EXPECT_NO_CHANGES,
  STACK_FILE_BACKEND_PREFIX,
  STACK_FILE_FLAG,
  STACK_FILTER_FLAG,
  STACK_HOME_DIR,
  STACK_IMAGE_LABEL,
  STACK_INFRA_DIR,
  STACK_LABEL_FLAG,
  STACK_LOG_TAIL,
  STACK_LOG_TAIL_FLAG,
  STACK_NAME_SEPARATOR,
  STACK_STATE_DIR,
  STACK_STATUS_FORMAT,
  STACK_YES_FLAGS,
  STATIC_VOLUME_FLAG,
  StackAction,
  StackService,
  StackStepName,
  Text,
  ToolBinary,
  WGET,
  WGET_HEADER_FLAG,
  WGET_QUIET_FLAGS,
} from "@platform/constants";
import { message } from "@platform/messages";
import {
  type ImageRow,
  ImageRowSchema,
  type RunResult,
  type StackDeps,
  type StackEnvironment,
} from "@platform/types";
import { z } from "zod";
import { REPO_ROOT, run } from "../../../tooling/scripts/tools.ts";
import { dataFoldersOf } from "./plan.ts";
import { buildStaticSites, publishStaticSites } from "./static.ts";
import { installBundles } from "./tools.ts";
import { checkWatchers } from "./watchers.ts";

export async function storedSecret(
  root: string = REPO_ROOT,
  env: Readonly<Record<string, string | undefined>> = Bun.env,
): Promise<string> {
  const given = env[PulumiEnv.ProxySecret];
  if (given !== undefined && given.length > 0) {
    return given;
  }
  const file = Bun.file(join(root, STACK_DIR, PROXY_SECRET_FILE));
  if (await file.exists()) {
    return (await file.text()).trim();
  }
  const created = Buffer.from(crypto.getRandomValues(new Uint8Array(PROXY_SECRET_BYTES))).toString(
    HEX_ENCODING,
  );
  await Bun.write(file, created);
  return created;
}

const DEFAULT_DEPS: StackDeps = {
  run,
  installBundles,
  buildSites: buildStaticSites,
  publishSites: publishStaticSites,
  checkWatchers,
  wait: Bun.sleep,
  root: REPO_ROOT,
  env: Bun.env,
  proxySecret: storedSecret,
};

async function pulumiEnv(deps: StackDeps): Promise<Record<string, string>> {
  const storage = Object.fromEntries(
    OBJECT_STORE_ENV_KEYS.flatMap((key) =>
      deps.env[key] === undefined ? [] : [[key, deps.env[key]]],
    ),
  );
  return {
    ...storage,
    [PulumiEnv.Backend]: `${STACK_FILE_BACKEND_PREFIX}${join(deps.root, STACK_DIR, STACK_STATE_DIR)}`,
    [PulumiEnv.Passphrase]: STACK_EMPTY_PASSPHRASE,
    [PulumiEnv.Home]: join(deps.root, STACK_DIR, STACK_HOME_DIR),
    [PulumiEnv.SkipUpdateCheck]: BooleanText.True,
    [PulumiEnv.ProxySecret]: await deps.proxySecret(),
    [PulumiEnv.Path]: [
      join(deps.root, RepoPath.ToolsDir, ToolBinary.Pulumi),
      deps.env[PulumiEnv.Path] ?? Text.Empty,
    ].join(delimiter),
  };
}

async function pulumi(deps: StackDeps, args: readonly string[]): Promise<RunResult> {
  return deps.run(
    [join(deps.root, RepoPath.ToolsDir, ToolBinary.Pulumi, ToolBinary.Pulumi), ...args],
    {
      cwd: join(deps.root, STACK_INFRA_DIR),
      env: await pulumiEnv(deps),
    },
  );
}

async function podmanReady(deps: StackDeps): Promise<number> {
  const result = await deps.run([Runner.Podman, PODMAN_VERSION_FLAG]).catch(async () => ({
    exitCode: COMMAND_NOT_FOUND_EXIT,
    stdout: Text.Empty,
    stderr: Text.Empty,
  }));
  if (result.exitCode !== 0) {
    console.error(message(MessageId.PodmanMissing, { command: PODMAN_INSTALL_COMMAND }));
  }
  return result.exitCode;
}

async function build(
  deps: StackDeps,
  tag: string,
  containerfile: string,
  context: string,
  args: Readonly<Record<string, string>> = {},
  layers = NO_LAYERS_FLAG,
): Promise<RunResult> {
  return deps.run(
    [
      Runner.Podman,
      PodmanCommand.Build,
      layers,
      STACK_LABEL_FLAG,
      STACK_IMAGE_LABEL,
      ...Object.entries(args).flatMap(([name, value]) => [
        STACK_BUILD_ARG_FLAG,
        [name, value].join(BUILD_ARG_SEPARATOR),
      ]),
      STACK_CONTEXT_FLAG,
      tag,
      STACK_FILE_FLAG,
      containerfile,
      context,
    ],
    { cwd: deps.root },
  );
}

async function ready(environment: EnvironmentName, deps: StackDeps): Promise<boolean> {
  const proxy = await containerNameOf(environment, StackService.Proxy);
  const { backend } = await environmentFor(environment, await deps.proxySecret());
  const url = `${HTTP_SCHEME}${backend.apiAddress}${API_BACKEND_PORT_SEPARATOR}${API_PORT}${READY_URL_PATH}`;
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
    const result = await deps.run([
      Runner.Podman,
      PodmanCommand.Exec,
      proxy,
      WGET,
      ...WGET_QUIET_FLAGS,
      WGET_HEADER_FLAG,
      [HttpHeader.Accept, MediaType.Json].join(HEADER_SEPARATOR),
      WGET_HEADER_FLAG,
      [HttpHeader.ProxyMarker, await deps.proxySecret()].join(HEADER_SEPARATOR),
      url,
    ]);
    if (result.exitCode === 0) {
      return true;
    }
    await deps.wait(READY_INTERVAL_MS);
  }
  return false;
}

async function first(
  environment: string,
  steps: readonly (readonly [string, () => Promise<number>])[],
): Promise<number> {
  for (const [name, step] of steps) {
    console.log(message(MessageId.StackStep, { environment, step: name }));
    const code = await step();
    if (code !== 0) {
      console.error(message(MessageId.StackStepFailed, { environment, step: name, code }));
      return code;
    }
  }
  return 0;
}

async function exitOf(pending: Promise<RunResult>): Promise<number> {
  const result = await pending;
  if (result.exitCode !== 0) {
    console.error(result.stderr.trim() || result.stdout.trim());
  }
  return result.exitCode;
}

async function giveImageId(deps: StackDeps, environment: EnvironmentName): Promise<number> {
  const tag = [API_IMAGE_REPOSITORY, environment].join(API_IMAGE_TAG_SEPARATOR);
  const inspected = await deps.run([
    Runner.Podman,
    PodmanCommand.Image,
    PodmanCommand.Inspect,
    PODMAN_FORMAT_FLAG,
    IMAGE_ID_FORMAT,
    tag,
  ]);
  if (inspected.exitCode !== 0) {
    return exitOf(Promise.resolve(inspected));
  }
  return exitOf(
    pulumi(deps, [
      PulumiCommand.Config,
      PulumiCommand.Set,
      STACK_CONFIG_API_IMAGE,
      inspected.stdout.trim(),
    ]),
  );
}

async function prepareData(deps: StackDeps, environment: StackEnvironment): Promise<number> {
  const folders = await dataFoldersOf(environment, deps.root);
  const commands = folders.flatMap((folder) => [
    [Runner.Mkdir, MKDIR_PARENTS_FLAG, folder.path],
    [
      Runner.Podman,
      Runner.Run,
      ...DATA_OWNER_FLAGS,
      STATIC_VOLUME_FLAG,
      [folder.path, folder.path].join(API_BACKEND_PORT_SEPARATOR),
      DEVELOPMENT_IMAGE,
      PodmanCommand.Chown,
      folder.owner,
      folder.path,
    ],
  ]);
  for (const command of commands) {
    const code = await exitOf(deps.run(command));
    if (code !== 0) {
      return code;
    }
  }
  return 0;
}

export async function stackUp(
  name: EnvironmentName,
  deps: StackDeps = DEFAULT_DEPS,
): Promise<number> {
  const environment = z.enum(EnvironmentName).parse(name);
  const described = await environmentFor(environment, undefined, deps.env);
  const apiTag = [API_IMAGE_REPOSITORY, environment].join(API_IMAGE_TAG_SEPARATOR);
  const publicHost = deps.env[PUBLIC_HOST_ENV];
  const code = await first(environment, [
    [StackStepName.Podman, async () => podmanReady(deps)],
    [
      StackStepName.Watchers,
      async () => (described.sourceMount ? deps.checkWatchers(deps.root) : 0),
    ],
    [StackStepName.Tools, async () => deps.installBundles()],
    [
      StackStepName.State,
      async () =>
        exitOf(
          deps.run([Runner.Mkdir, MKDIR_PARENTS_FLAG, join(deps.root, STACK_DIR, STACK_STATE_DIR)]),
        ),
    ],
    [StackStepName.Data, async () => prepareData(deps, described)],
    [
      StackStepName.ApiImage,
      async () =>
        exitOf(
          build(deps, apiTag, API_CONTAINERFILE, API_IMAGE_ROOT_CONTEXT, {
            [BUILD_ARG_PORT]: String(API_PORT),
          }),
        ),
    ],
    [
      StackStepName.CurlImage,
      async () =>
        described.testServices
          ? exitOf(
              build(
                deps,
                [CURL_IMAGE_REPOSITORY, CURL_IMAGE_TAG].join(API_IMAGE_TAG_SEPARATOR),
                CURL_CONTAINERFILE,
                CURL_CONTEXT,
                { [BUILD_ARG_GITHUB]: GITHUB_ORIGIN },
                CACHED_LAYERS_FLAG,
              ),
            )
          : 0,
    ],
    [StackStepName.StaticBuild, async () => deps.buildSites(described, deps.root, deps.run)],
    [
      StackStepName.Plugin,
      async () =>
        exitOf(
          pulumi(deps, [
            PulumiCommand.Plugin,
            PulumiCommand.Install,
            PulumiCommand.Resource,
            STACK_DOCKER_PLUGIN,
            PULUMI_DOCKER_PLUGIN_VERSION,
            STACK_CHECKSUM_FLAG,
            PULUMI_DOCKER_PLUGIN_SHA256,
          ]),
        ),
    ],
    [
      StackStepName.Select,
      async () =>
        exitOf(
          pulumi(deps, [PulumiCommand.Stack, PulumiCommand.Select, STACK_CREATE_FLAG, environment]),
        ),
    ],
    [
      StackStepName.Environment,
      async () =>
        exitOf(
          pulumi(deps, [
            PulumiCommand.Config,
            PulumiCommand.Set,
            STACK_CONFIG_ENVIRONMENT,
            environment,
          ]),
        ),
    ],
    [StackStepName.ImageId, async () => giveImageId(deps, environment)],
    [
      StackStepName.PublicHost,
      async () =>
        publicHost === undefined
          ? 0
          : exitOf(
              pulumi(deps, [
                PulumiCommand.Config,
                PulumiCommand.Set,
                STACK_CONFIG_PUBLIC_HOST,
                publicHost,
              ]),
            ),
    ],
    [
      StackStepName.Create,
      async () => exitOf(pulumi(deps, [PulumiCommand.Up, ...STACK_YES_FLAGS])),
    ],
    [
      StackStepName.Replaced,
      async () =>
        exitOf(
          deps.run([
            Runner.Podman,
            PodmanCommand.Image,
            PodmanCommand.Prune,
            PODMAN_FORCE_FLAG,
            STACK_FILTER_FLAG,
            PODMAN_LABEL_FILTER,
            STACK_FILTER_FLAG,
            PODMAN_DANGLING_FILTER,
          ]),
        ),
    ],
    [
      StackStepName.Wait,
      async () => {
        const answered = await ready(environment, deps);
        console.log(
          message(answered ? MessageId.StackReady : MessageId.StackNotReady, {
            environment,
            attempts: READY_ATTEMPTS,
          }),
        );
        return answered ? 0 : 1;
      },
    ],
    [StackStepName.StaticPublish, async () => deps.publishSites(described, deps.root, deps.run)],
  ]);
  return code;
}

export async function stackDown(
  name: EnvironmentName,
  deps: StackDeps = DEFAULT_DEPS,
): Promise<number> {
  const environment = z.enum(EnvironmentName).parse(name);
  return first(environment, [
    [StackStepName.Podman, async () => podmanReady(deps)],
    [
      StackStepName.Select,
      async () => exitOf(pulumi(deps, [PulumiCommand.Stack, PulumiCommand.Select, environment])),
    ],
    [
      StackStepName.Remove,
      async () => exitOf(pulumi(deps, [PulumiCommand.Destroy, ...STACK_YES_FLAGS])),
    ],
  ]);
}

export async function stackCheck(
  name: EnvironmentName,
  deps: StackDeps = DEFAULT_DEPS,
): Promise<number> {
  const environment = z.enum(EnvironmentName).parse(name);
  return first(environment, [
    [StackStepName.Podman, async () => podmanReady(deps)],
    [
      StackStepName.Select,
      async () => exitOf(pulumi(deps, [PulumiCommand.Stack, PulumiCommand.Select, environment])),
    ],
    [StackStepName.ImageId, async () => giveImageId(deps, environment)],
    [
      StackStepName.Compare,
      async () => exitOf(pulumi(deps, [PulumiCommand.Preview, STACK_EXPECT_NO_CHANGES])),
    ],
  ]);
}

async function listed(deps: StackDeps, args: readonly string[]): Promise<string[]> {
  const result = await deps.run([Runner.Podman, ...args]);
  return result.exitCode === 0
    ? result.stdout
        .split(Text.Newline)
        .map((line) => line.trim())
        .filter((line) => line !== Text.Empty)
    : [];
}

async function removing(
  deps: StackDeps,
  command: readonly string[],
  ids: string[],
): Promise<number> {
  return ids.length === 0 ? 0 : exitOf(deps.run([...command, ...ids]));
}

async function folderBytes(deps: StackDeps, path: string): Promise<number> {
  const result = await deps.run([
    Runner.Podman,
    PodmanCommand.Unshare,
    Runner.Du,
    DU_BYTES_FLAGS,
    path,
  ]);
  return result.exitCode === 0 ? Number(result.stdout.split(DU_SEPARATOR)[0]) || 0 : 0;
}

async function baseImages(deps: StackDeps): Promise<string[]> {
  const result = await deps.run([
    Runner.Grep,
    GREP_NO_FILENAME_FLAG,
    FROM_PATTERN,
    join(deps.root, API_CONTAINERFILE),
    join(deps.root, CURL_CONTAINERFILE),
  ]);
  const images = result.stdout
    .split(Text.Newline)
    .map((line) => line.split(FROM_FIELD_SEPARATOR)[FROM_IMAGE_COLUMN] ?? Text.Empty)
    .filter((image) => image !== Text.Empty && image !== EMPTY_BASE_IMAGE);
  return result.exitCode === 0 ? [...new Set(images)] : [];
}

async function imageBytes(deps: StackDeps, image: string): Promise<number> {
  const result = await deps.run([
    Runner.Podman,
    PodmanCommand.Image,
    PodmanCommand.Inspect,
    PODMAN_FORMAT_FLAG,
    IMAGE_SIZE_FORMAT,
    image,
  ]);
  return result.exitCode === 0 ? Number(result.stdout.trim()) || 0 : 0;
}

async function removeBases(deps: StackDeps): Promise<number> {
  let freed = 0;
  for (const image of [...(await baseImages(deps)), CADDY_IMAGE]) {
    const size = await imageBytes(deps, image);
    const result = await deps.run([Runner.Podman, PodmanCommand.Rmi, PODMAN_FORCE_FLAG, image]);
    freed += result.exitCode === 0 ? size : 0;
  }
  return freed;
}

async function stackImages(deps: StackDeps): Promise<ImageRow[]> {
  const result = await deps.run([
    Runner.Podman,
    PodmanCommand.Images,
    PODMAN_ALL_FLAG,
    STACK_FILTER_FLAG,
    PODMAN_LABEL_FILTER,
    PODMAN_FORMAT_FLAG,
    PODMAN_JSON_FORMAT,
  ]);
  return result.exitCode === 0 && result.stdout.trim() !== Text.Empty
    ? z.array(ImageRowSchema).parse(JSON.parse(result.stdout))
    : [];
}

export async function stackPrune(deps: StackDeps = DEFAULT_DEPS): Promise<number> {
  const removed = { containers: 0, networks: 0, images: 0, bytes: 0 };
  const dataRoot = join(deps.root, STACK_DIR, STACK_DATA_DIR);
  const stateRoot = join(deps.root, STACK_DIR, STACK_STATE_DIR);
  const code = await first(StackAction.Prune, [
    [StackStepName.Podman, async () => podmanReady(deps)],
    [
      StackStepName.RemoveContainers,
      async () => {
        const ids = await listed(deps, [
          PodmanCommand.Ps,
          PODMAN_ALL_FLAG,
          PODMAN_QUIET_FLAG,
          STACK_FILTER_FLAG,
          PODMAN_NAME_FILTER,
        ]);
        removed.containers = ids.length;
        return removing(deps, [Runner.Podman, PodmanCommand.Rm, PODMAN_FORCE_FLAG], ids);
      },
    ],
    [
      StackStepName.RemoveNetworks,
      async () => {
        const names = await listed(deps, [
          PodmanCommand.Network,
          NETWORK_LIST,
          STACK_FILTER_FLAG,
          NETWORK_NAME_FILTER,
          PODMAN_FORMAT_FLAG,
          NAME_FORMAT,
        ]);
        removed.networks = names.length;
        return removing(
          deps,
          [Runner.Podman, PodmanCommand.Network, PodmanCommand.Rm, PODMAN_FORCE_FLAG],
          names,
        );
      },
    ],
    [
      StackStepName.RemoveData,
      async () => {
        removed.bytes += await folderBytes(deps, dataRoot);
        removed.bytes += await folderBytes(deps, stateRoot);
        return exitOf(
          deps.run([
            Runner.Podman,
            PodmanCommand.Unshare,
            Runner.Rm,
            ...REMOVE_RECURSIVE_FLAGS,
            dataRoot,
            stateRoot,
          ]),
        );
      },
    ],
    [
      StackStepName.RemoveImages,
      async () => {
        const rows = await stackImages(deps);
        removed.images = rows.length;
        removed.bytes += rows.reduce((sum, row) => sum + row.Size, 0);
        removed.bytes += await removeBases(deps);
        return removing(
          deps,
          [Runner.Podman, PodmanCommand.Rmi, PODMAN_FORCE_FLAG],
          rows.map((row) => row.Id),
        );
      },
    ],
  ]);
  if (code === 0) {
    console.log(message(MessageId.StackPruned, removed));
  }
  return code;
}

async function stackInspect(
  environment: EnvironmentName,
  deps: StackDeps,
  action: StackAction,
): Promise<number> {
  const available = await podmanReady(deps);
  if (available !== 0) return available;
  const args =
    action === StackAction.Status
      ? [
          PodmanCommand.Ps,
          PODMAN_ALL_FLAG,
          STACK_FILTER_FLAG,
          [STACK_ENVIRONMENT_FILTER_PREFIX, environment, STACK_NAME_SEPARATOR].join(Text.Empty),
          PODMAN_FORMAT_FLAG,
          STACK_STATUS_FORMAT,
        ]
      : [
          PodmanCommand.Logs,
          STACK_LOG_TAIL_FLAG,
          STACK_LOG_TAIL,
          await containerNameOf(environment, StackService.Api),
        ];
  const result = await deps.run([Runner.Podman, ...args]);
  if (result.stdout !== Text.Empty) console.log(result.stdout);
  return exitOf(Promise.resolve(result));
}

async function stackReset(
  environment: EnvironmentName,
  deps: StackDeps = DEFAULT_DEPS,
): Promise<number> {
  const stopped = await stackDown(environment, deps);
  if (stopped !== 0) return stopped;
  const folders = await dataFoldersOf(
    await environmentFor(environment, undefined, deps.env),
    deps.root,
  );
  const removed = await exitOf(
    deps.run([
      Runner.Podman,
      PodmanCommand.Unshare,
      Runner.Rm,
      ...REMOVE_RECURSIVE_FLAGS,
      ...folders.map((folder) => folder.path),
    ]),
  );
  return removed === 0 ? stackUp(environment, deps) : removed;
}

export async function runStackCommand(
  args: readonly string[],
  deps: StackDeps = DEFAULT_DEPS,
): Promise<number> {
  const [action, name] = args;
  const parsed = z.enum(StackAction).safeParse(action);
  if (parsed.data === StackAction.Prune) {
    return stackPrune(deps);
  }
  if (parsed.data === StackAction.Tools) return deps.installBundles();
  const environment = z.enum(EnvironmentName).safeParse(name);
  if (!parsed.success || !environment.success) {
    console.error(message(MessageId.StackUsage));
    return 1;
  }
  if (parsed.data === StackAction.Status || parsed.data === StackAction.Logs) {
    return stackInspect(environment.data, deps, parsed.data);
  }
  const actions: Partial<Record<StackAction, typeof stackUp>> = {
    [StackAction.Up]: stackUp,
    [StackAction.Down]: stackDown,
    [StackAction.Check]: stackCheck,
    [StackAction.Reset]: stackReset,
  };
  const selected = actions[parsed.data];
  return selected === undefined ? 1 : selected(environment.data, deps);
}

if (import.meta.main) process.exit(await runStackCommand(Bun.argv.slice(2)));
