import { expect } from "bun:test";
import "@platform/test-framework/dom";
import { LOOPBACK_ORIGIN } from "@platform/config/urls";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { claimsOf, hasAdminScope } from "../../../apps/console/src/claims.ts";
import { cn } from "../../../apps/console/src/lib/utils.ts";
import { parseFrames } from "../../../apps/console/src/live-provider.ts";
import { authorizeUrl, exchangeCode } from "../../../apps/console/src/pkce.ts";

const token = (payload: object) => ["h", btoa(JSON.stringify(payload)), "s"].join(".");
const CONFIG = { apiOrigin: LOOPBACK_ORIGIN, clientId: "console", redirectUri: LOOPBACK_ORIGIN };
const PKCE = { verifier: "v", challenge: "c", state: "s" };
const answering = (body: unknown) => async () => new Response(JSON.stringify(body));

unit(claimsOf, {
  positive: [
    positive("reads scope and subject", [token({ scope: "read admin", sub: "u1" })], {
      scope: "read admin",
      sub: "u1",
    }),
    positive("a token with other claims keeps the known ones", [token({ sub: "u2", extra: 1 })], {
      sub: "u2",
    }),
  ],
  negative: [
    rejected("no token has no claims", [undefined], {}),
    rejected("a token without a payload has no claims", ["only-one-part"], {}),
    rejected("a payload that is not JSON has no claims", ["h.@@@.s"], {}),
    rejected("a payload of the wrong shape has no claims", [token({ scope: 5 })], {}),
  ],
});

unit(hasAdminScope, {
  positive: [
    positive("admin among the scopes", [token({ scope: "read admin" })], true),
    positive("admin alone", [token({ scope: "admin" })], true),
  ],
  negative: [
    rejected("read scope only", [token({ scope: "read" })], false),
    rejected("no scope claim", [token({ sub: "u" })], false),
    rejected("no token", [undefined], false),
  ],
});

unit(parseFrames, {
  positive: [
    positive("two complete frames", ['data: {"a":1}\n\ndata: {"b":2}\n\n'], {
      events: ['{"a":1}', '{"b":2}'],
      rest: "",
    }),
    positive("a partial frame is kept as the rest", ['data: {"a":1}\n\ndata: {"b"'], {
      events: ['{"a":1}'],
      rest: 'data: {"b"',
    }),
  ],
  negative: [
    rejected("an empty buffer has nothing", [""], { events: [], rest: "" }),
    rejected("lines that are not data are skipped", [": ping\n\n"], { events: [], rest: "" }),
  ],
});

unit(authorizeUrl, {
  positive: [
    positive(
      "points at the authorize path of the API",
      [CONFIG, PKCE],
      expect.stringContaining("/api/auth/mcp/authorize?"),
    ),
    positive(
      "carries the challenge and the state",
      [CONFIG, PKCE],
      expect.stringContaining("code_challenge=c&"),
    ),
  ],
  negative: [
    rejected(
      "asks for the S256 method",
      [CONFIG, PKCE],
      expect.stringContaining("code_challenge_method=S256"),
    ),
    negative(
      "an API origin that is not a URL throws",
      [{ ...CONFIG, apiOrigin: "not a url" }, PKCE],
      { name: "TypeError" },
    ),
  ],
});

unit(exchangeCode, {
  positive: [
    positive(
      "returns the access token",
      [CONFIG, "code", "verifier", answering({ access_token: "tok" })],
      "tok",
    ),
    positive(
      "ignores other fields",
      [CONFIG, "code", "verifier", answering({ access_token: "t2", scope: "x" })],
      "t2",
    ),
  ],
  negative: [
    negative("a response without a token throws", [CONFIG, "code", "verifier", answering({})], {
      name: "ZodError",
    }),
    negative(
      "a token of the wrong type throws",
      [CONFIG, "code", "verifier", answering({ access_token: 5 })],
      { name: "ZodError" },
    ),
  ],
});

unit(cn, {
  positive: [
    positive("joins class names", ["a", "b"], "a b"),
    positive("the later tailwind class wins", ["p-2", "p-4"], "p-4"),
  ],
  negative: [
    rejected("falsy values are dropped", ["a", false, undefined, null], "a"),
    rejected("nothing gives the empty text", [], ""),
  ],
});
