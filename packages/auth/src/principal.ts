import { AuthMode, ClaimName, PrincipalKind, Role, Scope, Separator } from "@platform/constants";
import {
  ANONYMOUS_PRINCIPAL,
  type AuthInfo,
  type JsonObject,
  type Principal,
} from "@platform/types";

const SCOPE_SPLIT = /\s+/;

async function asList(value: unknown, split: (text: string) => string[]): Promise<string[]> {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return value === undefined || value === null ? [] : split(String(value));
}

export async function scopesFromClaims(claims: JsonObject): Promise<string[]> {
  const scopes = await asList(claims[ClaimName.Scope], (text) =>
    text.trim().length === 0 ? [] : text.trim().split(SCOPE_SPLIT),
  );
  return scopes.length > 0 ? scopes : await asList(claims[ClaimName.ScopeList], () => []);
}

export async function rolesFromClaims(claims: JsonObject): Promise<string[]> {
  const named = await asList(claims[ClaimName.Roles] ?? claims[ClaimName.Role], (text) =>
    text
      .split(Separator.List)
      .map((role) => role.trim())
      .filter((role) => role.length > 0),
  );
  const grouped = await asList(claims[ClaimName.Groups], (text) =>
    text
      .split(Separator.List)
      .map((role) => role.trim())
      .filter((role) => role.length > 0),
  );
  return [...new Set([...named, ...grouped])];
}

export async function principalFromAuthInfo(info: AuthInfo): Promise<Principal> {
  const claims = info.extra ?? {};
  const roles = await rolesFromClaims(claims);
  const scopes = new Set(info.scopes);
  if (roles.includes(Role.Admin)) {
    scopes.add(Scope.Admin);
  }
  const subject = claims[ClaimName.Subject];
  return {
    kind:
      claims[ClaimName.PrincipalKind] === PrincipalKind.Agent
        ? PrincipalKind.Agent
        : PrincipalKind.User,
    ...(subject === undefined ? {} : { subject: String(subject) }),
    scopes: [...scopes],
    roles,
  };
}

export async function isCallable(
  mode: AuthMode,
  principal: Principal,
  authEnabled: boolean,
): Promise<boolean> {
  if (mode === AuthMode.Required) {
    return authEnabled && principal.kind !== ANONYMOUS_PRINCIPAL.kind;
  }
  return true;
}
