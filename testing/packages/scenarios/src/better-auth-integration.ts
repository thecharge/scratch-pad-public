import { authMiddleware, protectedResourceMetadataApp } from "@platform/auth";
import {
  betterAuthApp,
  createBetterAuth,
  createBetterAuthProvider,
} from "@platform/auth-better-auth";
import { loadConfig } from "@platform/config";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { AuthVariable, EnvVar, Role } from "@platform/constants";
import { createDatabase, schema } from "@platform/db";
import { ApiError } from "@platform/errors";
import {
  type AuthEnv,
  BetterAuthAdminControlSchema,
  BetterAuthClientControlSchema,
  SignedTokenSchema,
} from "@platform/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

export async function betterAuthIntegration() {
  const config = await loadConfig({
    [EnvVar.AuthEnabled]: "true",
    [EnvVar.BetterAuthSecret]: "integration-test-secret-value-at-least-32-chars",
    [EnvVar.AuthResource]: TEST_PROXY_ORIGIN,
    [EnvVar.TrustedOrigins]: TEST_PROXY_ORIGIN,
  });
  const { db } = await createDatabase(":memory:");
  const auth = createBetterAuth(config.auth, db, schema, { emailAndPassword: true });
  const provider = await createBetterAuthProvider(auth, config.auth);
  const app = new Hono<AuthEnv>();
  app.route("/", await betterAuthApp(auth, config.auth.trustedOrigins));
  app.route("/", await protectedResourceMetadataApp(provider));
  app.use("/whoami", await authMiddleware({ enabled: true, provider }));
  app.get("/whoami", (context) =>
    context.body(JSON.stringify(context.get(AuthVariable.Principal))),
  );
  return { app, auth, provider, db, config };
}

async function dispatchAuthControl(
  fixture: Awaited<ReturnType<typeof betterAuthIntegration>>,
  action: string,
  request: Request,
) {
  if (action === "__admin") {
    const input = BetterAuthAdminControlSchema.parse(await request.json());
    fixture.db
      .update(schema.user)
      .set({ role: Role.Admin })
      .where(eq(schema.user.email, input.email))
      .run();
    return Response.json({ updated: true });
  }
  if (action === "__client") {
    const input = BetterAuthClientControlSchema.parse(await request.json());
    return Response.json(
      await fixture.auth.api.adminCreateOAuthClient({
        headers: new Headers({ cookie: input.cookie }),
        body: input.client as never,
      }),
    );
  }
  if (action === "__verify") {
    const input = SignedTokenSchema.parse(await request.json());
    return Response.json(await fixture.provider.verify(input.token));
  }
  if (action === "__metadata") return Response.json(await fixture.provider.resourceMetadata());
  return new Response(undefined, { status: 404 });
}

export async function authIntegrationControl(
  fixture: Awaited<ReturnType<typeof betterAuthIntegration>>,
  action: string,
  request: Request,
) {
  try {
    return await dispatchAuthControl(fixture, action, request);
  } catch (error) {
    const status = error instanceof ApiError ? error.httpStatus : 500;
    return Response.json({ message: String(error), httpStatus: status }, { status });
  }
}
