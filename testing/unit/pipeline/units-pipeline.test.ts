import { expect } from "bun:test";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CacheScope,
  CanonicalCode,
  ErrorReason,
  MaskStrategy,
  MessageId,
  MethodKind,
  PolicyOutcome,
  PolicyReason,
  PrincipalKind,
  TransportKind,
} from "@platform/constants";
import { createPipeline } from "@platform/pipeline";
import { negative, positive, seen, unit } from "@platform/test-factories";
import {
  ANONYMOUS_PRINCIPAL,
  type CapabilityContext,
  type CapabilityDefinition,
  type PipelineDeps,
  type PipelineRecord,
} from "@platform/types";
import { z } from "zod";

const USER = { kind: PrincipalKind.User, subject: "u1", scopes: ["read"], roles: [] };
const INPUT = z.strictObject({ name: z.string() });
const OUTPUT = z.object({ name: z.string(), email: z.string() });
const CALL_INPUT = { name: "n" };
const RESULT = { name: "n", email: "a@example.com" };
const context = (overrides: Partial<CapabilityContext> = {}): CapabilityContext => ({
  principal: USER,
  requestId: "r1",
  transport: TransportKind.Http,
  authEnabled: true,
  ...overrides,
});

async function build(overrides: Partial<CapabilityDefinition<z.ZodType, z.ZodType>> = {}) {
  return defineCapability({
    id: "books.get",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: "books/{book}",
    summary: "s",
    description: "d",
    auth: AuthMode.Required,
    input: INPUT,
    output: OUTPUT,
    handler: ({ name }: z.infer<typeof INPUT>) => ({ name, email: "a@example.com" }),
    ...overrides,
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

const PLAIN = await build();
const GUARDED = await build({ policy: {} });
const CACHED = await build({ cache: { ttlMs: 1000, scope: CacheScope.Private } });
const EMAIL_RULE = { path: "email", strategy: MaskStrategy.Remove };
const MASKED = await build({ mask: { rules: [EMAIL_RULE] } });
const LIMITED = await build({ rateLimit: { limit: 1, windowMs: 1000 } });
const BROKEN = await build({ handler: () => ({ name: 5 }) });
const FAILING = await build({
  handler: () => {
    throw new RangeError("boom");
  },
});

const allow: PipelineDeps = {
  policy: {
    evaluate: async () => ({ outcome: PolicyOutcome.Allow, reason: PolicyReason.Allowed }),
  },
};
const deny: PipelineDeps = {
  policy: {
    evaluate: async () => ({ outcome: PolicyOutcome.Deny, reason: PolicyReason.MissingScope }),
  },
};
const MASK_RESULT = { output: { name: "n" }, maskedPaths: ["email"] };
const remover: PipelineDeps = { masker: { apply: async () => MASK_RESULT } };

async function store() {
  const entries = new Map<string, unknown>();
  const cache = {
    get: async (key: string) => entries.get(key),
    set: async (key: string, value: unknown) => {
      entries.set(key, value);
    },
  };
  return { entries, deps: { cache } as PipelineDeps };
}

async function observing() {
  const records: PipelineRecord[] = [];
  const observer = { record: async (item: PipelineRecord) => void records.push(item) };
  return { records, deps: { observer } as PipelineDeps };
}

const cache = await store();
const observed = await observing();

const call = (capability: object, input: object = CALL_INPUT, given = context()) => [
  capability,
  input,
  given,
];
const FRESH = { output: RESULT, cacheHit: false };
const ALLOWED = { output: RESULT, cacheHit: false, policyOutcome: PolicyOutcome.Allow };
const MASKED_RESULT = { output: { name: "n" }, cacheHit: false };
const CACHE_HIT = { output: RESULT, cacheHit: true };
const UNAUTHENTICATED = { code: CanonicalCode.Unauthenticated, reason: ErrorReason.TokenMissing };
const DENIED = { code: CanonicalCode.PermissionDenied, reason: ErrorReason.PolicyDenied };
const UNKNOWN_FIELD = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.UnknownField };
const MISCONFIGURED = { code: CanonicalCode.Internal, messageId: MessageId.MisconfiguredBlock };
const INTERNAL = { code: CanonicalCode.Internal, messageId: MessageId.InternalError };
const OBSERVED = [
  expect.objectContaining({ capabilityId: "books.get", status: CanonicalCode.Ok, cacheHit: false }),
];

unit(createPipeline, {
  positive: [
    positive("an authenticated call runs the handler", [{}], FRESH, call(PLAIN)),
    positive("an allowed policy is reported in the result", [allow], ALLOWED, call(GUARDED)),
    positive("a mask replaces the output", [remover], MASKED_RESULT, call(MASKED)),
    positive(
      "a second call is served from the cache",
      [cache.deps],
      seen(
        async () => await (await createPipeline(cache.deps))(CACHED, CALL_INPUT, context()),
        CACHE_HIT,
      ),
      call(CACHED),
    ),
    positive(
      "the observer records the call",
      [observed.deps],
      seen(async () => observed.records, OBSERVED),
      call(PLAIN),
    ),
  ],
  negative: [
    negative(
      "a required capability without a principal is unauthenticated",
      [{}],
      UNAUTHENTICATED,
      call(PLAIN, CALL_INPUT, context({ principal: ANONYMOUS_PRINCIPAL })),
    ),
    negative("a denied policy stops the call", [deny], DENIED, call(GUARDED)),
    negative(
      "an unknown input field is refused",
      [{}],
      UNKNOWN_FIELD,
      call(PLAIN, { name: "n", extra: 1 }),
    ),
    negative(
      "a declared policy without an evaluator fails closed",
      [{}],
      MISCONFIGURED,
      call(GUARDED),
    ),
    negative(
      "a declared rate limit without a limiter fails closed",
      [{}],
      MISCONFIGURED,
      call(LIMITED),
    ),
    negative("an output that breaks the schema is an internal error", [{}], INTERNAL, call(BROKEN)),
    negative("a handler failure is normalized", [{}], INTERNAL, call(FAILING)),
  ],
});
