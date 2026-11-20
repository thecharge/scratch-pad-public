import type { JSONWebKeySet, JWTVerifyGetKey } from "jose";
import type { IssueOptions } from "../test-support.ts";
import type { AuthProvider } from "./auth.ts";
import type { HttpApp } from "./http.ts";

export interface TestIssuer {
  issuer: string;
  audience: string;
  jwks: JSONWebKeySet;
  keys: JWTVerifyGetKey;
  issue(options?: IssueOptions): Promise<string>;
}

export interface DocsAuthSetup {
  issuer: TestIssuer;
  provider: AuthProvider;
  authApp?: HttpApp;
}
