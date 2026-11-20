import { type HttpStage, McpContentType, type McpEra } from "@platform/constants";
import { z } from "zod";
import type { AssetStore } from "../assets.ts";
import type { Principal } from "../auth/principal.ts";
import type { PolicyBlock } from "../capability/blocks.ts";
import type { FlagValues } from "../flags.ts";
import { JsonObjectSchema } from "../json.ts";
import type { TelemetryDeps } from "../observability.ts";
import type { ChangeSource } from "../streams.ts";
import type { AuthOptions, AuthProvider } from "./auth.ts";
import type { Capability } from "./capability.ts";
import type { EventSink, Invoke } from "./pipeline.ts";

export interface CapabilitySource {
  list(): Promise<readonly Capability[]>;
}

export const OperationSampleSchema = z.object({
  capability: z.string(),
  form: z.string(),
  version: z.string(),
  status: z.number().int(),
  elapsedMs: z.number(),
  firstByteMs: z.number(),
  bytes: z.number().int(),
});
export type OperationSample = z.infer<typeof OperationSampleSchema>;

export interface StageRecorder {
  record(stage: HttpStage, elapsedMs: number): Promise<void>;
  operation(sample: OperationSample): Promise<void>;
}

export interface StreamTracker {
  opened(): Promise<void>;
  closed(): Promise<void>;
}

export interface HttpAppOptions {
  source: CapabilitySource;
  invoke: Invoke;
  auth: AuthOptions;
  domain: string;
  resource: string;
  stages?: StageRecorder;
  streams?: StreamTracker;
}

export interface HttpApp {
  fetch(request: Request): Promise<Response> | Response;
}

export const OpenApiOptionsSchema = z.object({ title: z.string(), version: z.string() });
export type OpenApiOptions = z.infer<typeof OpenApiOptionsSchema>;

export type VisibilityRule = (capability: Capability, principal: Principal) => Promise<boolean>;

export type PolicyGate = (block: PolicyBlock, principal: Principal) => Promise<boolean>;

export interface McpAppOptions {
  source: CapabilitySource;
  invoke: Invoke;
  auth: AuthOptions;
  domain: string;
  resource: string;
  visible: VisibilityRule;
  allowed: PolicyGate;
  skillDirs: string[];
  era: McpEra;
  host: string;
  allowedHosts: string[];
  allowedOrigins: string[];
  changes?: ChangeSource;
}

const McpTextContentSchema = z.object({ type: z.literal(McpContentType.Text), text: z.string() });
const McpResourceLinkContentSchema = z.object({
  type: z.literal(McpContentType.ResourceLink),
  uri: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
});
export const McpToolResultSchema = z.object({
  content: z.array(z.union([McpTextContentSchema, McpResourceLinkContentSchema])),
  isError: z.boolean(),
  structuredContent: JsonObjectSchema.optional(),
});
export type McpToolResult = z.infer<typeof McpToolResultSchema>;

export interface ReferenceCache {
  get(capability: Capability): string | undefined;
  set(capability: Capability, text: string): unknown;
}

export interface SkillAppOptions {
  source: CapabilitySource;
  visible: VisibilityRule;
  allowed: PolicyGate;
  authEnabled: boolean;
  skillDirs: string[];
  references?: ReferenceCache;
}

export type SkillOptionsProvider = (source: CapabilitySource) => Promise<SkillAppOptions>;

export interface SkillGroup {
  name: string;
  capabilities: Capability[];
}

export const SkillLocationSchema = z.object({ group: z.string(), path: z.string() });
export type SkillLocation = z.infer<typeof SkillLocationSchema>;

export interface FeatureFlags {
  enabled(key: string): Promise<boolean>;
  set(values: FlagValues): Promise<void>;
}

export interface ApiAppOptions {
  assets?: AssetStore;
  flags?: FeatureFlags;
  authApp?: HttpApp;
  telemetry?: TelemetryDeps;
  bus?: EventSink;
  auth: AuthOptions;
  domain: string;
  resource: string;
  databasePath: string;
  era: McpEra;
  host: string;
  allowedHosts: string[];
  allowedOrigins: string[];
  skillDirs?: string[];
  proxySecret?: string;
  now?: () => Promise<Date>;
  reindexStepMs?: number;
  extraCapabilities?: readonly Capability[];
}

export interface AuthSetup {
  provider?: AuthProvider;
  authApp?: HttpApp;
}

export interface RunningServer {
  origin: string;
  stop(): Promise<void>;
}
