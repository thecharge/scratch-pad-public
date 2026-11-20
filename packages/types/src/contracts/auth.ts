import type { AuthProviderKind } from "@platform/constants";
import type { JWTVerifyGetKey } from "jose";
import type { ProtectedResourceMetadata } from "../auth/metadata.ts";
import type { AuthInfo } from "../auth/principal.ts";

export interface AuthProvider {
  readonly kind: AuthProviderKind;
  verify(token: string): Promise<AuthInfo>;
  resourceMetadata(): Promise<ProtectedResourceMetadata>;
}

export interface AuthOptions {
  enabled: boolean;
  provider?: AuthProvider | undefined;
}

export interface JwksProviderOptions {
  issuer: string;
  audience: string;
  resource: string;
  jwksUrl?: string;
  keys?: JWTVerifyGetKey;
  scopesSupported?: string[];
  kind?: AuthProviderKind;
}
