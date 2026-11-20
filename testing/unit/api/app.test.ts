import { expect } from "bun:test";
import { DEFAULT_ERROR_DOMAIN, LOOPBACK_ORIGIN } from "@platform/config/urls";
import {
  BetterAuthPath,
  EndpointPath,
  HttpHeader,
  HttpMethod,
  McpEra,
  PathSegment,
} from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import type { ApiAppOptions } from "@platform/types";
import { createApi } from "../../../apps/api/src/app.ts";

const FOREIGN_ORIGIN = `${LOOPBACK_ORIGIN}.invalid`;
const AUTH_PROBE = "auth app answered";
const authApp = { fetch: async () => new Response(AUTH_PROBE) };

function options(overrides: Partial<ApiAppOptions> = {}): ApiAppOptions {
  return {
    auth: { enabled: false },
    domain: DEFAULT_ERROR_DOMAIN,
    resource: LOOPBACK_ORIGIN,
    databasePath: PathSegment.InMemoryDatabase,
    era: McpEra.Stateless,
    host: "localhost",
    allowedHosts: ["localhost"],
    allowedOrigins: [],
    ...overrides,
  };
}

function request(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`${LOOPBACK_ORIGIN}${path}`, { method: HttpMethod.Get, headers });
}

const DOCUMENT = expect.objectContaining({ openapi: expect.any(String) });
const SERVED = expect.objectContaining({ status: 200, body: DOCUMENT });
const CORS = expect.objectContaining({
  "access-control-allow-origin": LOOPBACK_ORIGIN,
});
const SERVED_WITH_CORS = expect.objectContaining({
  status: 200,
  body: DOCUMENT,
  headers: CORS,
});
const DENIED = expect.objectContaining({
  status: "PERMISSION_DENIED",
  message: expect.stringContaining(FOREIGN_ORIGIN),
});
const DENIED_BODY = { error: DENIED };
const REFUSED = expect.objectContaining({ status: 403, body: DENIED_BODY });
const MISSING_BODY = { error: expect.objectContaining({ status: "NOT_FOUND" }) };
const MISSING = expect.objectContaining({ status: 404, body: MISSING_BODY });
const MOUNTED = expect.objectContaining({ status: 200, body: AUTH_PROBE });

unit(createApi, {
  positive: [
    positive("the generated document is served", [options()], SERVED, [
      "fetch",
      request(EndpointPath.OpenApi),
    ]),
    positive(
      "the better-auth application is mounted when one is given",
      [options({ authApp })],
      MOUNTED,
      ["fetch", request(BetterAuthPath.Base + BetterAuthPath.Jwks)],
    ),
    positive(
      "an allowed origin is answered with its cors header",
      [options({ allowedOrigins: [LOOPBACK_ORIGIN] })],
      SERVED_WITH_CORS,
      ["fetch", request(EndpointPath.OpenApi, { [HttpHeader.Origin]: LOOPBACK_ORIGIN })],
    ),
    positive(
      "the metrics are asked for the same way as the statistics and need a token",
      [options()],
      expect.objectContaining({ status: 401 }),
      ["fetch", request(EndpointPath.Metrics)],
    ),
  ],
  negative: [
    rejected(
      "a foreign origin is refused before any route runs",
      [options({ allowedOrigins: [LOOPBACK_ORIGIN] })],
      REFUSED,
      ["fetch", request(EndpointPath.OpenApi, { [HttpHeader.Origin]: FOREIGN_ORIGIN })],
    ),
    rejected("an unknown route is answered as not found", [options()], MISSING, [
      "fetch",
      request("/v1/nothing/here"),
    ]),
    negative("options without the allowed origins are refused", [{}], { name: "TypeError" }),
  ],
});
