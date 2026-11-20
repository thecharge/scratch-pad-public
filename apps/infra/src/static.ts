import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  CURL_IMAGE_REPOSITORY,
  containerNameOf,
  HTTPS_SCHEME,
  STATIC_BUILDS,
} from "@platform/config/environments";
import {
  ASSET_BUCKET_PATH,
  CADDY_DATA_FOLDER,
  CURL_IMAGE_TAG,
  MessageId,
  PodmanCommand,
  Runner,
  STACK_CONTEXT_FLAG,
  STACK_DATA_DIR,
  STACK_DIR,
  STACK_FILE_FLAG,
  STACK_IMAGE_LABEL,
  STACK_LABEL_FLAG,
  STATIC_BUILD_CONTEXT,
  STATIC_CONTENT_TYPE_PREFIX,
  STATIC_COPY,
  STATIC_COPY_CONTENTS,
  STATIC_COPY_SEPARATOR,
  STATIC_CREATE,
  STATIC_CURL_DATA_FILE,
  STATIC_CURL_DATA_PREFIX,
  STATIC_CURL_FLAGS,
  STATIC_CURL_HEADER_PREFIX,
  STATIC_CURL_NEXT,
  STATIC_EXPORT_PREFIX,
  STATIC_FILE_GLOB,
  STATIC_INTERACTIVE_FLAG,
  STATIC_NAME_FLAG,
  STATIC_NETWORK_FLAG,
  STATIC_OUTPUT_DIR,
  STATIC_PATH_SEPARATOR,
  STATIC_PKI_CERTIFICATE,
  STATIC_PKI_MOUNT,
  STATIC_POLICY_ACTION,
  STATIC_POLICY_EFFECT,
  STATIC_POLICY_PRINCIPAL,
  STATIC_POLICY_QUERY,
  STATIC_POLICY_RESOURCE_PREFIX,
  STATIC_POLICY_RESOURCE_SUFFIX,
  STATIC_POLICY_VERSION,
  STATIC_READ_ONLY_SUFFIX,
  STATIC_REMOVE_FLAG,
  STATIC_SITE_INDEX,
  STATIC_SITE_PATH,
  STATIC_VOLUME_FLAG,
  STATIC_WEBSITE_QUERY,
  STATIC_WEBSITE_XML,
  StackNetwork,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import {
  type StackEnvironment,
  StackEnvironmentSchema,
  type StaticBuild,
  type StaticWebsite,
} from "@platform/types";
import { REPO_ROOT, run } from "../../../tooling/scripts/tools.ts";

async function outputOf(result: Awaited<ReturnType<typeof run>>): Promise<number> {
  if (result.exitCode !== 0) console.error(result.stderr || result.stdout);
  return result.exitCode;
}

async function exportSite(
  build: StaticBuild,
  environment: StackEnvironment,
  root: string,
  execute: typeof run,
): Promise<number> {
  const target = join(root, STACK_DIR, STATIC_OUTPUT_DIR, environment.name, build.service);
  await mkdir(target, { recursive: true });
  const name = STATIC_EXPORT_PREFIX + crypto.randomUUID();
  const created = await execute([
    Runner.Podman,
    STATIC_CREATE,
    STATIC_NAME_FLAG,
    name,
    build.image,
    STATIC_SITE_PATH,
  ]);
  if (created.exitCode !== 0) return outputOf(created);
  let copied = 1;
  try {
    copied = await outputOf(
      await execute([
        Runner.Podman,
        STATIC_COPY,
        name + STATIC_COPY_SEPARATOR + STATIC_COPY_CONTENTS,
        target,
      ]),
    );
  } finally {
    const removed = await outputOf(await execute([Runner.Podman, PodmanCommand.Rm, name]));
    if (copied === 0) copied = removed;
  }
  return copied;
}

export async function buildStaticSites(
  environment: StackEnvironment,
  root = REPO_ROOT,
  execute: typeof run = run,
): Promise<number> {
  const checked = StackEnvironmentSchema.parse(environment);
  if (checked.objectStore === undefined) return 0;
  for (const build of STATIC_BUILDS) {
    const result = await execute(
      [
        Runner.Podman,
        PodmanCommand.Build,
        STACK_LABEL_FLAG,
        STACK_IMAGE_LABEL,
        STACK_CONTEXT_FLAG,
        build.image,
        STACK_FILE_FLAG,
        build.containerfile,
        STATIC_BUILD_CONTEXT,
      ],
      { cwd: root },
    );
    if (result.exitCode !== 0) return outputOf(result);
    const copied = await exportSite(build, checked, root, execute);
    if (copied !== 0) return copied;
  }
  return 0;
}

async function transfer(
  environment: StackEnvironment,
  path: string,
  data?: string,
  mediaType?: string,
): Promise<string> {
  const store = environment.objectStore;
  return message(MessageId.StaticCurlTransfer, {
    credentials: JSON.stringify([store?.accessKey, store?.secretKey].join(STATIC_COPY_SEPARATOR)),
    certificate: JSON.stringify(STATIC_PKI_CERTIFICATE),
    url: JSON.stringify(
      `${HTTPS_SCHEME}${store?.host}${STATIC_COPY_SEPARATOR}${environment.proxy.port}${path}`,
    ),
    data:
      data === undefined
        ? Text.Empty
        : STATIC_CURL_DATA_PREFIX + JSON.stringify(data) + Text.Newline,
    header:
      mediaType === undefined
        ? Text.Empty
        : STATIC_CURL_HEADER_PREFIX +
          JSON.stringify(STATIC_CONTENT_TYPE_PREFIX + mediaType) +
          Text.Newline,
  });
}

async function siteTransfers(
  environment: StackEnvironment,
  site: StaticWebsite,
  root: string,
): Promise<string> {
  const base = STATIC_PATH_SEPARATOR + site.bucket;
  const folder = join(root, STACK_DIR, STATIC_OUTPUT_DIR, environment.name, site.bucket);
  if (!(await Bun.file(join(folder, STATIC_SITE_INDEX)).exists()))
    throw new Error(message(MessageId.StaticMissingIndex, { site: site.bucket }));
  const requests = [
    await transfer(environment, base),
    await transfer(environment, base + STATIC_WEBSITE_QUERY, STATIC_WEBSITE_XML),
  ];
  for await (const file of new Bun.Glob(STATIC_FILE_GLOB).scan({ cwd: folder, onlyFiles: true })) {
    const path =
      base +
      STATIC_PATH_SEPARATOR +
      file.split(STATIC_PATH_SEPARATOR).map(encodeURIComponent).join(STATIC_PATH_SEPARATOR);
    const body = STATIC_CURL_DATA_FILE + join(STATIC_SITE_PATH, site.bucket, file);
    requests.push(await transfer(environment, path, body, Bun.file(join(folder, file)).type));
  }
  const policy = JSON.stringify({
    Version: STATIC_POLICY_VERSION,
    Statement: [
      {
        Effect: STATIC_POLICY_EFFECT,
        Principal: STATIC_POLICY_PRINCIPAL,
        Action: [STATIC_POLICY_ACTION],
        Resource: [STATIC_POLICY_RESOURCE_PREFIX + site.bucket + STATIC_POLICY_RESOURCE_SUFFIX],
      },
    ],
  });
  requests.push(await transfer(environment, base + STATIC_POLICY_QUERY, policy));
  return requests.join(STATIC_CURL_NEXT);
}

export async function publishStaticSites(
  environment: StackEnvironment,
  root = REPO_ROOT,
  execute: typeof run = run,
): Promise<number> {
  const checked = StackEnvironmentSchema.parse(environment);
  if (checked.objectStore === undefined) return 0;
  const transfers: string[] = [await transfer(checked, ASSET_BUCKET_PATH)];
  for (const site of checked.objectStore.websites)
    transfers.push(await siteTransfers(checked, site, root));
  const certificate = join(
    root,
    STACK_DIR,
    STACK_DATA_DIR,
    await containerNameOf(checked.name, CADDY_DATA_FOLDER),
  );
  const assets = join(root, STACK_DIR, STATIC_OUTPUT_DIR, checked.name);
  const result = await execute(
    [
      Runner.Podman,
      Runner.Run,
      STATIC_REMOVE_FLAG,
      STATIC_INTERACTIVE_FLAG,
      STATIC_NETWORK_FLAG,
      await containerNameOf(checked.name, StackNetwork.Edge),
      STATIC_VOLUME_FLAG,
      certificate + STATIC_COPY_SEPARATOR + STATIC_PKI_MOUNT + STATIC_READ_ONLY_SUFFIX,
      STATIC_VOLUME_FLAG,
      assets + STATIC_COPY_SEPARATOR + STATIC_SITE_PATH + STATIC_READ_ONLY_SUFFIX,
      [CURL_IMAGE_REPOSITORY, CURL_IMAGE_TAG].join(STATIC_COPY_SEPARATOR),
      ...STATIC_CURL_FLAGS,
    ],
    { stdin: transfers.join(STATIC_CURL_NEXT) },
  );
  return outputOf(result);
}
