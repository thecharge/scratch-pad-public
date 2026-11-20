import { BetterAuthPath, HttpHeader, HttpMethod } from "@platform/constants";
import { type Context, Hono } from "hono";
import { cors } from "hono/cors";
import type { createBetterAuth } from "./create-auth.ts";

export async function betterAuthApp(
  auth: ReturnType<typeof createBetterAuth>,
  trustedOrigins: readonly string[],
): Promise<Hono> {
  const app = new Hono();
  app.use(
    BetterAuthPath.Mount,
    cors({
      origin: [...trustedOrigins],
      credentials: true,
      allowMethods: [HttpMethod.Get, HttpMethod.Post],
      allowHeaders: [HttpHeader.ContentType, HttpHeader.Authorization],
    }),
  );
  app.on([HttpMethod.Post, HttpMethod.Get], BetterAuthPath.Mount, (context: Context) =>
    auth.handler(context.req.raw),
  );
  return app;
}
