import { Scope } from "@platform/constants";
import type { TestIssuer } from "@platform/types";

export const READER_SCOPES: readonly string[] = [Scope.Read];
export const WRITER_SCOPES: readonly string[] = [Scope.Read, Scope.Write];
export const ADMIN_SCOPES: readonly string[] = [Scope.Read, Scope.Write, Scope.Admin];

export async function tokenFor(
  issuer: TestIssuer,
  scopes: readonly string[],
): Promise<string | undefined> {
  return scopes.length === 0 ? undefined : issuer.issue({ scopes: [...scopes] });
}
