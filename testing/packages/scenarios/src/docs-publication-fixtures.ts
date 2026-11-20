import { rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import type { DocsPublicationManifest } from "@platform/types";
import { makeDir } from "./repo-fixtures.ts";

export async function docsPublicationFixture(mode = "ok", label = "first") {
  const root = await makeDir();
  const outside = await makeDir();
  const produce = async (workspace: string) => {
    await Bun.write(join(workspace, "apps/docs/src/content/docs/guide.md"), `${label} guide`);
    await Bun.write(join(workspace, "apps/docs/dist/index.html"), `${label} site`);
    await Bun.write(join(workspace, "docs/e2e/report.md"), `${label} report`);
    if (mode === "throw") throw new RangeError("deliberate browser refusal");
    if (mode === "code") return 7;
    if (mode === "symlink") await escapeSite(workspace, outside);
    return 0;
  };
  return { root, produce, outside };
}
async function escapeSite(workspace: string, outside: string) {
  const site = join(workspace, "apps/docs/dist/index.html");
  await rm(site);
  await Bun.write(join(outside, "index.html"), "foreign site");
  await symlink(join(outside, "index.html"), site);
}
export async function publicationAttempt(work: () => Promise<number>) {
  try {
    return { code: await work(), error: undefined };
  } catch (error) {
    return { code: undefined, error: String(error) };
  }
}

export async function corruptPublication(
  mode: string,
  site: string,
  outside: string,
  manifestPath: string,
  manifest: DocsPublicationManifest,
) {
  if (mode === "deleted") await rm(join(site, "index.html"));
  if (mode === "extra") await Bun.write(join(site, "unlisted.html"), "unlisted");
  if (mode === "duplicate") manifest.files.push(...manifest.files.slice(0, 1));
  if (mode === "escaped") Object.assign(manifest.files[0] ?? {}, { file: "site/../../foreign" });
  if (mode !== "manifest-link") return Bun.write(manifestPath, JSON.stringify(manifest));
  const foreign = join(outside, "manifest.json");
  await Bun.write(foreign, JSON.stringify(manifest));
  await rm(manifestPath);
  await symlink(foreign, manifestPath);
}
