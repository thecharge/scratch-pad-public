import type {
  ApiVersion,
  AuthMode,
  HttpMethod,
  MethodKind,
  TransportKind,
} from "@platform/constants";
import { z } from "zod";
import type { RawMedia } from "../assets.ts";
import {
  type CacheBlock,
  type MaskBlock,
  MaskBlockSchema,
  type PolicyBlock,
  PolicyBlockSchema,
  type RateLimitBlock,
} from "../capability/blocks.ts";
import type { CapabilityContext } from "../capability/context.ts";

export interface EventSource<I extends z.ZodType = z.ZodType> {
  name: string;
  item?: z.ZodType;
  source: (input: z.output<I>, context: CapabilityContext) => Promise<AsyncIterable<unknown>>;
}

export interface CapabilityDefinition<I extends z.ZodType, O extends z.ZodType> {
  id: string;
  version: ApiVersion;
  method: MethodKind;
  resource: string;
  customVerb?: string;
  httpMethod?: HttpMethod;
  summary: string;
  description: string;
  auth: AuthMode;
  input: I;
  output: O;
  handler: (input: z.output<I>, context: CapabilityContext) => Promise<z.input<O>> | z.input<O>;
  policy?: PolicyBlock | undefined;
  mask?: MaskBlock | undefined;
  cache?: CacheBlock;
  rateLimit?: RateLimitBlock;
  flag?: string;
  onlyOver?: TransportKind;
  events?: EventSource<I>;
  media?: RawMedia;
}

export type Capability = Readonly<CapabilityDefinition<z.ZodType, z.ZodType>>;

export const AccessBlocksSchema = z.object({
  policy: PolicyBlockSchema.optional(),
  mask: MaskBlockSchema.optional(),
});
export type AccessBlocks = z.infer<typeof AccessBlocksSchema>;

export type CapabilityLoader = () => Promise<Capability> | Capability;

export interface CapabilityEntry {
  id: string;
  load: CapabilityLoader;
}
