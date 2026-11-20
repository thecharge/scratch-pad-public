import { expect } from "bun:test";
import { InMemoryMetricExporter, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CanonicalCode,
  ErrorReason,
  MessageId,
  MethodKind,
  PolicyOutcome,
  PrincipalKind,
  SpanAttribute,
  TransportKind,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { instrument, startTelemetry } from "@platform/telemetry";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import type { Invoke, TelemetryHandle } from "@platform/types";
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
  handler: () => ({}),
});
const CONTEXT = {
  principal: { kind: PrincipalKind.User, scopes: [], roles: [] },
  requestId: "r",
  transport: TransportKind.Mcp,
  authEnabled: true,
};
const CALL = [CAPABILITY, {}, CONTEXT];
const RESULT = { output: { name: "b1" }, cacheHit: true, policyOutcome: PolicyOutcome.Allow };
const DENIED = new ApiError(
  CanonicalCode.PermissionDenied,
  ErrorReason.PolicyDenied,
  MessageId.PolicyDenied,
  { capability: CAPABILITY.id },
);

async function rig() {
  const spans = new InMemorySpanExporter();
  const metrics = new InMemoryMetricExporter(1);
  const reader = new PeriodicExportingMetricReader({
    exporter: metrics,
    exportIntervalMillis: 60000,
  });
  const telemetry = await startTelemetry([new SimpleSpanProcessor(spans)], [reader]);
  const lines: Record<string, unknown>[] = [];
  const logger = { info: (fields: Record<string, unknown>) => lines.push(fields) };
  return { spans, lines, deps: { ...telemetry, logger }, bare: telemetry };
}

const answers: Invoke = async () => RESULT;
const fails = (error: unknown): Invoke => {
  return async () => {
    throw error;
  };
};

const ATTRIBUTES = await rig();
const LOGGED = await rig();
const SILENT = await rig();
const LATE = await rig();

const attributesOf = (rigged: Awaited<ReturnType<typeof rig>>) => (result: unknown) => ({
  result,
  attributes: rigged.spans.getFinishedSpans()[0]?.attributes,
});

const SPAN_ATTRIBUTES = expect.objectContaining({
  [SpanAttribute.Capability]: "books.get",
  [SpanAttribute.Transport]: TransportKind.Mcp,
  [SpanAttribute.PrincipalKind]: PrincipalKind.User,
  [SpanAttribute.Status]: CanonicalCode.Ok,
  [SpanAttribute.CacheHit]: true,
  [SpanAttribute.PolicyOutcome]: PolicyOutcome.Allow,
});
const WRAPPED = { result: RESULT, attributes: SPAN_ATTRIBUTES };

unit(instrument, {
  positive: [
    positive(
      "returns the wrapped result and records the call on a span",
      [answers, ATTRIBUTES.deps],
      seen(attributesOf(ATTRIBUTES), WRAPPED),
      CALL,
    ),
    positive(
      "writes one log line with the trace ids and the capability",
      [answers, LOGGED.deps],
      seen(
        () => ({
          count: LOGGED.lines.length,
          traceIdMatches:
            LOGGED.lines[0]?.traceId === LOGGED.spans.getFinishedSpans()[0]?.spanContext().traceId,
          capability: LOGGED.lines[0]?.capability,
        }),
        { count: 1, traceIdMatches: true, capability: "books.get" },
      ),
      CALL,
    ),
    positive(
      "works without a logger",
      [answers, SILENT.bare],
      seen(() => SILENT.spans.getFinishedSpans().length, 1),
      CALL,
    ),
  ],
  negative: [
    negative(
      "a denied call is rethrown unchanged",
      [fails(DENIED), LATE.deps],
      { messageId: MessageId.PolicyDenied },
      CALL,
    ),
    negative(
      "any other failure is rethrown unchanged",
      [fails(new RangeError("boom")), LATE.deps],
      { message: "boom" },
      CALL,
    ),
  ],
});

const spanCount = async (exporter: InMemorySpanExporter, handle: TelemetryHandle) => {
  handle.tracer.startSpan("probe").end();
  return exporter.getFinishedSpans().length;
};

const EXPORTER_A = new InMemorySpanExporter();
const EXPORTER_B = new InMemorySpanExporter();
const EXPORTER_C = new InMemorySpanExporter();
const EXPORTER_D = new InMemorySpanExporter();

unit(startTelemetry, {
  positive: [
    positive(
      "a registered processor receives the spans of the tracer",
      [[new SimpleSpanProcessor(EXPORTER_A)], []],
      seen((handle: TelemetryHandle) => spanCount(EXPORTER_A, handle), 1),
    ),
    positive(
      "shutdown stops the processors",
      [[new SimpleSpanProcessor(EXPORTER_B)], []],
      seen(async (handle: TelemetryHandle) => {
        await spanCount(EXPORTER_B, handle);
        await handle.shutdown();
        return EXPORTER_B.getFinishedSpans().length;
      }, 0),
    ),
  ],
  negative: [
    rejected(
      "a processor that is not registered sees nothing",
      [[new SimpleSpanProcessor(EXPORTER_C)], []],
      seen((handle: TelemetryHandle) => spanCount(EXPORTER_D, handle), 0),
    ),
    rejected(
      "after shutdown new spans are not exported",
      [[new SimpleSpanProcessor(EXPORTER_D)], []],
      seen(async (handle: TelemetryHandle) => {
        await handle.shutdown();
        return spanCount(EXPORTER_D, handle);
      }, 0),
    ),
  ],
});
