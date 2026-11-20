import { describe, expect, test } from "bun:test";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CanonicalCode,
  ErrorMetadataKey,
  ErrorReason,
  MethodKind,
  TransportKind,
} from "@platform/constants";
import { createPipeline } from "@platform/pipeline";
import { FixedWindowRateLimiter, retryAfterSeconds } from "@platform/ratelimit";
import { thrownBy } from "@platform/test-framework";
import { ANONYMOUS_PRINCIPAL } from "@platform/types";
import { z } from "zod";

const BLOCK = { limit: 2, windowMs: 10_000 };

describe("FixedWindowRateLimiter", () => {
  test("allows up to the limit, then raises RESOURCE_EXHAUSTED with the delay", async () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(() => now);
    await limiter.consume("k", BLOCK);
    await limiter.consume("k", BLOCK);
    now = 4_000;
    const error = await thrownBy(() => limiter.consume("k", BLOCK));
    expect(error).toMatchObject({
      code: CanonicalCode.ResourceExhausted,
      reason: ErrorReason.RateLimited,
      httpStatus: 429,
      metadata: { [ErrorMetadataKey.RetryAfterSeconds]: "6" },
    });
    expect(await retryAfterSeconds(error as never)).toBe(6);
  });

  test("the window resets and keys are independent", async () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(() => now);
    await limiter.consume("a", BLOCK);
    await limiter.consume("a", BLOCK);
    await limiter.consume("b", BLOCK);
    now = 10_000;
    await limiter.consume("a", BLOCK);
    await limiter.consume("a", BLOCK);
    expect(await thrownBy(() => limiter.consume("a", BLOCK))).toMatchObject({ httpStatus: 429 });
  });

  test("the pipeline enforces a capability's rate limit", async () => {
    let calls = 0;
    const capability = await defineCapability({
      id: "ping.get",
      version: ApiVersion.V1,
      method: MethodKind.Get,
      resource: "pings/{ping}",
      summary: "s",
      description: "d",
      auth: AuthMode.None,
      input: z.strictObject({}),
      output: z.object({ n: z.number() }),
      rateLimit: { limit: 1, windowMs: 1000 },
      handler: () => ({ n: ++calls }),
    });
    const invoke = await createPipeline({ rateLimiter: new FixedWindowRateLimiter(() => 0) });
    const context = {
      principal: ANONYMOUS_PRINCIPAL,
      requestId: "r",
      transport: TransportKind.Mcp,
      authEnabled: false,
    };
    await invoke(capability, {}, context);
    expect(await thrownBy(() => invoke(capability, {}, context))).toMatchObject({
      reason: ErrorReason.RateLimited,
    });
    expect(calls).toBe(1);
  });
});
