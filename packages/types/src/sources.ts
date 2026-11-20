import { z } from "zod";

export const SourceRecordSchema = z
  .object({
    id: z.string().min(1),
    url: z.url(),
    fetchedAt: z.iso.datetime({ offset: true }),
    status: z.number().int().min(200).max(299),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    quotes: z.array(z.string().min(1)).min(1),
    attempt: z.string().min(1),
    output: z.string().min(1),
  })
  .strict();
export type SourceRecord = z.infer<typeof SourceRecordSchema>;

export const SourceDocumentSchema = z
  .object({
    file: z.string().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    sourceIds: z.array(z.string().min(1)),
  })
  .strict();
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

export const SourceIndexSchema = z
  .object({
    records: z.array(SourceRecordSchema).min(1),
    documents: z.array(SourceDocumentSchema).min(1),
  })
  .strict();
export type SourceIndex = z.infer<typeof SourceIndexSchema>;

export const SourceRegistryTokenSchema = z.object({ token: z.string().min(1) });
