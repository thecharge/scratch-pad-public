import { SpanStatusCode } from "@opentelemetry/api";
import { type IMetricReader, MeterProvider } from "@opentelemetry/sdk-metrics";
import { BasicTracerProvider, type SpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
  CanonicalCode,
  ErrorReason,
  LogField,
  MessageId,
  MetricName,
  PolicyOutcome,
  SpanAttribute,
  SpanName,
  TELEMETRY_SCOPE,
} from "@platform/constants";
import { toApiError } from "@platform/errors";
import { message } from "@platform/messages";
import type { Invoke, StageRecorder, TelemetryDeps, TelemetryHandle } from "@platform/types";

export async function startTelemetry(
  processors: SpanProcessor[],
  readers: IMetricReader[],
): Promise<TelemetryHandle> {
  const tracerProvider = new BasicTracerProvider({ spanProcessors: processors });
  const meterProvider = new MeterProvider({ readers });
  return {
    tracer: tracerProvider.getTracer(TELEMETRY_SCOPE),
    meter: meterProvider.getMeter(TELEMETRY_SCOPE),
    shutdown: async () => {
      await tracerProvider.shutdown();
      await meterProvider.shutdown();
    },
  };
}

async function outcomeOf(error: unknown): Promise<PolicyOutcome | undefined> {
  return (await toApiError(error)).reason === ErrorReason.PolicyDenied
    ? PolicyOutcome.Deny
    : undefined;
}

export async function instrument(invoke: Invoke, deps: TelemetryDeps): Promise<Invoke> {
  const calls = deps.meter.createCounter(MetricName.Calls);
  const latency = deps.meter.createHistogram(MetricName.Latency);
  return async (capability, input, context) => {
    const span = deps.tracer.startSpan(SpanName.CapabilityInvoke);
    const started = performance.now();
    let status = CanonicalCode.Ok;
    span.setAttributes({
      [SpanAttribute.Capability]: capability.id,
      [SpanAttribute.Transport]: context.transport,
      [SpanAttribute.PrincipalKind]: context.principal.kind,
    });
    try {
      const result = await invoke(capability, input, context);
      span.setAttributes({
        [SpanAttribute.CacheHit]: result.cacheHit,
        ...(result.policyOutcome === undefined
          ? {}
          : { [SpanAttribute.PolicyOutcome]: result.policyOutcome }),
      });
      return result;
    } catch (error) {
      status = (await toApiError(error)).code;
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.setAttribute(
        SpanAttribute.PolicyOutcome,
        (await outcomeOf(error)) ?? PolicyOutcome.Allow,
      );
      throw error;
    } finally {
      const elapsed = performance.now() - started;
      span.setAttribute(SpanAttribute.Status, status);
      span.end();
      calls.add(1, { [SpanAttribute.Capability]: capability.id, [SpanAttribute.Status]: status });
      latency.record(elapsed, { [SpanAttribute.Capability]: capability.id });
      deps.logger?.info(
        {
          [LogField.TraceId]: span.spanContext().traceId,
          [LogField.SpanId]: span.spanContext().spanId,
          [LogField.Capability]: capability.id,
          [LogField.Transport]: context.transport,
          [LogField.Status]: status,
          [LogField.LatencyMs]: elapsed,
        },
        message(MessageId.LogRequest),
      );
    }
  };
}

export async function stageRecorder(deps: TelemetryDeps): Promise<StageRecorder> {
  const latency = deps.meter.createHistogram(MetricName.StageLatency);
  const operations = deps.meter.createHistogram(MetricName.OperationLatency);
  return {
    record: async (stage, elapsedMs) => {
      latency.record(elapsedMs, { [SpanAttribute.Stage]: stage });
    },
    operation: async (sample) => {
      operations.record(sample.elapsedMs, {
        [SpanAttribute.Capability]: sample.capability,
        [SpanAttribute.Form]: sample.form,
        [SpanAttribute.HttpVersion]: sample.version,
      });
    },
  };
}
