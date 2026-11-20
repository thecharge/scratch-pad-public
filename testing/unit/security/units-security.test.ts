import { expect } from "bun:test";
import { HttpHeader, MediaType } from "@platform/constants";
import { originValidation, proxyMarker, securityHeaders } from "@platform/security";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { settlesAs } from "@platform/test-framework";
import { Context } from "hono";

const PAGE = "https://api.test/x";
const ALLOWED = "https://app.example.com";
const FOREIGN = "https://evil.example.com";
const OPTIONS = { allowedOrigins: [ALLOWED], domain: "api.test" };

const JSON_FORBIDDEN = expect.objectContaining({
  status: 403,
  headers: expect.objectContaining({ [HttpHeader.ContentType]: MediaType.Json }),
});

const contextFor = (headers: HeadersInit = {}) => new Context(new Request(PAGE, { headers }));
const proceed = async () => undefined;
const failing = async () => {
  throw new Error("downstream failed");
};
const tracker = () => {
  const calls = { next: 0 };
  return {
    calls,
    next: async () => {
      calls.next += 1;
    },
  };
};

const secured = contextFor();
const framed = contextFor();
const banner = contextFor();
const throwing = contextFor();

unit(securityHeaders, {
  positive: [
    positive(
      "sets nosniff",
      [],
      settlesAs(() => secured.res.headers.get("x-content-type-options"), "nosniff"),
      [secured, proceed],
    ),
    positive(
      "sets frame denial",
      [],
      settlesAs(() => framed.res.headers.get("x-frame-options"), "DENY"),
      [framed, proceed],
    ),
  ],
  negative: [
    rejected(
      "sets no server banner",
      [],
      settlesAs(() => banner.res.headers.get("x-powered-by"), null),
      [banner, proceed],
    ),
    negative("a failing downstream handler propagates", [], { message: "downstream failed" }, [
      throwing,
      failing,
    ]),
  ],
});

const open = tracker();
const listed = tracker();
const foreign = tracker();
const empty = tracker();

unit(originValidation, {
  positive: [
    positive(
      "a request without an origin proceeds",
      [OPTIONS],
      settlesAs(() => open.calls.next, 1),
      [contextFor(), open.next],
    ),
    positive(
      "a listed origin proceeds",
      [OPTIONS],
      settlesAs(() => listed.calls.next, 1),
      [contextFor({ [HttpHeader.Origin]: ALLOWED }), listed.next],
    ),
  ],
  negative: [
    rejected("a foreign origin is answered 403 as JSON", [OPTIONS], JSON_FORBIDDEN, [
      contextFor({ [HttpHeader.Origin]: FOREIGN }),
      foreign.next,
    ]),
    rejected(
      "an empty allow list refuses every origin",
      [{ ...OPTIONS, allowedOrigins: [] }],
      expect.objectContaining({ status: 403 }),
      [contextFor({ [HttpHeader.Origin]: ALLOWED }), empty.next],
    ),
  ],
});

const SECRET = "the-proxy-secret-used-only-in-tests";
const MARKER = { secret: SECRET, domain: "api.test" };
const marked = tracker();
const markedAgain = tracker();
const unmarked = tracker();
const wrong = tracker();

unit(proxyMarker, {
  positive: [
    positive(
      "a request with the secret proceeds",
      [MARKER],
      settlesAs(() => marked.calls.next, 1),
      [contextFor({ [HttpHeader.ProxyMarker]: SECRET }), marked.next],
    ),
    positive(
      "the same secret proceeds again",
      [MARKER],
      settlesAs(() => markedAgain.calls.next, 1),
      [contextFor({ [HttpHeader.ProxyMarker]: SECRET }), markedAgain.next],
    ),
  ],
  negative: [
    rejected("a request without the marker is 403 as JSON", [MARKER], JSON_FORBIDDEN, [
      contextFor(),
      unmarked.next,
    ]),
    rejected("a wrong marker is 403 as JSON", [MARKER], JSON_FORBIDDEN, [
      contextFor({ [HttpHeader.ProxyMarker]: `${SECRET}x` }),
      wrong.next,
    ]),
  ],
});
