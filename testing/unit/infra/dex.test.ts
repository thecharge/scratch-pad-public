import { expect } from "bun:test";
import { negative, positive, seen, unit } from "@platform/test-factories";
import type { IdentityEnvironment } from "@platform/types";
import { dexIssuerOf, renderDexConfig } from "../../../apps/infra/src/dex.ts";

const IDENTITY: IdentityEnvironment = {
  image: "image",
  alias: "dex",
  port: 5556,
  path: "/dex",
  clientId: "client",
  clientSecret: "client-secret",
  email: "admin@example.test",
  passwordHash: "hash",
  groups: ["admin", "ops"],
};
const WITHOUT_ALIAS = { ...IDENTITY, alias: undefined } as never;
const HTTP = "http://";
const lines = (text: unknown) => String(text).split("\n");

unit(dexIssuerOf, {
  positive: [
    positive("joins the scheme, alias, port and path", [IDENTITY, HTTP], "http://dex:5556/dex"),
    positive("another scheme gives another issuer", [IDENTITY, "https://"], "https://dex:5556/dex"),
  ],
  negative: [
    negative("needs the identity", [undefined, HTTP], { name: "ZodError" }),
    negative("refuses an identity without an alias", [WITHOUT_ALIAS, HTTP], { name: "ZodError" }),
  ],
});

unit(renderDexConfig, {
  positive: [
    positive(
      "names the issuer and the port",
      [IDENTITY, HTTP],
      seen(lines, expect.arrayContaining(["issuer: http://dex:5556/dex", "  http: 0.0.0.0:5556"])),
    ),
    positive(
      "enables the password grant and the groups of the user",
      [IDENTITY, HTTP],
      seen(
        lines,
        expect.arrayContaining(["  passwordConnector: local", '    groups: ["admin","ops"]']),
      ),
    ),
  ],
  negative: [
    negative("refuses an identity without an alias", [WITHOUT_ALIAS, HTTP], { name: "ZodError" }),
    negative("needs the identity", [undefined, HTTP], { name: "ZodError" }),
  ],
});
