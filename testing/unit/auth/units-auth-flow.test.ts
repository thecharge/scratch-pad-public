import { expect } from "bun:test";
import {
  authMiddleware,
  createJwksProvider,
  protectedResourceMetadataApp,
  resolveAuth,
  unauthenticatedResponse,
} from "@platform/auth";
import { LOOPBACK_ORIGIN, TEST_AUDIENCE, TEST_ISSUER } from "@platform/config/urls";
import {
  AuthVariable,
  CanonicalCode,
  ErrorReason,
  HttpHeader,
  MessageId,
  PrincipalKind,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { createTestIssuer } from "@platform/test-framework";
import { ANONYMOUS_PRINCIPAL } from "@platform/types";

const ISSUER = await createTestIssuer(TEST_ISSUER, TEST_AUDIENCE);
const FOREIGN = await createTestIssuer(TEST_ISSUER, TEST_AUDIENCE);
const RESOURCE = [LOOPBACK_ORIGIN, "/mcp"].join("");
const OPTIONS = {
  issuer: ISSUER.issuer,
  audience: ISSUER.audience,
  resource: RESOURCE,
  keys: ISSUER.keys,
};
const PROVIDER = await createJwksProvider(OPTIONS);
const READ_TOKEN = await ISSUER.issue({ scopes: ["read"], subject: "reader" });
const EXPIRED_TOKEN = await ISSUER.issue({ expiresInSeconds: -60 });
const FOREIGN_TOKEN = await FOREIGN.issue();
const bearer = (token: string) => new Headers({ [HttpHeader.Authorization]: `Bearer ${token}` });
const UNAUTHENTICATED = { code: CanonicalCode.Unauthenticated };
const EXPIRED = { ...UNAUTHENTICATED, reason: ErrorReason.TokenExpired };
const INVALID = { ...UNAUTHENTICATED, reason: ErrorReason.TokenInvalid };
const VERIFIED = expect.objectContaining({ scopes: ["read"] });
const METADATA = expect.objectContaining({
  resource: RESOURCE,
  authorization_servers: [TEST_ISSUER],
});
const ANONYMOUS_NO_TOKEN = { principal: ANONYMOUS_PRINCIPAL, tokenPresented: false };
const READER = expect.objectContaining({ kind: PrincipalKind.User, subject: "reader" });
const AUTHENTICATED = expect.objectContaining({ principal: READER, tokenPresented: true });
const FAILED = expect.objectContaining({
  principal: ANONYMOUS_PRINCIPAL,
  tokenPresented: true,
  failure: expect.objectContaining(UNAUTHENTICATED),
});

unit(createJwksProvider, {
  positive: [
    positive("a valid token is verified with its scopes", [OPTIONS], VERIFIED, [
      "verify",
      READ_TOKEN,
    ]),
    positive("the resource metadata names the issuer", [OPTIONS], METADATA, ["resourceMetadata"]),
  ],
  negative: [
    negative("an expired token is refused as expired", [OPTIONS], EXPIRED, [
      "verify",
      EXPIRED_TOKEN,
    ]),
    negative("a token signed by a foreign key is refused as invalid", [OPTIONS], INVALID, [
      "verify",
      FOREIGN_TOKEN,
    ]),
    negative(
      "options without keys or a key set url are a configuration error",
      [{ issuer: TEST_ISSUER, audience: TEST_AUDIENCE, resource: RESOURCE }],
      { messageId: MessageId.ConfigInvalid },
    ),
  ],
});

unit(resolveAuth, {
  positive: [
    positive(
      "a valid bearer token gives its principal",
      [bearer(READ_TOKEN), { enabled: true, provider: PROVIDER }],
      AUTHENTICATED,
    ),
    positive(
      "no token gives the anonymous principal",
      [new Headers(), { enabled: true, provider: PROVIDER }],
      ANONYMOUS_NO_TOKEN,
    ),
  ],
  negative: [
    rejected(
      "a token that cannot be verified is anonymous with a failure",
      [bearer(FOREIGN_TOKEN), { enabled: true, provider: PROVIDER }],
      FAILED,
    ),
    rejected(
      "a token is ignored while auth is off",
      [bearer(READ_TOKEN), { enabled: false, provider: PROVIDER }],
      ANONYMOUS_NO_TOKEN,
    ),
    rejected(
      "a token without a provider is ignored",
      [bearer(READ_TOKEN), { enabled: true }],
      ANONYMOUS_NO_TOKEN,
    ),
  ],
});

const MISSING_TOKEN = new ApiError(
  CanonicalCode.Unauthenticated,
  ErrorReason.TokenMissing,
  MessageId.TokenMissing,
);
const CHALLENGE = { domain: "api.test", resource: RESOURCE, tokenPresented: false };
const PRESENTED = { ...CHALLENGE, tokenPresented: true };
const CHALLENGED = expect.objectContaining({
  status: 401,
  headers: expect.objectContaining({
    [HttpHeader.WwwAuthenticate]: expect.stringContaining("resource_metadata="),
  }),
});
const INVALID_CHALLENGE = expect.objectContaining({
  headers: expect.objectContaining({
    [HttpHeader.WwwAuthenticate]: expect.stringContaining('error="invalid_token"'),
  }),
});
const PLAIN_CHALLENGE = expect.objectContaining({
  headers: expect.objectContaining({
    [HttpHeader.WwwAuthenticate]: expect.not.stringContaining("invalid_token"),
  }),
});
const ERROR_401 = expect.objectContaining({ error: expect.objectContaining({ code: 401 }) });
const BODY = expect.objectContaining({ body: ERROR_401 });

unit(unauthenticatedResponse, {
  positive: [
    positive(
      "the response is a 401 with a bearer challenge",
      [MISSING_TOKEN, CHALLENGE],
      CHALLENGED,
    ),
    positive("the body carries the error", [MISSING_TOKEN, CHALLENGE], BODY),
  ],
  negative: [
    rejected(
      "a presented token adds the invalid token error",
      [MISSING_TOKEN, PRESENTED],
      INVALID_CHALLENGE,
    ),
    rejected("an absent token adds no error", [MISSING_TOKEN, CHALLENGE], PLAIN_CHALLENGE),
  ],
});

const recorded = async () => {
  const calls: Array<[string, unknown]> = [];
  const req = { raw: { headers: bearer(READ_TOKEN) } };
  const set = (key: string, value: unknown) => calls.push([key, value]);
  return { calls, context: { req, set } };
};
const proceeding = await recorded();
const storing = await recorded();
const anonymous = await recorded();
const failing = await recorded();
const next = async () => undefined;
const SET_PRINCIPAL = (calls: Array<[string, unknown]>) =>
  calls.find(([key]) => key === AuthVariable.Principal)?.[1];

unit(authMiddleware, {
  positive: [
    positive(
      "a valid token sets the principal and continues",
      [{ enabled: true, provider: PROVIDER }],
      seen(() => SET_PRINCIPAL(proceeding.calls), READER),
      [proceeding.context, next],
    ),
    positive(
      "the resolution is stored for later handlers",
      [{ enabled: true, provider: PROVIDER }],
      seen(
        () => storing.calls.map(([key]) => key),
        [AuthVariable.Principal, AuthVariable.Resolution],
      ),
      [storing.context, next],
    ),
  ],
  negative: [
    rejected(
      "auth off leaves the anonymous principal",
      [{ enabled: false }],
      seen(() => SET_PRINCIPAL(anonymous.calls), ANONYMOUS_PRINCIPAL),
      [anonymous.context, next],
    ),
    negative(
      "a failing next handler surfaces its failure",
      [{ enabled: true, provider: PROVIDER }],
      { name: "RangeError" },
      [
        failing.context,
        async () => {
          throw new RangeError("downstream");
        },
      ],
    ),
  ],
});

const METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";
const SERVED = expect.objectContaining({
  status: 200,
  body: expect.objectContaining({ resource: RESOURCE }),
});
const NOT_SERVED = expect.objectContaining({ status: 404 });

unit(protectedResourceMetadataApp, {
  positive: [
    positive("the metadata is served at the well-known path", [PROVIDER], SERVED, [
      "request",
      METADATA_PATH,
    ]),
    positive(
      "the metadata names the issuer",
      [PROVIDER],
      expect.objectContaining({ body: METADATA }),
      ["request", METADATA_PATH],
    ),
  ],
  negative: [
    rejected("another path is not served", [PROVIDER], NOT_SERVED, ["request", "/other"]),
    rejected("the bare well-known path is not served", [PROVIDER], NOT_SERVED, [
      "request",
      "/.well-known/oauth-protected-resource",
    ]),
  ],
});
