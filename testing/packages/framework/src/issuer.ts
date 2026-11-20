import { TEST_AUDIENCE, TEST_ISSUER } from "@platform/config/urls";
import { ClaimName, JwtAlgorithm, Separator } from "@platform/constants";
import type { IssueOptions, TestIssuer } from "@platform/types";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";

const DEFAULT_LIFETIME_SECONDS = 300;

function expiry(options: IssueOptions): number {
  return Math.floor(Date.now() / 1000) + (options.expiresInSeconds ?? DEFAULT_LIFETIME_SECONDS);
}

export async function createTestIssuer(
  issuer = TEST_ISSUER,
  audience = TEST_AUDIENCE,
): Promise<TestIssuer> {
  const { publicKey, privateKey } = await generateKeyPair(JwtAlgorithm.EdDSA, {
    extractable: true,
  });
  const keyId = crypto.randomUUID();
  const publicJwk = { ...(await exportJWK(publicKey)), kid: keyId, alg: JwtAlgorithm.EdDSA };
  const jwks = { keys: [publicJwk] };

  return {
    issuer,
    audience,
    jwks,
    keys: createLocalJWKSet(jwks),
    async issue(options = {}) {
      const jwt = new SignJWT({
        [ClaimName.Scope]: (options.scopes ?? []).join(Separator.Space),
        ...(options.claims ?? {}),
      })
        .setProtectedHeader({ alg: JwtAlgorithm.EdDSA, kid: keyId })
        .setIssuer(options.issuer ?? issuer)
        .setAudience(options.audience ?? audience)
        .setIssuedAt()
        .setSubject(options.subject ?? "user-1");
      return (options.noExpiry === true ? jwt : jwt.setExpirationTime(expiry(options))).sign(
        privateKey,
      );
    },
  };
}
