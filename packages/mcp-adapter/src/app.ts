import { createMcpHonoApp } from "@modelcontextprotocol/hono";
import {
  createMcpHandler,
  OAuthError,
  OAuthErrorCode,
  requireBearerAuth,
  type AuthInfo as SdkAuthInfo,
} from "@modelcontextprotocol/server";
import {
  isCallable,
  metadataUrl,
  missingTokenError,
  unauthenticatedResponse,
} from "@platform/auth";
import { EndpointPath, HonoVariable, HttpHeader, MountPath } from "@platform/constants";
import { lazy } from "@platform/store";
import {
  ANONYMOUS_PRINCIPAL,
  type AuthProvider,
  type McpAppOptions,
  McpTaskRequestSchema,
  ToolCallRequestSchema,
} from "@platform/types";
import { Hono } from "hono";
import { buildServer } from "./server.ts";
import { createMcpTaskRegistry } from "./tasks.ts";

async function bearerGate(provider: AuthProvider, resource: string) {
  const verifier = {
    verifyAccessToken: async (token: string) => {
      try {
        return (await provider.verify(token)) as SdkAuthInfo;
      } catch {
        throw new OAuthError(OAuthErrorCode.InvalidToken, provider.kind);
      }
    },
  };
  return requireBearerAuth({ verifier, resourceMetadataUrl: await metadataUrl(resource) });
}

async function callsProtectedTool(options: McpAppOptions, body: unknown): Promise<boolean> {
  if (McpTaskRequestSchema.safeParse(body).success) return true;
  const call = ToolCallRequestSchema.safeParse(body);
  if (!call.success) {
    return false;
  }
  const target = (await options.source.list()).find(
    (capability) => capability.id === call.data.params.name,
  );
  return (
    target !== undefined &&
    !(await isCallable(target.auth, ANONYMOUS_PRINCIPAL, options.auth.enabled))
  );
}

async function challengeAnonymous(options: McpAppOptions): Promise<Response> {
  return unauthenticatedResponse(await missingTokenError(), {
    domain: options.domain,
    resource: options.resource,
    tokenPresented: false,
  });
}

export async function createMcpApp(options: McpAppOptions): Promise<Hono> {
  const tasks = await createMcpTaskRegistry(options.source, options.invoke);
  const handler = lazy(async () => {
    const served = await createMcpHandler((context) => buildServer(options, context, tasks), {
      legacy: options.era,
    });
    await options.changes?.subscribe((uri) => served.notify.resourceUpdated(uri));
    return served;
  });
  const gate =
    options.auth.enabled && options.auth.provider !== undefined
      ? await bearerGate(options.auth.provider, options.resource)
      : undefined;
  const inner = createMcpHonoApp({
    host: options.host,
    allowedHosts: options.allowedHosts,
    allowedOrigins: options.allowedOrigins,
  });
  inner.all(MountPath.Root, async (context) => {
    const request = context.req.raw;
    const presented = request.headers.has(HttpHeader.Authorization);
    const verified = gate !== undefined && presented ? await gate(request) : undefined;
    if (verified instanceof Response) {
      return verified;
    }
    const parsedBody = context.get(HonoVariable.ParsedBody as never);
    if (!presented && options.auth.enabled && (await callsProtectedTool(options, parsedBody))) {
      return challengeAnonymous(options);
    }
    const served = await handler();
    return served.fetch(request, {
      ...(verified === undefined ? {} : { authInfo: verified }),
      parsedBody,
    });
  });
  const app = new Hono();
  app.route(EndpointPath.Mcp, inner);
  return app;
}
