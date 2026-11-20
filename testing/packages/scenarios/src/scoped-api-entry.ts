import { join } from "node:path";
import { createApi } from "@platform/api/app";
import { createJwksProvider } from "@platform/auth";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { createTickClock } from "@platform/test-framework";
import { createLocalJWKSet } from "jose";
import { startApi } from "../../../../apps/api/src/main.ts";
import { stubAuthApp } from "./stub-auth.ts";

const keys = createLocalJWKSet(JSON.parse(Bun.env.TEST_JWKS ?? "{}"));
const runtime = await startApi(
  Bun.env,
  async (config) => ({
    provider: await createJwksProvider({
      issuer: config.auth.issuer ?? "",
      audience: config.auth.audience ?? "",
      resource: config.auth.resource,
      keys,
    }),
  }),
  async (options) => {
    const directory = Bun.env.TEST_UI_DIST;
    const app = await createApi({
      ...options,
      ...(directory === undefined
        ? {}
        : {
            authApp: stubAuthApp(Bun.env.TEST_UI_TOKEN ?? ""),
            allowedOrigins: [TEST_PROXY_ORIGIN],
          }),
      reindexStepMs: Number(Bun.env.TEST_REINDEX_STEP_MS ?? "0"),
      ...(Bun.env.TEST_FIXED_CLOCK === "true" ? { now: await createTickClock() } : {}),
    });
    return {
      fetch: async (request) => {
        const path = new URL(request.url).pathname;
        const staticPath = path === "/" || path.startsWith("/assets/") || path === "/favicon.ico";
        if (directory === undefined || !staticPath) return app.fetch(request);
        const file = Bun.file(join(directory, path === "/" ? "index.html" : path));
        return (await file.exists())
          ? new Response(file)
          : new Response(undefined, { status: 404 });
      },
    };
  },
);
await runtime.announce();
process.once("SIGTERM", async () => {
  await runtime.stop();
  process.exit(0);
});
