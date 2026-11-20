import {
  DOCS_PUBLICATION_AUTOMATED,
  DOCS_PUBLICATION_PATH,
  DOCS_PUBLICATION_VERSION,
  PathSegment,
  Separator,
  VERIFICATION_HASH_PATTERN,
} from "@platform/constants";
import { z } from "zod";
export const DocsPublicationFileSchema = z.strictObject({
  file: z
    .string()
    .regex(DOCS_PUBLICATION_PATH)
    .refine((file) => !file.split(Separator.Resource).includes(PathSegment.Parent)),
  sha256: z.string().regex(VERIFICATION_HASH_PATTERN),
});
export type DocsPublicationFile = z.infer<typeof DocsPublicationFileSchema>;
export const DocsPublicationManifestSchema = z.strictObject({
  version: z.literal(DOCS_PUBLICATION_VERSION),
  status: z.literal(DOCS_PUBLICATION_AUTOMATED),
  createdAt: z.string().datetime(),
  files: z.array(DocsPublicationFileSchema).min(1),
});
export type DocsPublicationManifest = z.infer<typeof DocsPublicationManifestSchema>;
