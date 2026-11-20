import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DOCS_CONTENT_DIR, MessageId } from "@platform/constants";
import type { recordSdkPages as recordSdkPagesType } from "@platform/kb-recorder";
import { message } from "@platform/messages";
import { startSdkProxyHarness } from "../../testing/packages/scenarios/src/sdk-proxy-fixtures.ts";
import { packSdk } from "./sdk-pack.ts";
import { REPO_ROOT } from "./tools.ts";

export async function generateSdkDocs(
  outputDir: string,
  record?: typeof recordSdkPagesType,
  pack: typeof packSdk = packSdk,
  start: typeof startSdkProxyHarness = startSdkProxyHarness,
): Promise<string[]> {
  const target = join(outputDir);
  const { recordSdkPages, sdkScenarios } = await import("@platform/kb-recorder");
  const packed = await pack();
  let proxy: Awaited<ReturnType<typeof start>> | undefined;
  try {
    proxy = await start(packed.tarball);
    return await (record ?? recordSdkPages)(
      sdkScenarios(),
      packed.tarball,
      target,
      proxy.connect,
      proxy.execute,
    );
  } finally {
    await closeSdkDocs(proxy, packed.directory);
  }
}

async function closeSdkDocs(
  proxy: Awaited<ReturnType<typeof startSdkProxyHarness>> | undefined,
  directory: string,
) {
  try {
    await proxy?.stop();
  } finally {
    await rm(dirname(directory), { recursive: true, force: true });
  }
}

export async function runGenerateSdkDocs(
  outputDir: string = join(REPO_ROOT, DOCS_CONTENT_DIR),
  generate: (outputDir: string) => Promise<string[]> = generateSdkDocs,
) {
  const pages = await generate(outputDir);
  console.log(message(MessageId.SdkDocsBuilt, { count: pages.length }));
  return 0;
}

if (import.meta.main) process.exit(await runGenerateSdkDocs());
