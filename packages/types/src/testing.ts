import {
  CaseMode,
  CasePolarity,
  MIN_CASES_PER_POLARITY,
  TestingRule,
  UnitRule,
} from "@platform/constants";
import { z } from "zod";

export const CheckRunSchema = z.object({ code: z.number(), text: z.string() });
export type CheckRun = z.infer<typeof CheckRunSchema>;

export const SourceFileSchema = z.object({ file: z.string(), text: z.string() });
export type SourceFile = z.infer<typeof SourceFileSchema>;

export const UnitCaseSchema = z.object({
  name: z.string(),
  polarity: z.enum(CasePolarity),
  mode: z.enum(CaseMode),
  args: z.array(z.unknown()),
  expected: z.unknown(),
  followUp: z.array(z.unknown()).optional(),
});
export type UnitCase = z.infer<typeof UnitCaseSchema>;

export const UnitSuiteSchema = z.object({
  positive: z.array(UnitCaseSchema).min(MIN_CASES_PER_POLARITY),
  negative: z.array(UnitCaseSchema).min(MIN_CASES_PER_POLARITY),
});
export type UnitSuite = z.infer<typeof UnitSuiteSchema>;

export const UnitRefSchema = z.object({
  area: z.string(),
  name: z.string(),
  file: z.string(),
});
export type UnitRef = z.infer<typeof UnitRefSchema>;

export const UnitViolationSchema = z.object({
  unit: z.string(),
  file: z.string(),
  rule: z.enum(UnitRule),
  detail: z.string(),
});
export type UnitViolation = z.infer<typeof UnitViolationSchema>;

export const UnitCoverageSchema = z.object({
  area: z.string(),
  name: z.string(),
  positive: z.number().int().nonnegative(),
  negative: z.number().int().nonnegative(),
  factoryBuilt: z.boolean(),
  file: z.string(),
});
export type UnitCoverage = z.infer<typeof UnitCoverageSchema>;

export const LcovFileSchema = z.object({
  file: z.string(),
  lines: z.record(z.string(), z.number().int().nonnegative()),
  functionsFound: z.number().int().nonnegative(),
  functionsHit: z.number().int().nonnegative(),
});
export type LcovFile = z.infer<typeof LcovFileSchema>;

export const SlowTestSchema = z.object({
  name: z.string(),
  file: z.string(),
  seconds: z.number(),
});
export type SlowTest = z.infer<typeof SlowTestSchema>;

export const CoverageRunSchema = z.object({
  lcov: z.array(LcovFileSchema),
  ok: z.boolean(),
  slow: z.array(SlowTestSchema).optional(),
});
export type CoverageRun = z.infer<typeof CoverageRunSchema>;

export const CoverageGapSchema = z.object({
  file: z.string(),
  uncoveredLines: z.array(z.number().int()),
  functionsMissing: z.number().int().nonnegative(),
});
export type CoverageGap = z.infer<typeof CoverageGapSchema>;

export const TestingViolationSchema = z.object({
  file: z.string(),
  rule: z.enum(TestingRule),
  detail: z.string(),
});
export type TestingViolation = z.infer<typeof TestingViolationSchema>;

export const UnitDebtSchema = z.array(z.string());

export const SchemaProbeSchema = z.strictObject({
  accepts: z.array(z.unknown()),
  rejects: z.array(z.unknown()),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type SchemaProbe = z.infer<typeof SchemaProbeSchema>;

export const SeenSchema = z.strictObject({
  view: z.custom<(received: unknown) => unknown>((value) => value instanceof Function),
  equals: z.unknown(),
});
export type Seen = z.infer<typeof SeenSchema>;

export type TestCall = (...args: never[]) => unknown;

export const ProtocolStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  checked: z.string(),
  version: z.string(),
  passed: z.boolean(),
  detail: z.string(),
});
export type ProtocolStep = z.infer<typeof ProtocolStepSchema>;
export const ProtocolStepSpecSchema = ProtocolStepSchema.omit({ passed: true, detail: true });
export type ProtocolStepSpec = z.infer<typeof ProtocolStepSpecSchema>;
export const ProtocolOutcomeSchema = ProtocolStepSchema.pick({ passed: true, detail: true });
export type ProtocolOutcome = z.infer<typeof ProtocolOutcomeSchema>;
