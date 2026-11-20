import {
  EXPOSITION_BACKSLASH,
  EXPOSITION_CAPABILITY_LABEL,
  EXPOSITION_EQUALS,
  EXPOSITION_ESCAPED_BACKSLASH,
  EXPOSITION_ESCAPED_QUOTE,
  EXPOSITION_FORM_LABEL,
  EXPOSITION_LABEL_CLOSE,
  EXPOSITION_LABEL_OPEN,
  EXPOSITION_LIST,
  EXPOSITION_NEWLINE,
  EXPOSITION_QUOTE,
  EXPOSITION_SPACE,
  EXPOSITION_STAGE_LABEL,
  EXPOSITION_TYPE_PREFIX,
  EXPOSITION_VERSION_LABEL,
  ExpositionMetric,
  ExpositionType,
  MICROSECONDS_PER_SECOND,
  MS_PER_SECOND,
  OPERATION_KEY_SEPARATOR,
  Text,
} from "@platform/constants";
import type { ExpositionSample, OperationStats, StatsSnapshot } from "@platform/types";

async function labelled(key: string, value: string): Promise<string> {
  const escaped = value
    .replaceAll(EXPOSITION_BACKSLASH, EXPOSITION_ESCAPED_BACKSLASH)
    .replaceAll(EXPOSITION_QUOTE, EXPOSITION_ESCAPED_QUOTE);
  return [
    EXPOSITION_LABEL_OPEN,
    key,
    EXPOSITION_EQUALS,
    EXPOSITION_QUOTE,
    escaped,
    EXPOSITION_QUOTE,
    EXPOSITION_LABEL_CLOSE,
  ].join(Text.Empty);
}

async function family(
  name: ExpositionMetric,
  type: ExpositionType,
  samples: readonly ExpositionSample[],
): Promise<string[]> {
  return [
    [EXPOSITION_TYPE_PREFIX, name, type].join(EXPOSITION_SPACE),
    ...samples.map(([labels, value]) => [name, labels, EXPOSITION_SPACE, value].join(Text.Empty)),
  ];
}

async function operationLabels(key: string): Promise<string> {
  const [capability = Text.Empty, form = Text.Empty, version = Text.Empty] =
    key.split(OPERATION_KEY_SEPARATOR);
  const parts = [
    [EXPOSITION_CAPABILITY_LABEL, capability],
    [EXPOSITION_FORM_LABEL, form],
    [EXPOSITION_VERSION_LABEL, version],
  ] as const;
  const labelled: string[] = [];
  for (const [name, value] of parts) {
    const escaped = value
      .replaceAll(EXPOSITION_BACKSLASH, EXPOSITION_ESCAPED_BACKSLASH)
      .replaceAll(EXPOSITION_QUOTE, EXPOSITION_ESCAPED_QUOTE);
    labelled.push(
      [name, EXPOSITION_EQUALS, EXPOSITION_QUOTE, escaped, EXPOSITION_QUOTE].join(Text.Empty),
    );
  }
  return [EXPOSITION_LABEL_OPEN, labelled.join(EXPOSITION_LIST), EXPOSITION_LABEL_CLOSE].join(
    Text.Empty,
  );
}

async function perOperation(
  entries: readonly (readonly [string, OperationStats])[],
  pick: (value: OperationStats) => number,
): Promise<ExpositionSample[]> {
  const samples: ExpositionSample[] = [];
  for (const [key, value] of entries) {
    samples.push([await operationLabels(key), pick(value)]);
  }
  return samples;
}

async function perKey<T>(
  entries: readonly (readonly [string, T])[],
  key: string,
  pick: (value: T) => number,
): Promise<ExpositionSample[]> {
  const samples: ExpositionSample[] = [];
  for (const [name, value] of entries) {
    samples.push([await labelled(key, name), pick(value)]);
  }
  return samples;
}

export async function renderExposition(snapshot: StatsSnapshot): Promise<string> {
  const runtime = snapshot.process;
  const stages = Object.entries(snapshot.stages);
  const capabilities = Object.entries(snapshot.byCapability);
  const operations = Object.entries(snapshot.operations);
  const gauge = async (name: ExpositionMetric, value: number) =>
    family(name, ExpositionType.Gauge, [[Text.Empty, value]]);
  const counter = async (name: ExpositionMetric, value: number) =>
    family(name, ExpositionType.Counter, [[Text.Empty, value]]);
  const lines = [
    ...(await gauge(ExpositionMetric.ResidentMemory, runtime.rssBytes)),
    ...(await gauge(ExpositionMetric.HeapTotal, runtime.heapTotalBytes)),
    ...(await gauge(ExpositionMetric.HeapUsed, runtime.heapUsedBytes)),
    ...(await gauge(ExpositionMetric.External, runtime.externalBytes)),
    ...(await counter(ExpositionMetric.CpuUser, runtime.cpuUserMicros / MICROSECONDS_PER_SECOND)),
    ...(await counter(
      ExpositionMetric.CpuSystem,
      runtime.cpuSystemMicros / MICROSECONDS_PER_SECOND,
    )),
    ...(await gauge(
      ExpositionMetric.EventLoopDelayMax,
      runtime.eventLoopDelayMaxMs / MS_PER_SECOND,
    )),
    ...(await gauge(ExpositionMetric.Uptime, runtime.uptimeSeconds)),
    ...(await gauge(ExpositionMetric.InFlight, runtime.requestsInFlight)),
    ...(await gauge(ExpositionMetric.OpenStreams, runtime.openStreams)),
    ...(await gauge(ExpositionMetric.RunningOperations, runtime.runningOperations)),
    ...(await gauge(ExpositionMetric.ResidentMemoryStart, runtime.startRssBytes)),
    ...(await counter(ExpositionMetric.HeapCollections, runtime.heapCollections)),
    ...(await counter(ExpositionMetric.HeapFreed, runtime.heapFreedBytes)),
    ...(await family(
      ExpositionMetric.StageCount,
      ExpositionType.Counter,
      await perKey(stages, EXPOSITION_STAGE_LABEL, (stats) => stats.count),
    )),
    ...(await family(
      ExpositionMetric.StageSum,
      ExpositionType.Counter,
      await perKey(stages, EXPOSITION_STAGE_LABEL, (stats) => stats.totalMs / MS_PER_SECOND),
    )),
    ...(await family(
      ExpositionMetric.StageMax,
      ExpositionType.Gauge,
      await perKey(stages, EXPOSITION_STAGE_LABEL, (stats) => stats.maxMs / MS_PER_SECOND),
    )),
    ...(await family(
      ExpositionMetric.CapabilityCalls,
      ExpositionType.Counter,
      await perKey(capabilities, EXPOSITION_CAPABILITY_LABEL, (stats) => stats.count),
    )),
    ...(await family(
      ExpositionMetric.CapabilityErrors,
      ExpositionType.Counter,
      await perKey(capabilities, EXPOSITION_CAPABILITY_LABEL, (stats) => stats.errors),
    )),
    ...(await family(
      ExpositionMetric.CapabilitySum,
      ExpositionType.Counter,
      await perKey(
        capabilities,
        EXPOSITION_CAPABILITY_LABEL,
        (stats) => stats.totalLatencyMs / MS_PER_SECOND,
      ),
    )),
    ...(await family(
      ExpositionMetric.OperationCount,
      ExpositionType.Counter,
      await perOperation(operations, (stats) => stats.count),
    )),
    ...(await family(
      ExpositionMetric.OperationErrors,
      ExpositionType.Counter,
      await perOperation(operations, (stats) => stats.errors),
    )),
    ...(await family(
      ExpositionMetric.OperationSum,
      ExpositionType.Counter,
      await perOperation(operations, (stats) => stats.totalMs / MS_PER_SECOND),
    )),
    ...(await family(
      ExpositionMetric.OperationMax,
      ExpositionType.Gauge,
      await perOperation(operations, (stats) => stats.maxMs / MS_PER_SECOND),
    )),
    ...(await family(
      ExpositionMetric.FirstByteSum,
      ExpositionType.Counter,
      await perOperation(operations, (stats) => stats.firstByteTotalMs / MS_PER_SECOND),
    )),
    ...(await family(
      ExpositionMetric.FirstByteMax,
      ExpositionType.Gauge,
      await perOperation(operations, (stats) => stats.firstByteMaxMs / MS_PER_SECOND),
    )),
    ...(await family(
      ExpositionMetric.OperationBytes,
      ExpositionType.Counter,
      await perOperation(operations, (stats) => stats.bytes),
    )),
  ];
  return lines.join(EXPOSITION_NEWLINE) + EXPOSITION_NEWLINE;
}
