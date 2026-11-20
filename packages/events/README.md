# @platform/events

The in-process event bus and what hangs off it. `EventBus` implements the pipeline's `EventSink`, keeps the most recent 500 events and notifies a bounded number of subscribers. `observerFor(bus)` turns the pipeline's per-call record into a `request` event. Events never carry request or response payloads.

- `StatsCollector` aggregates request events per capability in a bounded store and answers the `stats.get` and `logs.list` capabilities through the `ObservabilityReader` contract.
- `EventBus.stream()` opens a `ReadableStream` of the events published after it opened. Cancelling the stream ends the subscription. The `events.get` capability (`apps/api/src/capabilities/observability.ts`) serves it as `GET /v1/events` for the `admin` scope: `Accept: application/json` answers the recent events, `Accept: text/event-stream` follows them, and the MCP tool `events.watch` collects them for a short time.
