import type { Principal } from "../auth/principal.ts";
import type {
  CacheBlock,
  MaskBlock,
  MaskResult,
  PolicyBlock,
  PolicyDecision,
  RateLimitBlock,
} from "../capability/blocks.ts";
import type { CapabilityContext } from "../capability/context.ts";
import type { ApiEvent } from "../events/api-event.ts";
import type { InvokeResult, PipelineRecord } from "../pipeline.ts";
import type { Capability } from "./capability.ts";

export interface RateLimiter {
  consume(key: string, block: RateLimitBlock): Promise<void>;
}

export interface PolicyEngine {
  evaluate(
    block: PolicyBlock,
    principal: Principal,
    context: CapabilityContext,
  ): PolicyDecision | Promise<PolicyDecision>;
}

export interface ResponseCache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, block: CacheBlock): Promise<void>;
}

export interface Masker {
  apply(output: unknown, principal: Principal, block: MaskBlock): MaskResult | Promise<MaskResult>;
}

export interface EventSink {
  publish(event: ApiEvent): void;
}

export interface Observer {
  record(record: PipelineRecord): unknown;
}

export interface PipelineDeps {
  rateLimiter?: RateLimiter;
  policy?: PolicyEngine;
  cache?: ResponseCache;
  masker?: Masker;
  observer?: Observer;
  events?: EventSink;
  now?: () => Promise<number>;
  date?: () => Promise<Date>;
}

export type Invoke = (
  capability: Capability,
  rawInput: unknown,
  context: CapabilityContext,
) => Promise<InvokeResult>;
