import { describe, expect, test } from "bun:test";
import { InMemoryMetricExporter, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CanonicalCode,
  MethodKind,
  MetricName,
  PolicyOutcome,
  PolicyReason,
  PrincipalKind,
  SpanAttribute,
  TransportKind,
} from "@platform/constants";
import { createPipeline } from "@platform/pipeline";
import { instrument, startTelemetry } from "@platform/telemetry";
import { thrownBy } from "@platform/test-framework";
import { z } from "zod";

const CAPABILITY = await defineCapability({
  id: "books.get",
  version: ApiVersion.V1,
  method: MethodKind.Get,
  resource: "books/{book}",
  summary: "s",
  description: "d",
  auth: AuthMode.None,
  input: z.object({}),
  output: z.object({}),
  policy: {},
  handler: () => ({}),
});

const CONTEXT = {
  principal: { kind: PrincipalKind.User, scopes: [], roles: [] },
  requestId: "r",
  transport: TransportKind.Mcp,
  authEnabled: true,
};

async function setup(outcome: PolicyOutcome) {
  const spans = new InMemorySpanExporter();
  const metrics = new InMemoryMetricExporter(1);
  const reader = new PeriodicExportingMetricReader({
    exporter: metrics,
    exportIntervalMillis: 60000,
  });
  const telemetry = await startTelemetry([new SimpleSpanProcessor(spans)], [reader]);
  const lines: Record<string, unknown>[] = [];
  const logger = { info: (fields: Record<string, unknown>) => lines.push(fields) };
  const pipeline = await createPipeline({
    policy: { evaluate: () => ({ outcome, reason: PolicyReason.Allowed }) },
  });
  return {
    spans,
    metrics,
    reader,
    telemetry,
    lines,
    invoke: await instrument(pipeline, { ...telemetry, logger }),
  };
}

describe("instrument", () => {
  test("a successful call emits a span with the call's attributes", async () => {
    const { invoke, spans } = await setup(PolicyOutcome.Allow);
    await invoke(CAPABILITY, {}, CONTEXT);
    expect(spans.getFinishedSpans()[0]?.attributes).toMatchObject({
      [SpanAttribute.Capability]: "books.get",
      [SpanAttribute.Transport]: TransportKind.Mcp,
      [SpanAttribute.PrincipalKind]: PrincipalKind.User,
      [SpanAttribute.Status]: CanonicalCode.Ok,
      [SpanAttribute.CacheHit]: false,
      [SpanAttribute.PolicyOutcome]: PolicyOutcome.Allow,
    });
  });

  test("a denied call is an error span with the deny outcome", async () => {
    const { invoke, spans } = await setup(PolicyOutcome.Deny);
    await thrownBy(() => invoke(CAPABILITY, {}, CONTEXT));
    expect(spans.getFinishedSpans()[0]?.attributes).toMatchObject({
      [SpanAttribute.Status]: CanonicalCode.PermissionDenied,
      [SpanAttribute.PolicyOutcome]: PolicyOutcome.Deny,
    });
  });

  test("the log line carries the trace and span ids and no payload", async () => {
    const { invoke, lines, spans } = await setup(PolicyOutcome.Allow);
    await invoke(CAPABILITY, { secret: "x" }, CONTEXT);
    const span = spans.getFinishedSpans()[0];
    expect(lines[0]).toMatchObject({
      traceId: span?.spanContext().traceId,
      spanId: span?.spanContext().spanId,
      capability: "books.get",
    });
    expect(JSON.stringify(lines)).not.toContain("secret");
  });

  test("metrics count the call and record its latency", async () => {
    const { invoke, metrics, reader } = await setup(PolicyOutcome.Allow);
    await invoke(CAPABILITY, {}, CONTEXT);
    await reader.forceFlush();
    const names = metrics
      .getMetrics()
      .flatMap((resource) => resource.scopeMetrics)
      .flatMap((scope) => scope.metrics)
      .map((metric) => metric.descriptor.name)
      .sort();
    expect(names).toEqual([MetricName.Calls, MetricName.Latency].sort());
  });
});
