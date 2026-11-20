import type { McpServer } from "@modelcontextprotocol/server";
import { defineCapability } from "@platform/capability";
import { ApiVersion, AuthMode, MethodKind } from "@platform/constants";
import type { Capability } from "@platform/types";
import { z } from "zod";
import { items } from "./stream-fixtures.ts";

function eventsPart(source?: () => Promise<AsyncIterable<unknown>>) {
  return source === undefined ? {} : { events: { name: "tick", source } };
}

export async function tickCapability(
  source?: () => Promise<AsyncIterable<unknown>>,
  auth: AuthMode = AuthMode.Required,
): Promise<Capability> {
  return defineCapability({
    id: "ticks.get",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: "ticks/{tick}",
    summary: "Get a tick",
    description: "Gets a tick.",
    auth,
    input: z.object({ name: z.string() }),
    output: z.object({ n: z.number() }),
    handler: async () => ({ n: 0 }),
    ...eventsPart(source),
  });
}

export async function oneTick(): Promise<AsyncIterable<unknown>> {
  return items({ n: 1 });
}

export function stubServer(failWith?: Error) {
  const calls: unknown[][] = [];
  const server = {
    registerResource: (...args: unknown[]) => {
      if (failWith !== undefined) {
        throw failWith;
      }
      calls.push(args);
    },
  } as unknown as McpServer;
  return { calls, server };
}

export const ZERO_RUNTIME = {
  process: {
    rssBytes: 0,
    heapTotalBytes: 0,
    heapUsedBytes: 0,
    externalBytes: 0,
    cpuUserMicros: 0,
    cpuSystemMicros: 0,
    eventLoopDelayMaxMs: 0,
    uptimeSeconds: 0,
    requestsInFlight: 0,
    startRssBytes: 0,
    openStreams: 0,
    runningOperations: 0,
    heapCollections: 0,
    heapFreedBytes: 0,
  },
  stages: {},
  operations: {},
};
