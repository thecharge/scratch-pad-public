import { describe, expect, test } from "bun:test";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CacheScope,
  CanonicalCode,
  ErrorReason,
  EventKind,
  MaskStrategy,
  MethodKind,
  PolicyOutcome,
  PolicyReason,
  PrincipalKind,
  TransportKind,
} from "@platform/constants";
import { createPipeline } from "@platform/pipeline";
import { thrownBy } from "@platform/test-framework";
import {
  ANONYMOUS_PRINCIPAL,
  type ApiEvent,
  type Capability,
  type CapabilityContext,
  type CapabilityDefinition,
  type PipelineDeps,
  type PipelineRecord,
  type Principal,
} from "@platform/types";
import { z } from "zod";

const USER: Principal = { kind: PrincipalKind.User, subject: "u1", scopes: ["read"], roles: [] };
const OTHER: Principal = { ...USER, subject: "u2" };
const INPUT = z.strictObject({ name: z.string() });
const OUTPUT = z.object({ name: z.string(), email: z.string() });
const MASK_RULE = { path: "email", strategy: MaskStrategy.Remove };
const ALL_BLOCKS = {
  rateLimit: { limit: 5, windowMs: 1000 },
  policy: {},
  cache: { ttlMs: 1000, scope: CacheScope.Private },
  mask: { rules: [MASK_RULE] },
};

function context(overrides: Partial<CapabilityContext> = {}): CapabilityContext {
  return {
    principal: USER,
    requestId: "r1",
    transport: TransportKind.Http,
    authEnabled: true,
    ...overrides,
  };
}

async function build(
  trace: string[],
  overrides: Partial<CapabilityDefinition<z.ZodType, z.ZodType>> = {},
): Promise<Capability> {
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
    handler: ({ name }: z.infer<typeof INPUT>) => {
      trace.push("handler");
      return { name, email: "a@example.com" };
    },
    ...overrides,
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

function recording(trace: string[]): PipelineDeps {
  const tap = <T>(step: string, value: T): T => {
    trace.push(step);
    return value;
  };
  return {
    rateLimiter: { consume: async () => tap("rateLimit", undefined) },
    policy: {
      evaluate: () => tap("policy", { outcome: PolicyOutcome.Allow, reason: PolicyReason.Allowed }),
    },
    cache: {
      get: async () => tap("cacheGet", undefined),
      set: async () => tap("cacheSet", undefined),
    },
    masker: { apply: (output) => tap("mask", { output, maskedPaths: [] }) },
    observer: { record: () => tap("observe", undefined) },
  };
}

async function run(trace: string[], capability: Capability, deps: PipelineDeps = recording(trace)) {
  return (await createPipeline(deps))(capability, { name: "n" }, context());
}

describe("step ordering", () => {
  test("auth, rate limit, policy, cache, handler, cache write, mask, observe", async () => {
    const trace: string[] = [];
    await run(trace, await build(trace, ALL_BLOCKS));
    expect(trace).toEqual([
      "rateLimit",
      "policy",
      "cacheGet",
      "handler",
      "cacheSet",
      "mask",
      "observe",
    ]);
  });
});

describe("optional blocks run only when declared", () => {
  test.each([
    ["no blocks", {}, ["handler", "observe"]],
    ["only policy", { policy: {} }, ["policy", "handler", "observe"]],
    ["only mask", { mask: ALL_BLOCKS.mask }, ["handler", "mask", "observe"]],
    ["only rate limit", { rateLimit: ALL_BLOCKS.rateLimit }, ["rateLimit", "handler", "observe"]],
  ])("%s", async (_name, blocks, expected) => {
    const trace: string[] = [];
    await run(trace, await build(trace, blocks));
    expect(trace).toEqual(expected);
  });
});

describe("a declared block without an implementation fails closed before the handler", () => {
  test.each([
    ["policy", { policy: {} }],
    ["mask", { mask: ALL_BLOCKS.mask }],
    ["rate limit", { rateLimit: ALL_BLOCKS.rateLimit }],
  ])("%s", async (_name, blocks) => {
    const trace: string[] = [];
    expect(await thrownBy(async () => run(trace, await build(trace, blocks), {}))).toMatchObject({
      code: CanonicalCode.Internal,
    });
    expect(trace).toEqual([]);
  });

  test("a cache block without a cache only skips caching", async () => {
    const trace: string[] = [];
    const result = await run(trace, await build(trace, { cache: ALL_BLOCKS.cache }), {});
    expect(result.cacheHit).toBe(false);
  });
});

describe("auth modes", () => {
  test.each([
    [AuthMode.None, true, USER, undefined],
    [AuthMode.Optional, true, ANONYMOUS_PRINCIPAL, undefined],
    [AuthMode.Optional, false, USER, undefined],
    [AuthMode.Required, true, USER, undefined],
    [AuthMode.Required, true, ANONYMOUS_PRINCIPAL, ErrorReason.TokenMissing],
    [AuthMode.Required, false, USER, ErrorReason.AuthNotEnabled],
  ])("%s with auth enabled=%s for %o", async (auth, authEnabled, principal, reason) => {
    const trace: string[] = [];
    const outcome = await thrownBy(async () =>
      (await createPipeline())(
        await build(trace, { auth }),
        { name: "n" },
        context({ authEnabled, principal }),
      ),
    );
    expect(outcome).toEqual(reason === undefined ? undefined : expect.objectContaining({ reason }));
  });

  test("none and optional-with-auth-off run as anonymous", async () => {
    const seen: Principal[] = [];
    const handler = (_input: unknown, ctx: CapabilityContext) => {
      seen.push(ctx.principal);
      return { name: "n", email: "e" };
    };
    await (await createPipeline())(
      await build([], { auth: AuthMode.None, handler }),
      { name: "n" },
      context(),
    );
    await (await createPipeline())(
      await build([], { auth: AuthMode.Optional, handler }),
      { name: "n" },
      context({ authEnabled: false }),
    );
    expect(seen).toEqual([ANONYMOUS_PRINCIPAL, ANONYMOUS_PRINCIPAL]);
  });
});

describe("policy", () => {
  const deny: PipelineDeps = {
    policy: {
      evaluate: () => ({ outcome: PolicyOutcome.Deny, reason: PolicyReason.MissingScope }),
    },
  };

  test("a deny stops the call before the handler", async () => {
    const trace: string[] = [];
    expect(
      await thrownBy(async () => run(trace, await build(trace, { policy: {} }), deny)),
    ).toMatchObject({
      code: CanonicalCode.PermissionDenied,
    });
    expect(trace).toEqual([]);
  });

  test("runs before validation so a denied caller learns nothing about the input", async () => {
    const outcome = await thrownBy(async () =>
      (await createPipeline(deny))(await build([], { policy: {} }), { wrong: 1 }, context()),
    );
    expect(outcome).toMatchObject({ code: CanonicalCode.PermissionDenied });
  });
});

describe("validation", () => {
  test.each([
    ["a wrong type", { name: 5 }, ErrorReason.ValidationFailed],
    ["an unknown field", { name: "n", extra: true }, ErrorReason.UnknownField],
  ])("%s never reaches the handler", async (_name, input, reason) => {
    const trace: string[] = [];
    expect(
      await thrownBy(async () => (await createPipeline())(await build(trace), input, context())),
    ).toMatchObject({
      code: CanonicalCode.InvalidArgument,
      reason,
    });
    expect(trace).toEqual([]);
  });

  test("an output that violates its schema is an internal error", async () => {
    const capability = await build([], { handler: () => ({ name: 5 }) });
    expect(await thrownBy(() => run([], capability, {}))).toMatchObject({
      code: CanonicalCode.Internal,
    });
  });
});

describe("cache", () => {
  function memory() {
    const store = new Map<string, unknown>();
    return {
      store,
      cache: {
        get: async (key: string) => store.get(key),
        set: async (key: string, value: unknown) => void store.set(key, value),
      },
    };
  }

  test("an identical second call is served without the handler", async () => {
    const trace: string[] = [];
    const invoke = await createPipeline({ cache: memory().cache });
    const capability = await build(trace, { cache: ALL_BLOCKS.cache });
    const first = await invoke(capability, { name: "n" }, context());
    const second = await invoke(capability, { name: "n" }, context());
    expect([first.cacheHit, second.cacheHit, trace]).toEqual([false, true, ["handler"]]);
  });

  test.each([
    [CacheScope.Private, ["handler", "handler"]],
    [CacheScope.Public, ["handler"]],
  ])("%s scope across two subjects with the same scopes", async (scope, expected) => {
    const trace: string[] = [];
    const invoke = await createPipeline({ cache: memory().cache });
    const capability = await build(trace, { cache: { ttlMs: 1000, scope } });
    await invoke(capability, { name: "n" }, context({ principal: USER }));
    await invoke(capability, { name: "n" }, context({ principal: OTHER }));
    expect(trace).toEqual(expected);
  });

  test("entries are stored before masking so each caller is masked on its own", async () => {
    const { cache, store } = memory();
    const masker = {
      apply: (output: unknown, principal: Principal) => ({
        output: principal.subject === "u1" ? output : { ...(output as object), email: "***" },
        maskedPaths: [],
      }),
    };
    const invoke = await createPipeline({ cache, masker });
    const capability = await build([], {
      cache: { ttlMs: 1000, scope: CacheScope.Public },
      mask: ALL_BLOCKS.mask,
    });
    const full = await invoke(capability, { name: "n" }, context({ principal: USER }));
    const masked = await invoke(capability, { name: "n" }, context({ principal: OTHER }));
    expect([full.output, masked.output, [...store.values()]]).toEqual([
      { name: "n", email: "a@example.com" },
      { name: "n", email: "***" },
      [{ name: "n", email: "a@example.com" }],
    ]);
  });
});

describe("events", () => {
  test("a decision and a mask event are published without payloads", async () => {
    const events: ApiEvent[] = [];
    const deps: PipelineDeps = {
      ...recording([]),
      events: { publish: (event) => events.push(event) },
      masker: { apply: (output) => ({ output, maskedPaths: ["email"] }) },
    };
    await run([], await build([], { policy: {}, mask: ALL_BLOCKS.mask }), deps);
    expect(events.map((event) => event.kind)).toEqual([EventKind.Decision, EventKind.Mask]);
    expect(events[1]).toMatchObject({ maskedPaths: ["email"], capability: "books.get" });
    expect(JSON.stringify(events)).not.toContain("a@example.com");
  });

  test("a denied call still publishes its decision", async () => {
    const events: ApiEvent[] = [];
    const deps: PipelineDeps = {
      policy: {
        evaluate: () => ({ outcome: PolicyOutcome.Deny, reason: PolicyReason.MissingRole }),
      },
      events: { publish: (event) => events.push(event) },
    };
    await thrownBy(async () => run([], await build([], { policy: {} }), deps));
    expect(events).toMatchObject([{ kind: EventKind.Decision, outcome: PolicyOutcome.Deny }]);
  });
});

describe("observer", () => {
  test("records status, latency and cache outcome and never the payload", async () => {
    const records: PipelineRecord[] = [];
    let tick = 0;
    const invoke = await createPipeline({
      observer: { record: (record) => records.push(record) },
      now: async () => (tick += 5),
    });
    await invoke(await build([]), { name: "n" }, context());
    await thrownBy(async () => invoke(await build([]), { name: 1 }, context()));
    expect(records.map((record) => [record.status, record.latencyMs])).toEqual([
      [CanonicalCode.Ok, 5],
      [CanonicalCode.InvalidArgument, 5],
    ]);
    expect(JSON.stringify(records)).not.toContain("a@example.com");
  });
});
