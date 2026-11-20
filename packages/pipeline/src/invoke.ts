import {
  AuthMode,
  BlockName,
  CacheScope,
  CanonicalCode,
  DigestEncoding,
  ErrorReason,
  EventKind,
  HashAlgorithm,
  MessageId,
  PolicyOutcome,
  PrincipalKind,
  Separator,
  Text,
  ZodIssueCode,
} from "@platform/constants";
import { ApiError, toApiError } from "@platform/errors";
import {
  ANONYMOUS_PRINCIPAL,
  type Capability,
  type CapabilityContext,
  type Invoke,
  type InvokeResult,
  type PipelineDeps,
  type Principal,
} from "@platform/types";
import type { ZodError } from "zod";

async function systemDate(): Promise<Date> {
  return new Date();
}

async function eventBase(capability: Capability, context: CapabilityContext, deps: PipelineDeps) {
  return {
    time: (await (deps.date ?? systemDate)()).toISOString(),
    requestId: context.requestId,
    capability: capability.id,
    transport: context.transport,
    principalKind: context.principal.kind,
  };
}

async function misconfigured(capability: Capability, block: BlockName): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.Internal,
    ErrorReason.InternalError,
    MessageId.MisconfiguredBlock,
    { id: capability.id, block },
  );
}

async function unauthenticated(reason: ErrorReason, messageId: MessageId): Promise<ApiError> {
  return new ApiError(CanonicalCode.Unauthenticated, reason, messageId);
}

async function preflight(capability: Capability, deps: PipelineDeps): Promise<void> {
  const missing: Array<[BlockName, boolean]> = [
    [BlockName.RateLimit, capability.rateLimit !== undefined && deps.rateLimiter === undefined],
    [BlockName.Policy, capability.policy !== undefined && deps.policy === undefined],
    [BlockName.Mask, capability.mask !== undefined && deps.masker === undefined],
  ];
  const first = missing.find(([, isMissing]) => isMissing);
  if (first !== undefined) {
    throw await misconfigured(capability, first[0]);
  }
}

async function authenticate(
  capability: Capability,
  context: CapabilityContext,
): Promise<Principal> {
  if (capability.auth === AuthMode.None) {
    return ANONYMOUS_PRINCIPAL;
  }
  const required = capability.auth === AuthMode.Required;
  if (context.authEnabled && context.authFailure !== undefined) {
    throw await ApiError.fromFailure(context.authFailure);
  }
  if (!context.authEnabled) {
    if (required) {
      throw await unauthenticated(ErrorReason.AuthNotEnabled, MessageId.AuthNotEnabled);
    }
    return ANONYMOUS_PRINCIPAL;
  }
  if (required && context.principal.kind === PrincipalKind.Anonymous) {
    throw await unauthenticated(ErrorReason.TokenMissing, MessageId.TokenMissing);
  }
  return context.principal;
}

async function principalKey(principal: Principal, includeSubject: boolean): Promise<string> {
  const parts = [
    principal.kind,
    [...principal.scopes].sort().join(Separator.List),
    [...principal.roles].sort().join(Separator.List),
  ];
  return (includeSubject ? [...parts, principal.subject ?? Text.Empty] : parts).join(Separator.Key);
}

async function digest(text: string): Promise<string> {
  return new Bun.CryptoHasher(HashAlgorithm.Sha256).update(text).digest(DigestEncoding.Hex);
}

async function validationError(error: ZodError): Promise<ApiError> {
  const issue = error.issues[0];
  if (issue?.code === ZodIssueCode.UnrecognizedKeys) {
    return new ApiError(
      CanonicalCode.InvalidArgument,
      ErrorReason.UnknownField,
      MessageId.UnknownField,
      { field: issue.keys.join(Separator.List) },
    );
  }
  const path = (issue?.path ?? []).map(String).join(Separator.FieldPath);
  const detail = [path, issue?.message ?? Text.Empty]
    .filter((part) => part.length > 0)
    .join(Separator.Detail);
  return new ApiError(
    CanonicalCode.InvalidArgument,
    ErrorReason.ValidationFailed,
    MessageId.ValidationFailed,
    { detail },
  );
}

async function limitRate(
  capability: Capability,
  deps: PipelineDeps,
  principal: Principal,
): Promise<void> {
  if (capability.rateLimit === undefined || deps.rateLimiter === undefined) {
    return;
  }
  const key = [capability.id, principal.subject ?? principal.kind].join(Separator.Key);
  await deps.rateLimiter.consume(key, capability.rateLimit);
}

async function decide(
  capability: Capability,
  deps: PipelineDeps,
  context: CapabilityContext,
): Promise<PolicyOutcome | undefined> {
  if (capability.policy === undefined || deps.policy === undefined) {
    return undefined;
  }
  const decision = await deps.policy.evaluate(capability.policy, context.principal, context);
  deps.events?.publish({
    ...(await eventBase(capability, context, deps)),
    kind: EventKind.Decision,
    outcome: decision.outcome,
    reason: decision.reason,
  });
  if (decision.outcome === PolicyOutcome.Deny) {
    throw new ApiError(
      CanonicalCode.PermissionDenied,
      ErrorReason.PolicyDenied,
      MessageId.PolicyDenied,
      { capability: capability.id },
    );
  }
  return decision.outcome;
}

async function cacheKeyFor(
  capability: Capability,
  principal: Principal,
  input: unknown,
): Promise<string> {
  const includeSubject = capability.cache?.scope === CacheScope.Private;
  return [
    capability.id,
    await digest(await principalKey(principal, includeSubject)),
    await digest(JSON.stringify(input)),
  ].join(Separator.Key);
}

async function runHandler(
  capability: Capability,
  input: unknown,
  context: CapabilityContext,
): Promise<unknown> {
  const result = await capability.handler(input, context);
  const checked = capability.output.safeParse(result);
  if (!checked.success) {
    throw new ApiError(CanonicalCode.Internal, ErrorReason.InternalError, MessageId.InternalError);
  }
  return checked.data;
}

async function produce(
  capability: Capability,
  deps: PipelineDeps,
  input: unknown,
  context: CapabilityContext,
): Promise<InvokeResult> {
  const block = capability.cache;
  const cache = deps.cache;
  if (block === undefined || cache === undefined) {
    return { output: await runHandler(capability, input, context), cacheHit: false };
  }
  const key = await cacheKeyFor(capability, context.principal, input);
  const hit = await cache.get(key);
  if (hit !== undefined) {
    return { output: hit, cacheHit: true };
  }
  const output = await runHandler(capability, input, context);
  await cache.set(key, output, block);
  return { output, cacheHit: false };
}

async function mask(
  capability: Capability,
  deps: PipelineDeps,
  context: CapabilityContext,
  output: unknown,
): Promise<unknown> {
  if (capability.mask === undefined || deps.masker === undefined) {
    return output;
  }
  const result = await deps.masker.apply(output, context.principal, capability.mask);
  deps.events?.publish({
    ...(await eventBase(capability, context, deps)),
    kind: EventKind.Mask,
    maskedPaths: result.maskedPaths,
  });
  return result.output;
}

export async function createPipeline(deps: PipelineDeps = {}): Promise<Invoke> {
  const now = deps.now ?? (async () => performance.now());

  return async (capability, rawInput, context) => {
    const started = await now();
    let status = CanonicalCode.Ok;
    let cacheHit = false;
    let outcome: PolicyOutcome | undefined;
    let principal: Principal = context.principal;

    try {
      principal = await authenticate(capability, context);
      const effective: CapabilityContext = { ...context, principal };
      await preflight(capability, deps);
      await limitRate(capability, deps, principal);
      outcome = await decide(capability, deps, effective);

      const parsed = capability.input.safeParse(rawInput);
      if (!parsed.success) {
        throw await validationError(parsed.error);
      }
      const produced = await produce(capability, deps, parsed.data, effective);
      cacheHit = produced.cacheHit;
      const output = await mask(capability, deps, effective, produced.output);
      return { output, cacheHit, ...(outcome === undefined ? {} : { policyOutcome: outcome }) };
    } catch (error) {
      const apiError = await toApiError(error);
      status = apiError.code;
      throw apiError;
    } finally {
      await deps.observer?.record({
        capabilityId: capability.id,
        requestId: context.requestId,
        transport: context.transport,
        principalKind: principal.kind,
        status,
        latencyMs: (await now()) - started,
        cacheHit,
        ...(outcome === undefined ? {} : { policyOutcome: outcome }),
      });
    }
  };
}
