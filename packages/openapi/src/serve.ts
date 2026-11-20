import { EndpointPath } from "@platform/constants";
import { lazy } from "@platform/store";
import type { CapabilitySource, OpenApiOptions } from "@platform/types";
import { Hono } from "hono";
import { generateOpenApi } from "./generate.ts";

export async function openApiApp(source: CapabilitySource, options: OpenApiOptions): Promise<Hono> {
  const document = lazy(async () => generateOpenApi(await source.list(), options));
  const app = new Hono();
  app.get(EndpointPath.OpenApi, async (context) => context.json(await document()));
  return app;
}
