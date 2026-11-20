import { environmentFor } from "@platform/config/environments";
import { CertificateSource, EnvironmentName } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { TEST_PROXY_SECRET } from "@platform/test-scenarios";
import { renderCaddyfile } from "../../../apps/infra/src/caddy.ts";

const INTERNAL = {
  host: "proxy",
  port: 8443,
  certificates: CertificateSource.Internal,
  published: [],
  secret: TEST_PROXY_SECRET,
};
const PUBLIC = {
  host: "api.example.test",
  port: 443,
  certificates: CertificateSource.Public,
  published: [],
  secret: TEST_PROXY_SECRET,
};
const NO_SECRET = { ...INTERNAL, secret: undefined };
const SHORT_SECRET = { ...INTERNAL, secret: "short" };
const NO_PORT = { ...INTERNAL, port: 0 };
const NO_HOST = { ...INTERNAL, host: "" };
const ZOD_ERROR = { name: "ZodError" };
const development = await environmentFor(EnvironmentName.Development, TEST_PROXY_SECRET);

const has =
  (...parts: string[]) =>
  (text: string) =>
    parts.every((part) => text.includes(part));
const lacks = (part: string) => (text: string) => !text.includes(part);

unit(renderCaddyfile, {
  positive: [
    positive(
      "routes the development sites and their API requests through the proxy",
      [INTERNAL, "10.91.1.10", 3000, development.developmentApps],
      seen(
        has(
          "console.localhost:8443 {",
          "docs.localhost:8443 {",
          "reverse_proxy 10.91.1.11:5173",
          "reverse_proxy 10.91.1.12:4321",
          "@api path /v1/* /mcp /mcp/*",
          "reverse_proxy 10.91.1.10:3000",
        ),
        true,
      ),
    ),
    positive(
      "omits development routes for the ordinary proxy",
      [INTERNAL, "api", 3000, []],
      seen(lacks("console.localhost"), true),
    ),
    positive(
      "serves the host and port with an internal certificate authority and the three protocols",
      [INTERNAL, "api", 3000],
      seen(
        has(
          "proxy:8443 {",
          "\ttls internal\n",
          "protocols h1 h2 h3",
          "reverse_proxy api:3000 {",
          "flush_interval -1",
          "versions 1.1",
          `header_up x-platform-proxy ${TEST_PROXY_SECRET}`,
        ),
        true,
      ),
    ),
    positive(
      "leaves the certificate to the public authority when the source is public",
      [PUBLIC, "api", 3000],
      seen(
        (text: string) => has("api.example.test:443 {")(text) && lacks("tls internal")(text),
        true,
      ),
    ),
  ],
  negative: [
    negative(
      "refuses a development app with an invalid port",
      [INTERNAL, "api", 3000, [{ ...development.developmentApps[0], port: 0 }]],
      ZOD_ERROR,
    ),
    negative(
      "refuses a development app without a command",
      [INTERNAL, "api", 3000, [{ ...development.developmentApps[0], command: [] }]],
      ZOD_ERROR,
    ),
    negative("refuses a port that is not positive", [NO_PORT, "api", 3000], ZOD_ERROR),
    negative("refuses a missing secret", [NO_SECRET, "api", 3000], ZOD_ERROR),
    negative("refuses a secret that is too short", [SHORT_SECRET, "api", 3000], ZOD_ERROR),
    negative("refuses an empty host", [NO_HOST, "api", 3000], ZOD_ERROR),
  ],
});
