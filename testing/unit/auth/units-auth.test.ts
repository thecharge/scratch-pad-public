import { expect } from "bun:test";
import {
  challengeFor,
  isCallable,
  metadataPath,
  metadataUrl,
  missingTokenError,
  principalFromAuthInfo,
  rolesFromClaims,
  scopesFromClaims,
} from "@platform/auth";
import { LOOPBACK_ORIGIN } from "@platform/config/urls";
import {
  AuthMode,
  CanonicalCode,
  ErrorReason,
  PrincipalKind,
  Role,
  Scope,
} from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { ANONYMOUS_PRINCIPAL } from "@platform/types";

const RESOURCE = [LOOPBACK_ORIGIN, "/mcp"].join("");
const RESOURCE_SLASH = [LOOPBACK_ORIGIN, "/mcp/"].join("");
const USER = { kind: PrincipalKind.User, scopes: [], roles: [] };
const info = (extra: object, scopes: string[] = []) => ({
  token: "t",
  clientId: "c",
  scopes,
  extra,
});

unit(metadataPath, {
  positive: [
    positive(
      "the path follows the well-known prefix",
      [RESOURCE],
      "/.well-known/oauth-protected-resource/mcp",
    ),
    positive(
      "a trailing slash is trimmed",
      [RESOURCE_SLASH],
      "/.well-known/oauth-protected-resource/mcp",
    ),
  ],
  negative: [
    rejected(
      "a root resource has only the prefix",
      [LOOPBACK_ORIGIN],
      "/.well-known/oauth-protected-resource",
    ),
    negative("a resource that is not a URL throws", ["not a url"], { name: "TypeError" }),
  ],
});

unit(metadataUrl, {
  positive: [
    positive(
      "the URL uses the origin of the resource",
      [RESOURCE],
      [LOOPBACK_ORIGIN, "/.well-known/oauth-protected-resource/mcp"].join(""),
    ),
    positive(
      "a trailing slash is trimmed",
      [RESOURCE_SLASH],
      [LOOPBACK_ORIGIN, "/.well-known/oauth-protected-resource/mcp"].join(""),
    ),
  ],
  negative: [
    rejected(
      "a root resource",
      [LOOPBACK_ORIGIN],
      [LOOPBACK_ORIGIN, "/.well-known/oauth-protected-resource"].join(""),
    ),
    negative("a resource that is not a URL throws", ["nope"], { name: "TypeError" }),
  ],
});

unit(challengeFor, {
  positive: [
    positive(
      "no token names only the metadata",
      [RESOURCE, false],
      `Bearer resource_metadata="${[LOOPBACK_ORIGIN, "/.well-known/oauth-protected-resource/mcp"].join("")}"`,
    ),
    positive(
      "a bad token adds the invalid_token error",
      [RESOURCE, true],
      `Bearer resource_metadata="${[LOOPBACK_ORIGIN, "/.well-known/oauth-protected-resource/mcp"].join("")}", error="invalid_token"`,
    ),
  ],
  negative: [
    negative("a resource that is not a URL throws", ["nope", false], { name: "TypeError" }),
    negative("an empty resource throws", ["", true], { name: "TypeError" }),
  ],
});

unit(missingTokenError, {
  positive: [
    positive(
      "is UNAUTHENTICATED with TOKEN_MISSING",
      [],
      expect.objectContaining({
        code: CanonicalCode.Unauthenticated,
        reason: ErrorReason.TokenMissing,
      }),
    ),
    positive(
      "carries the message",
      [],
      expect.objectContaining({ message: "A bearer token is required." }),
    ),
  ],
  negative: [
    rejected(
      "is not an internal error",
      [],
      expect.not.objectContaining({ code: CanonicalCode.Internal }),
    ),
    rejected(
      "is not a permission error",
      [],
      expect.not.objectContaining({ code: CanonicalCode.PermissionDenied }),
    ),
  ],
});

unit(scopesFromClaims, {
  positive: [
    positive("a space separated scope claim", [{ scope: "read  write" }], ["read", "write"]),
    positive("a list in the scp claim", [{ scp: ["read", "admin"] }], ["read", "admin"]),
  ],
  negative: [
    rejected("a blank scope falls back to scp", [{ scope: "  ", scp: ["x"] }], ["x"]),
    rejected("no scope claims", [{}], []),
  ],
});

unit(rolesFromClaims, {
  positive: [
    positive("a roles list", [{ roles: ["admin", "editor"] }], ["admin", "editor"]),
    positive("a comma separated role claim", [{ role: "admin, editor" }], ["admin", "editor"]),
    positive(
      "the groups of an OpenID Connect provider are roles",
      [{ groups: ["admin"] }],
      ["admin"],
    ),
    positive("a comma separated group claim", [{ groups: "admin, ops" }], ["admin", "ops"]),
    positive(
      "roles and groups are joined without a repeat",
      [{ roles: ["admin"], groups: ["admin", "ops"] }],
      ["admin", "ops"],
    ),
  ],
  negative: [
    rejected("no roles", [{}], []),
    rejected("empty entries are dropped", [{ role: " , admin ," }], ["admin"]),
    rejected("an empty group list gives no role", [{ groups: [] }], []),
  ],
});

unit(principalFromAuthInfo, {
  positive: [
    positive("a user with a subject and scopes", [info({ sub: "u1" }, ["read"])], {
      kind: PrincipalKind.User,
      subject: "u1",
      scopes: ["read"],
      roles: [],
    }),
    positive("the admin role grants the admin scope", [info({ roles: [Role.Admin] }, ["read"])], {
      kind: PrincipalKind.User,
      scopes: ["read", Scope.Admin],
      roles: [Role.Admin],
    }),
  ],
  negative: [
    rejected("an agent claim makes an agent", [info({ principal_kind: "agent" })], {
      kind: PrincipalKind.Agent,
      scopes: [],
      roles: [],
    }),
    rejected("an unknown kind is a user", [info({ principal_kind: "robot" })], {
      kind: PrincipalKind.User,
      scopes: [],
      roles: [],
    }),
  ],
});

unit(isCallable, {
  positive: [
    positive(
      "a signed-in user may call a required capability",
      [AuthMode.Required, USER, true],
      true,
    ),
    positive(
      "an optional capability needs no sign-in",
      [AuthMode.Optional, ANONYMOUS_PRINCIPAL, false],
      true,
    ),
  ],
  negative: [
    rejected("auth off blocks a required capability", [AuthMode.Required, USER, false], false),
    rejected(
      "an anonymous caller is blocked",
      [AuthMode.Required, ANONYMOUS_PRINCIPAL, true],
      false,
    ),
  ],
});
