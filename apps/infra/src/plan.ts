import { join } from "node:path";
import { assetStorageFor } from "@platform/config/assets";
import {
  API_BACKEND_ALIAS,
  API_IMAGE_REPOSITORY,
  CADDY_IMAGE,
  containerNameOf,
  HTTP_SCHEME,
  HTTPS_SCHEME,
  OBJECT_STORE_BIND_HOST,
} from "@platform/config/environments";
import {
  API_DATA_FOLDER,
  API_DATA_OWNER,
  API_DATA_PATH,
  API_DATABASE_FILE,
  API_IMAGE_TAG_SEPARATOR,
  API_SOURCE_PATH,
  API_START_COMMAND,
  API_WATCH_COMMAND,
  type AppEnvironment,
  AuthProviderKind,
  BooleanText,
  CADDY_CONFIG_PATH,
  CADDY_DATA_FOLDER,
  CADDY_DATA_OWNER,
  CADDY_DATA_PATH,
  CONSOLE_API_ENV,
  DEVELOPMENT_IMAGE,
  DEVELOPMENT_POLLING_ENV,
  DEX_CONFIG_PATH,
  DEX_KEYS_PATH,
  DEX_START_COMMAND,
  EnvVar,
  IMAGE_ID_LABEL,
  MountKind,
  OBJECT_STORE_ACCESS_ENV,
  OBJECT_STORE_ADDRESS_ENV,
  OBJECT_STORE_CONSOLE_ENV,
  OBJECT_STORE_DATA_FOLDER,
  OBJECT_STORE_DATA_PATH,
  OBJECT_STORE_LOG_FOLDER,
  OBJECT_STORE_LOG_PATH,
  OBJECT_STORE_OWNER,
  OBJECT_STORE_SECRET_ENV,
  OBJECT_STORE_WEBSITE_ENV,
  PORT_SEPARATOR,
  PortProtocol,
  PUBLIC_HTTPS_PORT,
  STACK_DATA_DIR,
  STACK_DIR,
  StackNetwork,
  StackService,
  Text,
} from "@platform/constants";
import {
  type AttachmentPlan,
  type ContainerPlan,
  type DevelopmentApp,
  type FolderPlan,
  type IdentityEnvironment,
  type MountPlan,
  type ObjectStoreEnvironment,
  type PortPlan,
  type StackEnvironment,
  StackEnvironmentSchema,
  type StackPlan,
  StackPlanSchema,
} from "@platform/types";
import { all } from "@platform/util";
import { renderCaddyfile } from "./caddy.ts";
import { dexIssuerOf, renderDexConfig } from "./dex.ts";

async function nameOf(environment: StackEnvironment, part: string): Promise<string> {
  return containerNameOf(environment.name, part);
}

async function folderOf(
  environment: StackEnvironment,
  folder: string,
  root: string,
): Promise<string> {
  return join(root, STACK_DIR, STACK_DATA_DIR, await nameOf(environment, folder));
}

export async function dataFoldersOf(
  environment: StackEnvironment,
  root: string = Text.Empty,
): Promise<FolderPlan[]> {
  const checked = StackEnvironmentSchema.parse(environment);
  const storage =
    checked.objectStore === undefined ? [] : [OBJECT_STORE_DATA_FOLDER, OBJECT_STORE_LOG_FOLDER];
  const folders = await all(
    storage.map((folder) => async () => ({
      path: await folderOf(checked, folder, root),
      owner: OBJECT_STORE_OWNER,
    })),
  );
  return [
    { path: await folderOf(checked, CADDY_DATA_FOLDER, root), owner: CADDY_DATA_OWNER },
    { path: await folderOf(checked, API_DATA_FOLDER, root), owner: API_DATA_OWNER },
    ...folders,
  ];
}

async function originOf(environment: StackEnvironment): Promise<string> {
  const { host, port } = environment.proxy;
  return port === PUBLIC_HTTPS_PORT
    ? `${HTTPS_SCHEME}${host}`
    : `${HTTPS_SCHEME}${host}${PORT_SEPARATOR}${port}`;
}

async function portsOf(environment: StackEnvironment): Promise<PortPlan[]> {
  return environment.proxy.published.flatMap((external) =>
    [PortProtocol.Tcp, PortProtocol.Udp].map((protocol) => ({
      internal: environment.proxy.port,
      external,
      protocol,
    })),
  );
}

async function proxyContainer(environment: StackEnvironment, root: string): Promise<ContainerPlan> {
  const edge = await nameOf(environment, StackNetwork.Edge);
  const backend = await nameOf(environment, StackNetwork.Backend);
  const attachments: AttachmentPlan[] = [
    {
      network: edge,
      aliases: [
        environment.proxy.host,
        ...environment.developmentApps.map((app) => app.host),
        ...(environment.objectStore === undefined
          ? []
          : [
              environment.objectStore.host,
              ...environment.objectStore.websites.map((site) => site.host),
            ]),
      ],
    },
    { network: backend, aliases: [] },
  ];
  const mounts: MountPlan[] = [
    {
      kind: MountKind.Bind,
      source: await folderOf(environment, CADDY_DATA_FOLDER, root),
      target: CADDY_DATA_PATH,
      readOnly: false,
    },
  ];
  return {
    name: await nameOf(environment, StackService.Proxy),
    image: CADDY_IMAGE,
    pull: true,
    command: [],
    attachments,
    ports: await portsOf(environment),
    mounts,
    uploads: [
      {
        file: CADDY_CONFIG_PATH,
        content: await renderCaddyfile(
          environment.proxy,
          environment.backend.apiAddress,
          environment.api.port,
          environment.developmentApps,
          environment.objectStore,
        ),
      },
    ],
    env: {},
    labels: {},
  };
}

async function apiMounts(environment: StackEnvironment, root: string): Promise<MountPlan[]> {
  const data: MountPlan = {
    kind: MountKind.Bind,
    source: await folderOf(environment, API_DATA_FOLDER, root),
    target: API_DATA_PATH,
    readOnly: false,
  };
  const source: MountPlan = {
    kind: MountKind.Bind,
    source: root,
    target: API_SOURCE_PATH,
    readOnly: false,
  };
  return environment.sourceMount ? [data, source] : [data];
}

async function assetEnv(environment: StackEnvironment): Promise<Record<string, string>> {
  const storage = await assetStorageFor(environment);
  return storage === undefined ? {} : { [EnvVar.AssetStorage]: JSON.stringify(storage) };
}

async function identityEnv(environment: StackEnvironment): Promise<Record<string, string>> {
  const identity = environment.identity;
  if (identity === undefined) {
    return {};
  }
  const issuer = await dexIssuerOf(identity, HTTP_SCHEME);
  return {
    [EnvVar.AuthProvider]: AuthProviderKind.Jwks,
    [EnvVar.AuthIssuer]: issuer,
    [EnvVar.AuthJwksUrl]: [issuer, DEX_KEYS_PATH].join(Text.Empty),
    [EnvVar.AuthAudience]: identity.clientId,
  };
}

async function dexContainer(
  environment: StackEnvironment,
  identity: IdentityEnvironment,
): Promise<ContainerPlan> {
  const backend = await nameOf(environment, StackNetwork.Backend);
  return {
    name: await nameOf(environment, StackService.Identity),
    image: identity.image,
    pull: true,
    command: [...DEX_START_COMMAND],
    attachments: [{ network: backend, aliases: [identity.alias] }],
    ports: [],
    mounts: [],
    uploads: [{ file: DEX_CONFIG_PATH, content: await renderDexConfig(identity, HTTP_SCHEME) }],
    env: {},
    labels: {},
  };
}

async function apiContainer(
  environment: StackEnvironment,
  root: string,
  image: string,
): Promise<ContainerPlan> {
  const backend = await nameOf(environment, StackNetwork.Backend);
  return {
    name: await nameOf(environment, StackService.Api),
    image: [API_IMAGE_REPOSITORY, environment.name].join(API_IMAGE_TAG_SEPARATOR),
    pull: false,
    command: [...(environment.sourceMount ? API_WATCH_COMMAND : API_START_COMMAND)],
    attachments: [
      { network: backend, aliases: [API_BACKEND_ALIAS], address: environment.backend.apiAddress },
    ],
    ports: [],
    mounts: await apiMounts(environment, root),
    uploads: [],
    env: {
      [EnvVar.AppEnv]: environment.name as unknown as AppEnvironment,
      [EnvVar.Port]: String(environment.api.port),
      [EnvVar.AuthEnabled]: environment.api.authEnabled ? BooleanText.True : BooleanText.False,
      [EnvVar.AuthResource]: await originOf(environment),
      ...(await assetEnv(environment)),
      ...(await identityEnv(environment)),
      [EnvVar.DatabasePath]: API_DATABASE_FILE,
      [EnvVar.ProxySecret]: environment.proxy.secret ?? Text.Empty,
    },
    labels: image === Text.Empty ? {} : { [IMAGE_ID_LABEL]: image },
  };
}

async function developmentContainer(
  environment: StackEnvironment,
  root: string,
  application: DevelopmentApp,
): Promise<ContainerPlan> {
  return {
    name: await nameOf(environment, application.service),
    image: DEVELOPMENT_IMAGE,
    pull: true,
    command: application.command,
    attachments: [
      {
        network: await nameOf(environment, StackNetwork.Backend),
        aliases: [application.service],
        address: application.address,
      },
    ],
    ports: [],
    mounts: [{ kind: MountKind.Bind, source: root, target: API_SOURCE_PATH, readOnly: false }],
    uploads: [],
    env: {
      [DEVELOPMENT_POLLING_ENV]: BooleanText.True,
      [CONSOLE_API_ENV]: `${HTTPS_SCHEME}${application.host}${PORT_SEPARATOR}${environment.proxy.port}`,
    },
    labels: {},
  };
}

async function objectStoreContainer(
  environment: StackEnvironment,
  root: string,
  store: ObjectStoreEnvironment,
): Promise<ContainerPlan> {
  const mounts: MountPlan[] = [
    {
      kind: MountKind.Bind,
      source: await folderOf(environment, OBJECT_STORE_DATA_FOLDER, root),
      target: OBJECT_STORE_DATA_PATH,
      readOnly: false,
    },
    {
      kind: MountKind.Bind,
      source: await folderOf(environment, OBJECT_STORE_LOG_FOLDER, root),
      target: OBJECT_STORE_LOG_PATH,
      readOnly: false,
    },
  ];
  return {
    name: await nameOf(environment, StackService.ObjectStore),
    image: store.image,
    pull: true,
    command: [],
    attachments: [
      {
        network: await nameOf(environment, StackNetwork.Backend),
        aliases: [store.alias],
        address: store.address,
      },
    ],
    ports: [],
    mounts,
    uploads: [],
    env: {
      [OBJECT_STORE_ACCESS_ENV]: store.accessKey,
      [OBJECT_STORE_SECRET_ENV]: store.secretKey,
      [OBJECT_STORE_ADDRESS_ENV]: [OBJECT_STORE_BIND_HOST, store.port].join(PORT_SEPARATOR),
      [OBJECT_STORE_CONSOLE_ENV]: BooleanText.False,
      [OBJECT_STORE_WEBSITE_ENV]: store.websiteDomain,
    },
    labels: {},
  };
}

export async function planFor(
  environment: StackEnvironment,
  root: string = Text.Empty,
  image: string = Text.Empty,
): Promise<StackPlan> {
  const checked = StackEnvironmentSchema.parse(environment);
  const applications = await all(
    checked.developmentApps.map((app) => async () => developmentContainer(checked, root, app)),
  );
  return StackPlanSchema.parse({
    environment: environment.name,
    networks: [
      { name: await nameOf(environment, StackNetwork.Edge), internal: false },
      {
        name: await nameOf(environment, StackNetwork.Backend),
        internal: true,
        subnet: environment.backend.subnet,
      },
    ],
    folders: await dataFoldersOf(environment, root),
    containers: [
      await proxyContainer(environment, root),
      await apiContainer(environment, root, image),
      ...applications,
      ...(checked.objectStore === undefined
        ? []
        : [await objectStoreContainer(checked, root, checked.objectStore)]),
      ...(environment.identity === undefined
        ? []
        : [await dexContainer(environment, environment.identity)]),
    ],
  });
}
