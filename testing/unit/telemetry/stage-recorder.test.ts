import { InMemoryMetricExporter, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { HttpStage, MetricName, SpanAttribute } from "@platform/constants";
import { stageRecorder, startTelemetry } from "@platform/telemetry";
import { negative, positive, seen, unit } from "@platform/test-factories";
import type { JsonObject, StageRecorder } from "@platform/types";

const exporter = new InMemoryMetricExporter(1);
const reader = new PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 60000 });
const telemetry = await startTelemetry([], [reader]);
const recorder = (await stageRecorder(telemetry)) as StageRecorder;

const exported = async () => {
  await reader.forceFlush();
  return exporter
    .getMetrics()
    .flatMap((batch) => batch.scopeMetrics)
    .flatMap((scope) => scope.metrics)
    .filter((metric) => metric.descriptor.name === MetricName.StageLatency)
    .flatMap((metric) => metric.dataPoints as unknown as JsonObject[])
    .map((point) => (point.attributes as JsonObject)[SpanAttribute.Stage]);
};
const recording = async () => {
  await recorder.record(HttpStage.Route, 1.5);
  return await exported();
};
const SAMPLE = {
  capability: "books.get",
  form: "application/json",
  version: "2.0",
  status: 200,
  elapsedMs: 3,
  firstByteMs: 1,
  bytes: 10,
};
const operating = async () => {
  await recorder.operation(SAMPLE);
  await reader.forceFlush();
  return exporter
    .getMetrics()
    .flatMap((batch) => batch.scopeMetrics)
    .flatMap((scope) => scope.metrics)
    .filter((metric) => metric.descriptor.name === MetricName.OperationLatency)
    .flatMap((metric) => metric.dataPoints as unknown as JsonObject[])
    .map((point) => (point.attributes as JsonObject)[SpanAttribute.HttpVersion]);
};
const BROKEN = { meter: undefined } as never;

unit(stageRecorder, {
  positive: [
    positive(
      "returns a recorder",
      [telemetry],
      seen((value: StageRecorder) => typeof value.record, "function"),
    ),
    positive(
      "records a stage in the stage latency histogram",
      [telemetry],
      seen(recording, [HttpStage.Route]),
    ),
    positive("records an operation with its HTTP version", [telemetry], seen(operating, ["2.0"])),
  ],
  negative: [
    negative("needs a meter", [BROKEN], { name: "TypeError" }),
    negative("needs the dependencies", [undefined as never], { name: "TypeError" }),
  ],
});
