import {
  CANONICAL_CODE_HTTP_STATUS,
  DEFAULT_LOG_LIMIT,
  EventKind,
  MAX_LOG_LIMIT,
  MAX_SUBSCRIBERS,
  RECENT_EVENTS_MAX,
} from "@platform/constants";
import type {
  ApiEvent,
  EventListener,
  EventQuery,
  EventSink,
  Observer,
  PipelineRecord,
} from "@platform/types";

export class EventBus implements EventSink {
  private listeners: EventListener[];
  private history: ApiEvent[];

  constructor() {
    this.listeners = [];
    this.history = [];
  }

  async publish(event: ApiEvent): Promise<void> {
    this.history.push(event);
    if (this.history.length > RECENT_EVENTS_MAX) {
      this.history.shift();
    }
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  subscribe(listener: EventListener): () => void {
    if (this.listeners.length >= MAX_SUBSCRIBERS) {
      return async () => undefined;
    }
    this.listeners = [...this.listeners, listener];
    return async () => {
      this.listeners = this.listeners.filter((candidate) => candidate !== listener);
    };
  }

  async stream(): Promise<ReadableStream<ApiEvent>> {
    let unsubscribe: (() => void | Promise<void>) | undefined;
    return new ReadableStream<ApiEvent>({
      start: async (controller) => {
        unsubscribe = this.subscribe((event) => controller.enqueue(event));
      },
      cancel: async () => {
        await unsubscribe?.();
      },
    });
  }

  async recent(query: EventQuery): Promise<ApiEvent[]> {
    const limit = Math.min(query.limit ?? DEFAULT_LOG_LIMIT, MAX_LOG_LIMIT);
    return this.history
      .filter((event) => query.kind === undefined || event.kind === query.kind)
      .filter((event) => query.capability === undefined || event.capability === query.capability)
      .slice(-limit);
  }
}

export async function observerFor(
  bus: EventBus,
  date: () => Promise<Date> = async () => new Date(),
): Promise<Observer> {
  return {
    record: async (record: PipelineRecord) =>
      bus.publish({
        kind: EventKind.Request,
        time: (await date()).toISOString(),
        requestId: record.requestId,
        capability: record.capabilityId,
        transport: record.transport,
        principalKind: record.principalKind,
        status: CANONICAL_CODE_HTTP_STATUS[record.status],
        latencyMs: record.latencyMs,
        cacheHit: record.cacheHit,
      }),
  };
}
