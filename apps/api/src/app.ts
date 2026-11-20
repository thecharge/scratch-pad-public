import { OperationStore } from "@platform/aip";
import { protectedResourceMetadataApp } from "@platform/auth";
import { MemoryResponseCache } from "@platform/cache";
import {
  BetterAuthPath,
  EndpointPath,
  EXPOSITION_CONTENT_TYPE,
  HttpHeader,
  HttpMethod,
  MediaType,
  MountPath,
  OPENAPI_DEFAULT_TITLE,
  OPENAPI_DEFAULT_VERSION,
} from "@platform/constants";
import {
  ChangeFeed,
  EventBus,
  observerFor,
  RuntimeMetrics,
  renderExposition,
  StatsCollector,
} from "@platform/events";
import { createFlags } from "@platform/flags";
import { createHttpApp } from "@platform/http-adapter";
import { PathMasker } from "@platform/masking";
import { createMcpApp } from "@platform/mcp-adapter";
import { openApiApp } from "@platform/openapi";
import { createPipeline } from "@platform/pipeline";
import { allowedBy, DeclarativePolicyEngine, visibleTo } from "@platform/policy";
import { FixedWindowRateLimiter } from "@platform/ratelimit";
import { originValidation, proxyMarker, securityHeaders } from "@platform/security";
import { instrument, stageRecorder } from "@platform/telemetry";
import type {
  ApiAppOptions,
  Capability,
  HttpApp,
  PolicyGate,
  StatsSnapshot,
  VisibilityRule,
} from "@platform/types";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDeps } from "./deps.ts";
import { gateByFlag } from "./gate.ts";
import { createRegistry } from "./registry.ts";

async function clockDeps(now: () => Promise<Date>) {
  return { date: now, now: async () => (await now()).getTime() };
}

export async function createApi(options: ApiAppOptions): Promise<HttpApp> {
  const bus = new EventBus();
  const changes = new ChangeFeed();
  const operations = new OperationStore(
    options.domain,
    Date.now,
    (uri) => void changes.publish(uri),
  );
  const runtime = new RuntimeMetrics(async () => operations.running());
  const collector = new StatsCollector(bus, runtime);
  const policy = new DeclarativePolicyEngine();
  const visible: VisibilityRule = async (capability, principal) =>
    visibleTo(policy, capability, principal);
  const allowed: PolicyGate = async (block, principal) => allowedBy(policy, block, principal);
  const skillDirs = options.skillDirs ?? [];
  const references = new WeakMap<Capability, string>();
  const registry = await createRegistry(
    await createDeps(collector, options.databasePath, options.now, options.reindexStepMs),
    operations,
    async (source) => ({
      source,
      visible,
      allowed,
      authEnabled: options.auth.enabled,
      skillDirs,
      references,
    }),
    options.assets,
  );
  for (const extra of options.extraCapabilities ?? []) {
    await registry.register(extra.id, async () => extra);
  }
  const pipeline = await createPipeline({
    policy,
    masker: new PathMasker(),
    rateLimiter: new FixedWindowRateLimiter(),
    cache: new MemoryResponseCache(),
    events: bus,
    observer: await observerFor(bus, options.now),
    ...(options.now === undefined ? {} : await clockDeps(options.now)),
  });
  const flags = options.flags ?? (await createFlags());
  const gated = await gateByFlag(pipeline, flags);
  const invoke =
    options.telemetry === undefined ? gated : await instrument(gated, options.telemetry);
  const shared = {
    source: registry,
    invoke,
    auth: options.auth,
    domain: options.domain,
    resource: options.resource,
  };
  const exported =
    options.telemetry === undefined ? undefined : await stageRecorder(options.telemetry);
  const http = await createHttpApp({
    ...shared,
    streams: runtime,
    stages: {
      record: async (stage, elapsedMs) => {
        await runtime.record(stage, elapsedMs);
        await exported?.record(stage, elapsedMs);
      },
      operation: async (sample) => {
        await runtime.operation(sample);
        await exported?.operation(sample);
      },
    },
  });
  const root = new Hono();
  root.use(async (_context, next) => {
    await runtime.enter();
    try {
      await next();
    } finally {
      await runtime.leave();
    }
  });
  if (options.allowedOrigins.length > 0) {
    root.use(
      cors({
        origin: options.allowedOrigins,
        allowHeaders: [HttpHeader.Authorization, HttpHeader.ContentType, HttpHeader.RequestId],
        allowMethods: Object.values(HttpMethod),
        exposeHeaders: [HttpHeader.RetryAfter, HttpHeader.WwwAuthenticate],
      }),
    );
  }
  if (options.proxySecret !== undefined) {
    root.use(await proxyMarker({ secret: options.proxySecret, domain: options.domain }));
  }
  root.use(await securityHeaders());
  root.use(
    await originValidation({ allowedOrigins: options.allowedOrigins, domain: options.domain }),
  );
  root.route(
    MountPath.Root,
    await createMcpApp({
      ...shared,
      visible,
      allowed,
      skillDirs,
      era: options.era,
      host: options.host,
      allowedHosts: options.allowedHosts,
      allowedOrigins: options.allowedOrigins,
      changes,
    }),
  );
  root.route(
    MountPath.Root,
    await openApiApp(registry, { title: OPENAPI_DEFAULT_TITLE, version: OPENAPI_DEFAULT_VERSION }),
  );
  if (options.authApp !== undefined) {
    const authApp = options.authApp;
    root.all(BetterAuthPath.Mount, (context) => authApp.fetch(context.req.raw));
  }
  if (options.auth.provider !== undefined) {
    root.route(MountPath.Root, await protectedResourceMetadataApp(options.auth.provider));
  }
  root.get(EndpointPath.Metrics, async (context) => {
    const statsUrl = new URL(context.req.url);
    statsUrl.pathname = EndpointPath.Stats;
    const headers = new Headers(context.req.raw.headers);
    headers.set(HttpHeader.Accept, MediaType.Json);
    const answer = await http.fetch(new Request(statsUrl, { headers }));
    return answer.ok
      ? new Response(await renderExposition((await answer.json()) as StatsSnapshot), {
          headers: { [HttpHeader.ContentType]: EXPOSITION_CONTENT_TYPE },
        })
      : answer;
  });
  root.all(MountPath.CatchAll, (context) => http.fetch(context.req.raw));
  return { fetch: async (request) => root.fetch(request) };
}
