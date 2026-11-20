import { AuthMode, PrincipalKind, Separator, SkillMetaKey } from "@platform/constants";
import { z } from "zod";
import { PolicyBlockSchema } from "./capability/blocks.ts";

export const SkillSummarySchema = z.object({
  name: z.string(),
  description: z.string(),
  uri: z.string(),
  digest: z.string(),
});
export type SkillSummary = z.infer<typeof SkillSummarySchema>;

export const SkillListSchema = z.object({
  skills: z.array(SkillSummarySchema),
  nextPageToken: z.string(),
});
export type SkillList = z.infer<typeof SkillListSchema>;

export const SkillFileSchema = z.object({ path: z.string(), content: z.string() });
export type SkillFile = z.infer<typeof SkillFileSchema>;

export const SkillDocumentSchema = SkillSummarySchema.extend({ files: z.array(SkillFileSchema) });
export type SkillDocument = z.infer<typeof SkillDocumentSchema>;

export const SkillNameInputSchema = z.strictObject({ name: z.string() });
export type SkillNameInput = z.infer<typeof SkillNameInputSchema>;

export const SkillListInputSchema = z.strictObject({
  pageSize: z.number().int().optional(),
  pageToken: z.string().optional(),
});
export type SkillListInput = z.infer<typeof SkillListInputSchema>;

const metaList = z.string().transform((value) =>
  value
    .split(Separator.List)
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
);

export const SkillAccessSchema = z
  .object({
    [SkillMetaKey.Auth]: z.enum(AuthMode).default(AuthMode.None),
    [SkillMetaKey.Scopes]: metaList.optional(),
    [SkillMetaKey.Roles]: metaList.optional(),
    [SkillMetaKey.Kinds]: metaList.pipe(z.array(z.enum(PrincipalKind))).optional(),
  })
  .transform((meta) => {
    const policy = PolicyBlockSchema.parse({
      ...(meta.scopes === undefined ? {} : { requiredScopes: meta.scopes }),
      ...(meta.roles === undefined ? {} : { anyRole: meta.roles }),
      ...(meta.kinds === undefined ? {} : { allowedKinds: meta.kinds }),
    });
    return { auth: meta.auth, policy: Object.keys(policy).length === 0 ? undefined : policy };
  });
export type SkillAccess = z.infer<typeof SkillAccessSchema>;

export const SkillFilesSchema = z.record(z.string(), z.string());
export type SkillFiles = z.infer<typeof SkillFilesSchema>;

export const PackageSkillSchema = z.object({
  name: z.string(),
  files: SkillFilesSchema,
  auth: z.enum(AuthMode),
  policy: PolicyBlockSchema.optional(),
});
export type PackageSkill = z.infer<typeof PackageSkillSchema>;

export const SkillInspectionSchema = z.object({
  skill: PackageSkillSchema.optional(),
  problems: z.array(z.string()),
});
export type SkillInspection = z.infer<typeof SkillInspectionSchema>;

export const SkillAccessResultSchema = z.object({
  access: SkillAccessSchema.optional(),
  problems: z.array(z.string()),
});
export type SkillAccessResult = z.infer<typeof SkillAccessResultSchema>;

export const SkillBundleSchema = z.object({
  name: z.string(),
  files: SkillFilesSchema,
});
export type SkillBundle = z.infer<typeof SkillBundleSchema>;
