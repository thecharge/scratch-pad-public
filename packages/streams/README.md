# @platform/streams

Writers and readers for the bodies the API sends and receives as streams, built on the Web streams API (`ReadableStream`), so they work with back-pressure and with an aborted connection.

- `writeJson(document)` writes one JSON object to a stream, one top-level property per chunk; a property whose value is an async iterable is written as an array, one element per chunk. The first bytes leave before the last element is produced.
- `readJson(stream)` reads one JSON document. A body that ends inside the document is an incomplete-stream error; a complete body that is not JSON is an invalid-JSON error.
- `writeNdjson(items)` and `readNdjson(stream, schema)` write and read newline-delimited JSON. `readNdjson` yields each line as it arrives, validated against the schema, and an invalid line fails with the number of that line.
- `writeEvents(events)` and `readEvents(stream)` write and read Server-Sent Events frames (`event`, `id`, `data`). A comment frame is ignored; a stream that ends inside a frame is an incomplete-stream error. `writeEvents` starts with a `: connected` comment so the response headers leave at once, and it lets go of its source when the reader cancels.
- `iterate(stream)` turns a `ReadableStream` into an async iterable whose `return` cancels the stream even while a read waits.
- `drain(body, limit?)` reads and discards what is left of a request body, up to a limit (1 MiB), then cancels it, and returns the bytes seen. A missing, locked or broken body drains nothing and does not throw. The HTTP adapter calls it on every refusal so the next request on a kept-alive connection is answered normally.

Every failure is a `StreamError` carrying a message id and its parameters.
