# @platform/logger

A pino logger that writes JSON lines synchronously to stdout. There are no worker-thread transports: pino transports use worker threads, Bun's `worker_threads` support is partial, and a transport hang is reported upstream. Pretty printing is a development-time pipe.

The redaction list is not written here: pass `sensitivePaths(capabilities)` from `@platform/masking`, so a field that is masked in a response is also censored in logs. Each path is redacted at the top level and one level down.
