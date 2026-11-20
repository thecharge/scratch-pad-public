import { join } from "node:path";
import { FACTUAL_URLS_FILE, MessageId, RepoPath, Separator, Surface } from "@platform/constants";
import { message } from "@platform/messages";
import {
  type DocsUrls,
  FactualUrlsFileSchema,
  type SurfaceUrls,
  SurfaceUrlsSchema,
} from "@platform/types";
import { LOCAL_URLS } from "./urls.ts";

const FACTUAL_PATH = join(import.meta.dir, RepoPath.ParentDir, FACTUAL_URLS_FILE);

export async function loadFactualUrls(path: string = FACTUAL_PATH): Promise<SurfaceUrls> {
  const text = await Bun.file(path).text();
  const parsed = SurfaceUrlsSchema.safeParse(FactualUrlsFileSchema.parse(JSON.parse(text)));
  if (!parsed.success) {
    const missing = Object.values(Surface).filter((surface) =>
      parsed.error.issues.some((issue) => issue.path[0] === surface),
    );
    throw new Error(
      message(MessageId.FactualUrlMissing, { surfaces: missing.join(Separator.ListSpaced) }),
    );
  }
  return parsed.data;
}

export async function resolveDocsUrls(path: string = FACTUAL_PATH): Promise<DocsUrls> {
  const file = FactualUrlsFileSchema.parse(JSON.parse(await Bun.file(path).text()));
  const surfaces = Object.values(Surface);
  const set = surfaces.filter(
    (surface) => SurfaceUrlsSchema.shape[surface].safeParse(file[surface]).success,
  );
  const pick = async (surface: Surface) =>
    set.includes(surface) ? file[surface] : LOCAL_URLS[surface];
  return {
    urls: {
      console: await pick(Surface.Console),
      api: await pick(Surface.Api),
      mcp: await pick(Surface.Mcp),
      docs: await pick(Surface.Docs),
    },
    missing: surfaces.filter((surface) => !set.includes(surface)),
  };
}
