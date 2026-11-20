# @platform/telemetry

OpenTelemetry for the capability pipeline, from the main thread only (the OpenTelemetry JS project does not list Bun as a supported runtime, so there is no auto-instrumentation and no context manager). `instrument(invoke, deps)` wraps the pipeline and gives every capability call a span with the capability, transport, principal kind, status, cache outcome and policy outcome, increments a call counter, records a latency histogram and writes one log line carrying the trace and span ids. The line never includes input or output.

`startTelemetry(processors, readers)` builds the tracer and meter providers; export is optional and chosen by the caller (an exporter can be added without touching the pipeline). `shutdown()` flushes both providers and is called on SIGTERM.
