import { LOOPBACK_ADDRESS, loopbackOrigin } from "@platform/config/urls";
import type { HttpApp, RunningServer } from "@platform/types";

export async function startServer(app: HttpApp): Promise<RunningServer> {
  const server = Bun.serve({
    port: 0,
    hostname: LOOPBACK_ADDRESS,
    fetch: (request) => app.fetch(request),
  });
  return {
    origin: await loopbackOrigin(server.port),
    stop: async () => {
      await server.stop(true);
    },
  };
}

export async function freePort(): Promise<number> {
  const probe = Bun.serve({ port: 0, hostname: LOOPBACK_ADDRESS, fetch: () => new Response() });
  const port = probe.port ?? 0;
  await probe.stop(true);
  return port;
}
