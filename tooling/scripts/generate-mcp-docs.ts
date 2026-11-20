import { join } from "node:path";
import { MCP_DOC_PATH, MCP_RECORD_PATH } from "@platform/constants";
import { RecordedPageSchema, type SurfaceUrls } from "@platform/types";

export async function generateMcpDocs(
  content: string,
  root: string,
  urls?: SurfaceUrls,
): Promise<boolean> {
  const file = Bun.file(join(root, MCP_RECORD_PATH));
  if (!(await file.exists())) return false;
  const page = RecordedPageSchema.parse(await file.json());
  if (page.results.length === 0) return false;
  const { assertPassed, toMdx, guidePage } = await import("@platform/kb-recorder");
  assertPassed(page.id, page.results);
  await Bun.write(join(content, MCP_DOC_PATH), toMdx(await guidePage(page), urls));
  return true;
}
