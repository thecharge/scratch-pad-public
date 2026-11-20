import {
  AuthProviderKind,
  DOCS_DOMAIN,
  DOCS_REINDEX_STEP_MS,
  HttpHeader,
  HttpMethod,
  MediaType,
  PROXY_FIXTURE_FLAGS_PATH,
  Text,
} from "@platform/constants";
import { createFlags } from "@platform/flags";
import { GREETING_SKILL_DIRS } from "@platform/test-custom-capability";
import { PACKAGE_SKILL_DIRS } from "@platform/test-framework";
import { proxyFixture } from "@platform/test-scenarios";
import type { Capability, FlagValues } from "@platform/types";

export async function startProxyDocsApi(
  enabled: boolean,
  databasePath: string,
  provider: AuthProviderKind = AuthProviderKind.Jwks,
  extras: readonly Capability[] = [],
  _proxySecret?: string,
) {
  const fixture = await proxyFixture({
    enabled,
    databasePath,
    docsProvider: provider,
    domain: DOCS_DOMAIN,
    customCapabilities: extras.length > 0,
    tickClock: true,
    reindexStepMs: DOCS_REINDEX_STEP_MS,
    skillDirs: [...PACKAGE_SKILL_DIRS, ...(extras.length === 0 ? [] : GREETING_SKILL_DIRS)],
  });
  const local = await createFlags();
  const flags = {
    enabled: async (key: string) => local.enabled(key),
    set: async (values: FlagValues) => {
      const response = await fetch([fixture.origin, PROXY_FIXTURE_FLAGS_PATH].join(Text.Empty), {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: MediaType.Json },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(await response.text());
      await local.set(values);
    },
  };
  return {
    issuer: fixture.issuer,
    flags,
    server: { origin: fixture.origin, stop: async () => undefined },
  };
}
