import {
  AuthProviderKind,
  CheckKind,
  DocCategory,
  ErrorReason,
  HttpMethod,
  MCP_HARNESS_MODE,
  StepFace,
  StepFlag,
  StepSource,
  TokenFlaw,
  TransportKind,
  UiActionKind,
  UiFocus,
} from "@platform/constants";
import { z } from "zod";
import { FlagValuesSchema } from "./flags.ts";
import { JsonObjectSchema } from "./json.ts";
import { LiveInterfacesSchema } from "./openapi.ts";

export const RawRequestSchema = z.object({
  method: z.enum(HttpMethod),
  path: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  omit: z.array(z.string()).optional(),
  body: JsonObjectSchema.optional(),
});
export type RawRequest = z.infer<typeof RawRequestSchema>;

export const BulkSchema = z.object({
  field: z.string(),
  count: z.number().int().positive(),
  item: JsonObjectSchema,
});
export type Bulk = z.infer<typeof BulkSchema>;

export const HttpRequestSpecSchema = z.object({
  method: z.enum(HttpMethod),
  path: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  omit: z.array(z.string()).optional(),
  body: JsonObjectSchema.optional(),
  shown: JsonObjectSchema.optional(),
  note: z.string().optional(),
});
export type HttpRequestSpec = z.infer<typeof HttpRequestSpecSchema>;

export const ScenarioStepSchema = z.object({
  description: z.string(),
  capability: z.string(),
  input: JsonObjectSchema,
  scopes: z.array(z.string()),
  expectError: z.boolean().optional(),
  reason: z.enum(ErrorReason).optional(),
  mcpText: z.string().optional(),
  flags: FlagValuesSchema.optional(),
  raw: RawRequestSchema.optional(),
  extraBody: JsonObjectSchema.optional(),
  tokenFlaw: z.enum(TokenFlaw).optional(),
  bulk: BulkSchema.optional(),
  tamper: z.string().optional(),
  httpOnly: z.boolean().optional(),
  status: z.number().int().optional(),
  mcpStatus: z.number().int().optional(),
  challenge: z.boolean().optional(),
  mcpOnly: z.boolean().optional(),
  face: z.enum(StepFace).optional(),
});
export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;

export const ScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  intent: z.string(),
  category: z.enum(DocCategory),
  authEnabled: z.boolean(),
  behindProxy: z.boolean().optional(),
  provider: z.enum(AuthProviderKind).optional(),
  custom: z.boolean().optional(),
  steps: z.array(ScenarioStepSchema).min(1),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const SdkStepSchema = z.object({
  description: z.string(),
  place: z.string(),
  summary: z.string(),
  call: z.string(),
  params: JsonObjectSchema,
  scopes: z.array(z.string()),
  expectError: z.boolean().optional(),
  reason: z.enum(ErrorReason).optional(),
});
export type SdkStep = z.infer<typeof SdkStepSchema>;

export const SdkTokenStepSchema = SdkStepSchema.extend({ token: z.string() });
export type SdkTokenStep = z.infer<typeof SdkTokenStepSchema>;

export const SdkScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  intent: z.string(),
  category: z.enum(DocCategory),
  steps: z.array(SdkStepSchema).min(1),
});
export type SdkScenario = z.infer<typeof SdkScenarioSchema>;

export const SdkObservationSchema = z.object({
  ok: z.boolean(),
  body: z.unknown().optional(),
  status: z.string().optional(),
  reason: z.string().optional(),
  httpStatus: z.number().int().optional(),
});
export type SdkObservation = z.infer<typeof SdkObservationSchema>;

export const SdkRunOutputSchema = z.object({
  entry: z.string(),
  observed: z.array(SdkObservationSchema),
});
export type SdkRunOutput = z.infer<typeof SdkRunOutputSchema>;

export const CheckResultSchema = z.object({
  kind: z.enum(CheckKind),
  label: z.string(),
  passed: z.boolean(),
});
export type CheckResult = z.infer<typeof CheckResultSchema>;

export const ExchangeSchema = z.object({
  transport: z.enum(TransportKind),
  description: z.string(),
  request: z.string(),
  requestBody: z.string().optional(),
  note: z.string().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  authorized: z.boolean().optional(),
  tool: z.string().optional(),
  args: JsonObjectSchema.optional(),
  failed: z.boolean(),
  status: z.number().int().optional(),
  challenge: z.string().optional(),
  response: z.string(),
  checks: z.array(CheckResultSchema).optional(),
});
export type Exchange = z.infer<typeof ExchangeSchema>;

export const McpOutcomeSchema = z.object({ failed: z.boolean(), payload: z.unknown() });
export type McpOutcome = z.infer<typeof McpOutcomeSchema>;

export const McpSightingSchema = z.object({
  status: z.number().int().optional(),
  body: z.string().optional(),
  challenge: z.string().optional(),
});
export type McpSighting = z.infer<typeof McpSightingSchema>;

export const EvidenceSchema = z.object({
  rpc: JsonObjectSchema.optional(),
  requestBodyFile: z.string().optional(),
  screenshot: z.string().optional(),
  request: z.string().optional(),
  requestBody: z.string().optional(),
  note: z.string().optional(),
  reason: z.string().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  authorized: z.boolean().optional(),
  tool: z.string().optional(),
  args: JsonObjectSchema.optional(),
  pagePath: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  response: z.string().optional(),
  challenge: z.string().optional(),
  outcome: z.string().optional(),
  expected: z.string().optional(),
  actual: z.string().optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const StepResultSchema = z.object({
  source: z.enum(StepSource),
  capability: z.string().optional(),
  description: z.string(),
  flag: z.enum(StepFlag),
  place: z.string(),
  action: z.string(),
  expectation: z.string(),
  checks: z.array(CheckResultSchema),
  evidence: EvidenceSchema,
});
export type StepResult = z.infer<typeof StepResultSchema>;

export const StepRunSchema = z.object({ result: StepResultSchema, body: JsonObjectSchema });
export type StepRun = z.infer<typeof StepRunSchema>;

export const RecordedPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  intent: z.string(),
  category: z.enum(DocCategory),
  results: z.array(StepResultSchema),
});
export type RecordedPage = z.infer<typeof RecordedPageSchema>;
export const ProxyRecorderInputSchema = z.object({
  scenarios: z.array(ScenarioSchema).optional(),
  transports: z.array(z.enum(TransportKind)).optional(),
});
export type ProxyRecorderInput = z.infer<typeof ProxyRecorderInputSchema>;
export const ProxyRecorderOutputSchema = z.object({
  pages: z.array(RecordedPageSchema).optional(),
  interfaces: LiveInterfacesSchema.optional(),
});
export type ProxyRecorderOutput = z.infer<typeof ProxyRecorderOutputSchema>;

export const CallOutcomeSchema = z.object({ exchange: ExchangeSchema, body: JsonObjectSchema });
export type CallOutcome = z.infer<typeof CallOutcomeSchema>;

export const TranscriptCallSchema = z.object({ tool: z.string(), input: JsonObjectSchema });
export type TranscriptCall = z.infer<typeof TranscriptCallSchema>;

export const TranscriptSchema = z.object({
  connected: z.boolean(),
  tools: z.array(z.string()),
  calls: z.array(TranscriptCallSchema),
  results: z.array(z.string()),
  final: z.string(),
});
export type Transcript = z.infer<typeof TranscriptSchema>;

export const McpHarnessEvidenceSchema = TranscriptSchema.extend({
  mode: z.literal(MCP_HARNESS_MODE),
  id: z.string(),
  prompt: z.string(),
  scopes: z.array(z.string()),
  rawTranscript: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  problems: z.array(z.string()),
});
export const McpHarnessEvidenceListSchema = z.array(McpHarnessEvidenceSchema).length(4);
export type McpHarnessEvidence = z.infer<typeof McpHarnessEvidenceSchema>;

export const ScenarioExpectationSchema = z.object({
  id: z.string(),
  scopes: z.array(z.string()),
  prompt: z.string(),
  mustCall: z.array(z.string()),
  mustNotCall: z.array(z.string()),
  answerMentions: z.array(z.string()).optional(),
});
export type ScenarioExpectation = z.infer<typeof ScenarioExpectationSchema>;

export const UiGuideSchema = z.object({
  place: z.string(),
  action: z.string(),
  expected: z.string(),
});
export type UiGuide = z.infer<typeof UiGuideSchema>;

export const UiStepSchema = UiGuideSchema.extend({
  description: z.string(),
  focus: z.enum(UiFocus).optional(),
  kind: z.enum(UiActionKind),
  target: z.string().optional(),
  value: z.string().optional(),
  expectVisible: z.array(z.string()),
  expectHidden: z.array(z.string()),
  forbidRequests: z.array(z.string()),
  expectNoTokenInStorage: z.boolean(),
});
export type UiStep = z.infer<typeof UiStepSchema>;

export const UiScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  intent: z.string(),
  category: z.enum(DocCategory),
  scopes: z.array(z.string()),
  steps: z.array(UiStepSchema).min(1),
});
export type UiScenario = z.infer<typeof UiScenarioSchema>;

export const DocsPageResultSchema = z.object({
  path: z.string(),
  title: z.string(),
  diagrams: z.number().int(),
  images: z.number().int(),
  screenshot: z.string(),
});
export type DocsPageResult = z.infer<typeof DocsPageResultSchema>;

export const UiRunSchema = z.object({
  results: z.array(StepResultSchema),
  files: z.record(z.string(), z.instanceof(Uint8Array)),
});
export type UiRun = z.infer<typeof UiRunSchema>;

export const RecordedUiSchema = z.object({
  page: RecordedPageSchema,
  files: z.record(z.string(), z.instanceof(Uint8Array)),
});
export type RecordedUi = z.infer<typeof RecordedUiSchema>;
