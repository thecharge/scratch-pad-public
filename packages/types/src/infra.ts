import {
  CertificateSource,
  DEVELOPMENT_APPS,
  EnvironmentName,
  INFRA_DIGEST_PATTERN,
  MountKind,
  PortProtocol,
  PROXY_SECRET_MIN_LENGTH,
} from "@platform/constants";
import { z } from "zod";
import type { RunOptions, RunResult } from "./tooling.ts";

export const ProxyEnvironmentSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  certificates: z.enum(CertificateSource),
  published: z.array(z.number().int().positive()),
  secret: z.string().min(PROXY_SECRET_MIN_LENGTH).optional(),
});
export type ProxyEnvironment = z.infer<typeof ProxyEnvironmentSchema>;

export const ApiEnvironmentSchema = z.object({
  port: z.number().int().positive(),
  authEnabled: z.boolean(),
});
export type ApiEnvironment = z.infer<typeof ApiEnvironmentSchema>;

export const IdentityEnvironmentSchema = z.object({
  image: z.string(),
  alias: z.string(),
  port: z.number().int().positive(),
  path: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  groups: z.array(z.string()),
});
export type IdentityEnvironment = z.infer<typeof IdentityEnvironmentSchema>;

export const BackendEnvironmentSchema = z.object({
  subnet: z.string(),
  apiAddress: z.string(),
});
export type BackendEnvironment = z.infer<typeof BackendEnvironmentSchema>;

export const DevelopmentAppSchema = z.object({
  service: z.enum(DEVELOPMENT_APPS),
  host: z.string().min(1),
  address: z.string().min(1),
  port: z.number().int().positive(),
  command: z.array(z.string()).min(1),
});
export type DevelopmentApp = z.infer<typeof DevelopmentAppSchema>;

export const StaticWebsiteSchema = z.object({
  bucket: z.enum(DEVELOPMENT_APPS),
  host: z.string().min(1),
  fallback: z.boolean(),
});
export type StaticWebsite = z.infer<typeof StaticWebsiteSchema>;

export const ObjectStoreEnvironmentSchema = z.object({
  image: z.string().regex(INFRA_DIGEST_PATTERN),
  alias: z.string().min(1),
  address: z.string().min(1),
  port: z.number().int().positive(),
  host: z.string().min(1),
  websiteDomain: z.string().min(1),
  websites: z.array(StaticWebsiteSchema),
  accessKey: z.string().min(3),
  secretKey: z.string().min(16),
});
export type ObjectStoreEnvironment = z.infer<typeof ObjectStoreEnvironmentSchema>;

export const StackEnvironmentSchema = z.object({
  name: z.enum(EnvironmentName),
  backend: BackendEnvironmentSchema,
  proxy: ProxyEnvironmentSchema,
  api: ApiEnvironmentSchema,
  sourceMount: z.boolean(),
  testServices: z.boolean(),
  identity: IdentityEnvironmentSchema.optional(),
  developmentApps: z.array(DevelopmentAppSchema).default([]),
  objectStore: ObjectStoreEnvironmentSchema.optional(),
});
export type StackEnvironment = z.infer<typeof StackEnvironmentSchema>;

export const NetworkPlanSchema = z.object({
  name: z.string(),
  internal: z.boolean(),
  subnet: z.string().optional(),
});
export type NetworkPlan = z.infer<typeof NetworkPlanSchema>;

export const AttachmentPlanSchema = z.object({
  network: z.string(),
  aliases: z.array(z.string()),
  address: z.string().optional(),
});
export type AttachmentPlan = z.infer<typeof AttachmentPlanSchema>;

export const PortPlanSchema = z.object({
  internal: z.number().int().positive(),
  external: z.number().int().positive(),
  protocol: z.enum(PortProtocol),
});
export type PortPlan = z.infer<typeof PortPlanSchema>;

export const MountPlanSchema = z.object({
  kind: z.enum(MountKind),
  source: z.string(),
  target: z.string(),
  readOnly: z.boolean(),
});
export type MountPlan = z.infer<typeof MountPlanSchema>;

export const UploadPlanSchema = z.object({
  file: z.string(),
  content: z.string(),
});
export type UploadPlan = z.infer<typeof UploadPlanSchema>;

export const ContainerPlanSchema = z.object({
  name: z.string(),
  image: z.string(),
  pull: z.boolean(),
  command: z.array(z.string()),
  attachments: z.array(AttachmentPlanSchema),
  ports: z.array(PortPlanSchema),
  mounts: z.array(MountPlanSchema),
  uploads: z.array(UploadPlanSchema),
  env: z.record(z.string(), z.string()),
  labels: z.record(z.string(), z.string()),
});
export type ContainerPlan = z.infer<typeof ContainerPlanSchema>;

export const FolderPlanSchema = z.object({
  path: z.string(),
  owner: z.string(),
});
export type FolderPlan = z.infer<typeof FolderPlanSchema>;

export const ImageRowSchema = z.object({ Id: z.string(), Size: z.number() });
export type ImageRow = z.infer<typeof ImageRowSchema>;

export const StackPlanSchema = z.object({
  environment: z.enum(EnvironmentName),
  networks: z.array(NetworkPlanSchema),
  folders: z.array(FolderPlanSchema),
  containers: z.array(ContainerPlanSchema),
});
export type StackPlan = z.infer<typeof StackPlanSchema>;

export const RegistrationSchema = z.object({
  type: z.string(),
  name: z.string(),
  inputs: z.record(z.string(), z.unknown()),
});
export type Registration = z.infer<typeof RegistrationSchema>;

export const PortRowSchema = z.object({ external: z.number(), protocol: z.string() });
export type PortRow = z.infer<typeof PortRowSchema>;

export interface StackDeps {
  run: (command: readonly string[], options?: RunOptions) => Promise<RunResult>;
  installBundles: () => Promise<number>;
  buildSites: (
    environment: StackEnvironment,
    root: string,
    execute: (command: readonly string[], options?: RunOptions) => Promise<RunResult>,
  ) => Promise<number>;
  publishSites: (
    environment: StackEnvironment,
    root: string,
    execute: (command: readonly string[], options?: RunOptions) => Promise<RunResult>,
  ) => Promise<number>;
  checkWatchers: (root: string) => Promise<number>;
  wait: (milliseconds: number) => Promise<void>;
  root: string;
  env: Readonly<Record<string, string | undefined>>;
  proxySecret: () => Promise<string>;
}

export const ProxyAnswerSchema = z.object({
  httpVersion: z.string(),
  status: z.number(),
  verify: z.number(),
  body: z.string(),
});
export type ProxyAnswer = z.infer<typeof ProxyAnswerSchema>;

export const LoadSampleSchema = z.object({
  ttfbMs: z.number(),
  totalMs: z.number(),
  status: z.number(),
  httpVersion: z.string(),
});
export type LoadSample = z.infer<typeof LoadSampleSchema>;

export const BenchRowSchema = z.object({
  operation: z.string(),
  repeats: z.number().int(),
  p95MinMs: z.number(),
  p95MaxMs: z.number(),
  leg: z.string(),
  requests: z.number().int(),
  parallel: z.number().int(),
  failures: z.number().int(),
  statuses: z.record(z.string(), z.number().int()),
  requestsPerSecond: z.number(),
  p50Ms: z.number(),
  p95Ms: z.number(),
  p99Ms: z.number(),
  ttfbP50Ms: z.number(),
  ttfbP95Ms: z.number(),
});
export type BenchRow = z.infer<typeof BenchRowSchema>;

export const LoadRunSchema = z.object({ samples: z.array(LoadSampleSchema), wallMs: z.number() });
export type LoadRun = z.infer<typeof LoadRunSchema>;

export const DirectRunSchema = z.object({
  total: z.array(z.number()),
  first: z.array(z.number()),
  bad: z.number().int(),
  wallMs: z.number(),
});
export type DirectRun = z.infer<typeof DirectRunSchema>;

export const TokenAnswerSchema = z.object({ id_token: z.string() });
export type TokenAnswer = z.infer<typeof TokenAnswerSchema>;

export const StreamObservationSchema = z.object({
  answers: z.array(z.number()),
  heard: z.array(z.boolean()),
  last: z.string(),
  errors: z.array(z.string()),
});
export type StreamObservation = z.infer<typeof StreamObservationSchema>;

export const BenchOperationSchema = z.object({
  name: z.string(),
  method: z.string(),
  path: z.string(),
  body: z.string().optional(),
  maxTime: z.number().optional(),
  requests: z.number().int(),
  levels: z.array(z.number().int()),
});
export type BenchOperation = z.infer<typeof BenchOperationSchema>;

export const ContainerUsageSchema = z.object({
  name: z.string(),
  cpu_percent: z.string(),
  mem_usage: z.string(),
  net_io: z.string(),
  pids: z.string(),
});
export type ContainerUsage = z.infer<typeof ContainerUsageSchema>;
export const ContainerUsageListSchema = z.array(ContainerUsageSchema);

export const BenchReportSchema = z.object({
  rows: z.array(BenchRowSchema),
  usage: z.array(ContainerUsageSchema),
  stages: z.record(z.string(), z.number()),
  server: z.record(z.string(), z.number()),
});
export type BenchReport = z.infer<typeof BenchReportSchema>;

export const BenchTargetSchema = z.object({
  leg: z.string(),
  network: z.string(),
  base: z.string(),
  flag: z.string(),
  data: z.string().optional(),
  resolve: z.string().optional(),
  marker: z.string().optional(),
});
export type BenchTarget = z.infer<typeof BenchTargetSchema>;

export const StartedOperationSchema = z.object({ name: z.string() });
export type StartedOperation = z.infer<typeof StartedOperationSchema>;

export const BenchWhereSchema = z.object({
  edge: z.string(),
  network: z.string(),
  proxyData: z.string(),
  baselineData: z.string(),
  secret: z.string(),
  token: z.string(),
  started: z.string(),
});
export type BenchWhere = z.infer<typeof BenchWhereSchema>;

export const StaticBuildSchema = z.object({
  service: z.enum(DEVELOPMENT_APPS),
  image: z.string().min(1),
  containerfile: z.string().min(1),
});
export type StaticBuild = z.infer<typeof StaticBuildSchema>;
