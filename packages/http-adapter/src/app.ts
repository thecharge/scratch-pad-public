import { publicPath, routeFor, toWire } from "@platform/aip";
import { authMiddleware } from "@platform/auth";
import {
  ApiVersion,
  AuthVariable,
  CUSTOM_VERB_SEPARATOR,
  DEFAULT_HTTP_VERSION,
  HTTP_VERSION_PATTERN,
  HttpHeader,
  HttpStage,
  PathStyle,
  RouteOutcome,
  Separator,
  Text,
  TransportKind,
  VERB_PATH_SEGMENT,
} from "@platform/constants";
import { filterAsync, lazy } from "@platform/store";
import { drain, jsonResponse } from "@platform/streams";
import type {
  AuthEnv,
  AuthResolution,
  Capability,
  CapabilityContext,
  HttpApp,
  HttpAppOptions,
  RouteSpec,
} from "@platform/types";
import { all } from "@platform/util";
import { type Context, Hono } from "hono";
import { acceptsEvents, eventResponse } from "./events.ts";
import { requireAccept, requireContentType } from "./headers.ts";
import { buildInput } from "./input.ts";
import { measured } from "./measure.ts";
import { errorResponse, routingFailure } from "./respond.ts";
import { timed } from "./stages.ts";
import { matchRoute } from "./table.ts";

async function contextFor(options: HttpAppOptions, request: Request, resolution: AuthResolution) {
  const context: CapabilityContext = {
    principal: resolution.principal,
    requestId: request.headers.get(HttpHeader.RequestId) ?? crypto.randomUUID(),
    transport: TransportKind.Http,
    authEnabled: options.auth.enabled,
    signal: request.signal,
    ...(resolution.failure === undefined ? {} : { authFailure: resolution.failure }),
  };
  return context;
}

async function httpVersionOf(request: Request): Promise<string> {
  const via = request.headers.get(HttpHeader.Via) ?? Text.Empty;
  return HTTP_VERSION_PATTERN.exec(via)?.[1] ?? DEFAULT_HTTP_VERSION;
}

async function register(
  app: Hono<AuthEnv>,
  options: HttpAppOptions,
  capability: Capability,
  route: RouteSpec,
) {
  const path = await publicPath(route, capability.version, PathStyle.Router);
  const answer = async (honoContext: Context<AuthEnv>) => {
    const resolution = honoContext.get(AuthVariable.Resolution);
    const challenge = {
      domain: options.domain,
      resource: options.resource,
      tokenPresented: resolution.tokenPresented,
    };
    try {
      const request = honoContext.req.raw;
      await timed(options.stages, HttpStage.Negotiate, async () => {
        await requireAccept(request, capability);
        await requireContentType(request, route, capability);
      });
      const input = await timed(options.stages, HttpStage.Input, async () =>
        buildInput(request, route, capability.input, honoContext.req.param(), capability.media),
      );
      const context = await contextFor(options, request, resolution);
      const result = await timed(options.stages, HttpStage.Invoke, async () =>
        options.invoke(capability, input, context),
      );
      return await timed(options.stages, HttpStage.Respond, async () =>
        capability.events !== undefined && (await acceptsEvents(request))
          ? await eventResponse(capability, input, context, request)
          : await jsonResponse(200, await toWire(result.output)),
      );
    } catch (error) {
      await drain(honoContext.req.raw.body);
      return await errorResponse(error, challenge);
    }
  };
  app.on(route.method, path, async (honoContext) => {
    const started = performance.now();
    const response = await answer(honoContext);
    const firstByteMs = performance.now() - started;
    const form =
      (response.headers.get(HttpHeader.ContentType) ?? Text.Empty).split(Separator.Parameter)[0] ??
      Text.Empty;
    const version = await httpVersionOf(honoContext.req.raw);
    return await measured(response, options.streams, async (bytes) =>
      options.stages?.operation({
        capability: capability.id,
        form,
        version,
        status: response.status,
        elapsedMs: performance.now() - started,
        firstByteMs,
        bytes,
      }),
    );
  });
}

async function rewrite(request: Request, verb: string | undefined): Promise<Request> {
  if (verb === undefined) {
    return request;
  }
  const url = new URL(request.url);
  const at = url.pathname.lastIndexOf(CUSTOM_VERB_SEPARATOR);
  url.pathname = [url.pathname.slice(0, at), VERB_PATH_SEGMENT, verb].join(Separator.Resource);
  return new Request(url, request);
}

async function routesOf(
  capabilities: readonly Capability[],
  routes: readonly RouteSpec[],
  version: string | undefined,
): Promise<RouteSpec[]> {
  return routes.filter((_route, index) => capabilities[index]?.version === version);
}

async function build(options: HttpAppOptions) {
  const capabilities = await filterAsync(
    await options.source.list(),
    async (capability) => capability.onlyOver !== TransportKind.Mcp,
  );
  const routes = await all(capabilities.map((item) => async () => routeFor(item)));
  const app = new Hono<AuthEnv>();
  app.use(await authMiddleware(options.auth));
  for (const [index, capability] of capabilities.entries()) {
    await register(app, options, capability, routes[index] as RouteSpec);
  }
  return { app, routes, capabilities };
}

export async function createHttpApp(options: HttpAppOptions): Promise<HttpApp> {
  const built = lazy(() => build(options));
  return {
    async fetch(request) {
      const { app, routes, capabilities } = await built();
      const [, version, ...rest] = new URL(request.url).pathname.split(Separator.Resource);
      const challenge = {
        domain: options.domain,
        resource: options.resource,
        tokenPresented: false,
      };
      const known = Object.values<string>(ApiVersion).includes(version ?? Text.Empty);
      const match = known
        ? await timed(options.stages, HttpStage.Route, async () =>
            matchRoute(await routesOf(capabilities, routes, version), request.method, rest),
          )
        : { outcome: RouteOutcome.NotFound, allowed: [] };
      return match.outcome === RouteOutcome.Matched
        ? app.fetch(
            await timed(options.stages, HttpStage.Rewrite, async () =>
              rewrite(request, match.verb),
            ),
          )
        : await routingFailure(match, request, challenge);
    },
  };
}
