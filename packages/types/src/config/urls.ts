import { Surface } from "@platform/constants";
import { z } from "zod";

export const SurfaceUrlsSchema = z.object({
  console: z.url(),
  api: z.url(),
  mcp: z.url(),
  docs: z.url(),
});
export type SurfaceUrls = z.infer<typeof SurfaceUrlsSchema>;

export const FactualUrlsFileSchema = z.object({
  console: z.string(),
  api: z.string(),
  mcp: z.string(),
  docs: z.string(),
});
export type FactualUrlsFile = z.infer<typeof FactualUrlsFileSchema>;

export const DocsUrlsSchema = z.object({
  urls: SurfaceUrlsSchema,
  missing: z.array(z.enum(Surface)),
});
export type DocsUrls = z.infer<typeof DocsUrlsSchema>;
