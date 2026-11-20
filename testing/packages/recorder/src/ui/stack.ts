import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApi } from "@platform/api/app";
import { createJwksProvider } from "@platform/auth";
import { LOOPBACK_NAME, LOOPBACK_ORIGIN } from "@platform/config/urls";
import {
  ADMIN_BEARER_SCOPES,
  AuthScheme,
  BetterAuthPath,
  BUILD_TIMEOUT_MS,
  CONSOLE_BUILD_LABEL,
  CONSOLE_DIST_PREFIX,
  Glyph,
  HttpHeader,
  INDEX_FILE,
  INDEX_PATH,
  McpEra,
  MediaType,
  RepoPath,
  Runner,
  StdioMode,
  Text,
  UI_DOMAIN,
  VITE_BUILD_ARGS,
  VITE_EMPTY_FLAG,
} from "@platform/constants";
import {
  createTestIssuer,
  createTickClock,
  isolatedDatabasePath,
  tokenFor,
} from "@platform/test-framework";
import { all } from "@platform/util";
import { withDeadline } from "../deadline.ts";
import { REPO_ROOT } from "../repo.ts";
import { stubAuthApp } from "../stub-auth.ts";
import { PORTS } from "./ports.ts";

const ORIGIN_PREFIX = [LOOPBACK_ORIGIN, Glyph.Colon].join(Text.Empty);

export function staticServer(directory: string, port: number) {
  return Bun.serve({
    port,
    fetch: async (request) => {
      const path = new URL(request.url).pathname;
      const candidates = [path, [path, INDEX_FILE].join(Text.Empty), INDEX_PATH];
      const files = candidates
        .filter((candidate) => candidate.includes(Glyph.Dot))
        .map((candidate) => Bun.file(join(directory, candidate)));
      const present = await all(files.map((file) => async () => file.exists()));
      const hit = files.find((_file, index) => present[index]);
      return hit === undefined ? new Response(undefined, { status: 404 }) : new Response(hit);
    },
  });
}

export async function buildConsole(
  apiOrigin: string,
  source: string = join(REPO_ROOT, RepoPath.ConsoleApp),
): Promise<string> {
  const outDir = await mkdtemp(join(tmpdir(), CONSOLE_DIST_PREFIX));
  const child = Bun.spawn([Runner.Bunx, ...VITE_BUILD_ARGS, outDir, VITE_EMPTY_FLAG], {
    cwd: source,
    env: { ...Bun.env, VITE_API_ORIGIN: apiOrigin },
    stdout: StdioMode.Ignore,
    stderr: StdioMode.Ignore,
  });
  await withDeadline(child.exited, CONSOLE_BUILD_LABEL, BUILD_TIMEOUT_MS, async () => {
    child.kill();
  });
  return outDir;
}

export async function startStack(scopes: readonly string[], consoleDist: string) {
  const api = [ORIGIN_PREFIX, PORTS.api].join(Text.Empty);
  const consoleOrigin = [ORIGIN_PREFIX, PORTS.console].join(Text.Empty);
  const issuer = await createTestIssuer([api, BetterAuthPath.Base].join(Text.Empty), api);
  const admin = (await tokenFor(issuer, ADMIN_BEARER_SCOPES)) as string;
  const granted = (await tokenFor(issuer, scopes)) as string;
  const provider = await createJwksProvider({
    issuer: issuer.issuer,
    audience: api,
    resource: api,
    keys: issuer.keys,
  });
  const app = await createApi({
    auth: { enabled: true, provider },
    authApp: stubAuthApp(granted),
    domain: UI_DOMAIN,
    resource: api,
    databasePath: isolatedDatabasePath(),
    era: McpEra.Stateless,
    host: LOOPBACK_NAME,
    allowedHosts: [LOOPBACK_NAME],
    allowedOrigins: [consoleOrigin],
    now: await createTickClock(),
  });
  const servers = [
    Bun.serve({ port: PORTS.api, fetch: (request) => app.fetch(request) }),
    staticServer(consoleDist, PORTS.console),
  ];
  const call = (method: string, path: string, body?: object) =>
    fetch([api, path].join(Text.Empty), {
      method,
      headers: {
        [HttpHeader.Authorization]: [AuthScheme.Bearer, admin].join(Glyph.Space),
        [HttpHeader.Accept]: MediaType.Json,
        [HttpHeader.ContentType]: MediaType.Json,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return {
    api,
    consoleOrigin,
    call,
    stop: async () => {
      await all(servers.map((server) => async () => server.stop(true)));
    },
  };
}

export async function discardBuild(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
}
