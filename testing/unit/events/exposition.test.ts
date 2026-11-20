import { expect } from "bun:test";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { ZERO_RUNTIME } from "@platform/test-scenarios";
import { renderExposition } from "../../../packages/events/src/exposition.ts";

const CAPABILITY = {
  count: 3,
  errors: 1,
  cacheHits: 0,
  totalLatencyMs: 1500,
  firstSeen: "a",
  lastSeen: "b",
};
const BASE = { name: "stats", total: 3, errors: 1, cacheHits: 0, byCapability: {} };
const PROCESS = {
  ...ZERO_RUNTIME.process,
  rssBytes: 1234,
  cpuUserMicros: 2_500_000,
  openStreams: 2,
  runningOperations: 1,
  heapCollections: 7,
  heapFreedBytes: 900,
};
const ROUTE = { count: 4, totalMs: 2000, maxMs: 500 };
const STAGES = { route: ROUTE };
const WITH_PROCESS = { ...BASE, process: PROCESS, stages: STAGES, operations: {} };
const OPERATIONS = {
  "books.get|text/event-stream|3": {
    count: 5,
    errors: 1,
    totalMs: 500,
    maxMs: 200,
    bytes: 99,
    buckets: [],
    firstByteTotalMs: 50,
    firstByteMaxMs: 20,
    firstByteBuckets: [],
  },
};
const CAPABILITIES = { 'books."x"': CAPABILITY };
const WITH_OPERATION = { ...WITH_PROCESS, operations: OPERATIONS };
const WITH_CAPABILITY = { ...WITH_PROCESS, byCapability: CAPABILITIES };
const lines = (text: unknown) => String(text).split("\n");

unit(renderExposition, {
  positive: [
    positive(
      "writes the memory of the process as a gauge with its type line",
      [WITH_PROCESS],
      seen(
        lines,
        expect.arrayContaining([
          "# TYPE platform_process_resident_memory_bytes gauge",
          "platform_process_resident_memory_bytes 1234",
        ]),
      ),
    ),
    positive(
      "writes processor time in seconds as a counter",
      [WITH_PROCESS],
      seen(lines, expect.arrayContaining(["platform_process_cpu_user_seconds_total 2.5"])),
    ),
    positive(
      "writes a stage with its label, its count and its time in seconds",
      [WITH_PROCESS],
      seen(
        lines,
        expect.arrayContaining([
          'platform_http_stage_count_total{stage="route"} 4',
          'platform_http_stage_seconds_total{stage="route"} 2',
          'platform_http_stage_max_seconds{stage="route"} 0.5',
        ]),
      ),
    ),
    positive(
      "escapes a quote in a capability name",
      [WITH_CAPABILITY],
      seen(
        lines,
        expect.arrayContaining(['platform_capability_calls_total{capability="books.\\"x\\""} 3']),
      ),
    ),
    positive(
      "writes an operation with its capability, form and HTTP version",
      [WITH_OPERATION],
      seen(
        lines,
        expect.arrayContaining([
          'platform_http_operation_count_total{capability="books.get",form="text/event-stream",http_version="3"} 5',
          'platform_http_operation_bytes_total{capability="books.get",form="text/event-stream",http_version="3"} 99',
        ]),
      ),
    ),
    positive(
      "writes the open streams, running operations and inferred collections",
      [WITH_PROCESS],
      seen(
        lines,
        expect.arrayContaining([
          "platform_http_open_streams 2",
          "platform_operations_running 1",
          "platform_process_heap_collections_inferred_total 7",
          "platform_process_heap_freed_bytes_total 900",
        ]),
      ),
    ),
    positive(
      "writes the time to the first byte of an operation",
      [WITH_OPERATION],
      seen(
        lines,
        expect.arrayContaining([
          'platform_http_operation_first_byte_seconds_total{capability="books.get",form="text/event-stream",http_version="3"} 0.05',
          'platform_http_operation_first_byte_max_seconds{capability="books.get",form="text/event-stream",http_version="3"} 0.02',
        ]),
      ),
    ),
  ],
  negative: [
    negative("needs a snapshot", [undefined], { name: "TypeError" }),
    negative("needs the process section", [BASE], { name: "TypeError" }),
  ],
});
