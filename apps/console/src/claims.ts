import {
  BASE64_DASH,
  BASE64_UNDERSCORE,
  PLUS,
  Scope,
  Separator,
  SLASH,
  Text,
} from "@platform/constants";
import { type TokenClaims, TokenClaimsSchema } from "@platform/types";

const PAYLOAD_INDEX = 1;

function decode(payload: string): unknown {
  try {
    const standard = payload.replace(BASE64_DASH, PLUS).replace(BASE64_UNDERSCORE, SLASH);
    return JSON.parse(atob(standard));
  } catch {
    return undefined;
  }
}

export function claimsOf(token: string | undefined): TokenClaims {
  const payload = token?.split(Separator.FieldPath)[PAYLOAD_INDEX];
  if (payload === undefined) {
    return {};
  }
  const parsed = TokenClaimsSchema.safeParse(decode(payload));
  return parsed.success ? parsed.data : {};
}

export function hasAdminScope(token: string | undefined): boolean {
  const scopes = (claimsOf(token).scope ?? Text.Empty).split(Separator.Space);
  return scopes.includes(Scope.Admin);
}
