import type { StackDeps } from "@platform/types";

export function recordingDeps(
  failures: Readonly<Record<string, number>> = {},
  env: Readonly<Record<string, string | undefined>> = { PATH: "/usr/bin" },
  installCode = 0,
  outputs: Readonly<Record<string, string>> = {},
  watcherCode = 0,
) {
  const commands: string[] = [];
  const environments: Record<string, string>[] = [];
  const deps: StackDeps = {
    run: async (command, options) => {
      if (options?.env !== undefined) environments.push(options.env);
      const line = command.join(" ");
      commands.push(line);
      const hit = Object.entries(failures).find(([part]) => line.includes(part));
      return {
        exitCode: hit?.[1] ?? 0,
        stdout: Object.entries(outputs).find(([part]) => line.includes(part))?.[1] ?? "",
        stderr: hit === undefined ? "" : `${line} failed`,
      };
    },
    installBundles: async () => installCode,
    buildSites: async () => failures["static build"] ?? 0,
    publishSites: async () => failures["static publish"] ?? 0,
    checkWatchers: async (root) => {
      commands.push(`watchers ${root}`);
      return watcherCode;
    },
    wait: async () => undefined,
    root: "/work/repo",
    env,
    proxySecret: async () => TEST_PROXY_SECRET,
  };
  return { deps, commands, environments };
}

export function mentions(commands: readonly string[], ...parts: string[]): boolean {
  return parts.every((part) => commands.some((line) => line.includes(part)));
}

export const TEST_PROXY_SECRET = "the-proxy-secret-used-only-in-tests";
