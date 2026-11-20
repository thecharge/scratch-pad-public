import { type BUNDLED_TOOLS, type INSTALLABLE_TOOLS, StructureRule } from "@platform/constants";
import { z } from "zod";

export const RunOptionsSchema = z.object({
  stdin: z.string().optional(),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
});
export type RunOptions = z.infer<typeof RunOptionsSchema>;

export const RunResultSchema = z.object({
  exitCode: z.number().int(),
  stdout: z.string(),
  stderr: z.string(),
});
export type RunResult = z.infer<typeof RunResultSchema>;

export const MermaidBlockSchema = z.object({
  file: z.string(),
  index: z.number().int().positive(),
  source: z.string(),
});
export type MermaidBlock = z.infer<typeof MermaidBlockSchema>;

export const MermaidFailureSchema = z.object({
  block: MermaidBlockSchema,
  message: z.string(),
});
export type MermaidFailure = z.infer<typeof MermaidFailureSchema>;

export const StepTimingSchema = z.object({
  step: z.string(),
  ok: z.boolean(),
  seconds: z.number(),
});
export type StepTiming = z.infer<typeof StepTimingSchema>;

const DependencyMapSchema = z.record(z.string(), z.string());

export const PackageManifestSchema = z.object({
  private: z.boolean().optional(),
  license: z.string().optional(),
  version: z.string().optional(),
  files: z.array(z.string()).optional(),
  types: z.string().optional(),
  exports: z.unknown().optional(),
  dependencies: DependencyMapSchema.optional(),
  peerDependencies: DependencyMapSchema.optional(),
  optionalDependencies: DependencyMapSchema.optional(),
});
export type PackageManifest = z.infer<typeof PackageManifestSchema>;

export const LefthookJobSchema = z.object({
  name: z.string(),
  run: z.string(),
  stage_fixed: z.boolean().optional(),
  use_stdin: z.boolean().optional(),
  env: z.record(z.string(), z.string()).optional(),
});
export const LefthookSchema = z.object({
  "pre-commit": z.object({ jobs: z.array(LefthookJobSchema) }),
  "pre-push": z
    .object({ jobs: z.array(LefthookJobSchema.strict()) })
    .strict()
    .optional(),
});

export const StructureViolationSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  rule: z.enum(StructureRule),
  detail: z.string(),
});
export type StructureViolation = z.infer<typeof StructureViolationSchema>;

export const AstNodeSchema = z
  .object({ type: z.string(), start: z.number(), end: z.number() })
  .catchall(z.unknown());
export type AstNode = z.infer<typeof AstNodeSchema>;

export const StructureScopeSchema = z.object({
  depth: z.number().int().nonnegative(),
  objects: z.number().int().nonnegative(),
});
export type StructureScope = z.infer<typeof StructureScopeSchema>;

export const ParsedCommentSchema = z.object({
  value: z.string(),
  start: z.number().int().nonnegative(),
});
export type ParsedComment = z.infer<typeof ParsedCommentSchema>;

export type InstallableTool = (typeof INSTALLABLE_TOOLS)[number];
export type BundledTool = (typeof BUNDLED_TOOLS)[number];

export const PluginEntrySchema = z.looseObject({ includes: z.array(z.string()) });
export type PluginEntry = z.infer<typeof PluginEntrySchema>;

export const SdkLeakSchema = z.object({ file: z.string(), specifier: z.string() });
export type SdkLeak = z.infer<typeof SdkLeakSchema>;

export const PackedSdkSchema = z.object({ directory: z.string(), tarball: z.string() });
export type PackedSdk = z.infer<typeof PackedSdkSchema>;

export const ErrorCaseFindingsSchema = z.object({
  operations: z.array(z.string()),
  reasons: z.array(z.string()),
  checkedOperations: z.number().int(),
  checkedReasons: z.number().int(),
});
export type ErrorCaseFindings = z.infer<typeof ErrorCaseFindingsSchema>;

export const InterfaceFindingsSchema = z.object({
  operationsWithoutTool: z.array(z.string()),
  toolsWithoutOperation: z.array(z.string()),
  leaks: z.array(z.string()),
});
export type InterfaceFindings = z.infer<typeof InterfaceFindingsSchema>;

export const UrlLiteralConfigSchema = z.object({ allowedPaths: z.array(z.string()) });
export type UrlLiteralConfig = z.infer<typeof UrlLiteralConfigSchema>;

export const UrlLiteralFindingSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  literal: z.string(),
});
export type UrlLiteralFinding = z.infer<typeof UrlLiteralFindingSchema>;

export const SkillPathsSchema = z.record(z.string(), z.array(z.string()));
export type SkillPaths = z.infer<typeof SkillPathsSchema>;

export const TaskCountsSchema = z.object({ completedTasks: z.number(), totalTasks: z.number() });
export type TaskCounts = z.infer<typeof TaskCountsSchema>;

export const OpenChangeSchema = TaskCountsSchema.extend({ name: z.string() });
export type OpenChange = z.infer<typeof OpenChangeSchema>;

export const GitPositionSchema = z.object({ behind: z.number(), ahead: z.number() });
export type GitPosition = z.infer<typeof GitPositionSchema>;

export const DevStatusSectionSchema = z.object({ lines: z.array(z.string()), ok: z.boolean() });
export type DevStatusSection = z.infer<typeof DevStatusSectionSchema>;

export const StaleSkillSchema = z.object({ skill: z.string(), files: z.array(z.string()) });
export type StaleSkill = z.infer<typeof StaleSkillSchema>;

export const AsyncIgnoreEntrySchema = z.object({
  path: z.string(),
  names: z.array(z.string()).optional(),
  maximum: z.number().int().positive().optional(),
  reason: z.string().min(1),
});
export const AsyncIgnoreSchema = z.object({ entries: z.array(AsyncIgnoreEntrySchema) });
export type AsyncIgnoreEntry = z.infer<typeof AsyncIgnoreEntrySchema>;
export type AsyncIgnore = z.infer<typeof AsyncIgnoreSchema>;

export const PackageGraphSchema = z.record(z.string(), z.array(z.string()));
export type PackageGraph = z.infer<typeof PackageGraphSchema>;

export const AsyncFindingSchema = z.object({
  file: z.string(),
  line: z.number().int(),
  name: z.string(),
});
export type AsyncFinding = z.infer<typeof AsyncFindingSchema>;

export const RecordedPathsSchema = z.array(z.string());
