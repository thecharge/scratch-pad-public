# @platform/kb-recorder

Turns end-to-end scenarios into documentation pages that are verified by construction. A scenario is a narrative (title, intent, steps). The runner starts the API with an isolated in-memory database and a test issuer, runs every step over both HTTP and MCP, and compares each outcome with what the step expects. Only when a whole scenario passes on both transports does the recorder write its page; a failing scenario writes nothing and fails the run.

- Captured exchanges are already masked by the pipeline for the caller's principal. The recorder then scrubs anything token-shaped (JWTs, bearer values, long opaque strings) so no credential reaches a page, and the `Authorization` header is never written.
- A step input may refer to the previous response with `@previous.<field>` (for example the operation name of a long-running call).
- `bun run kb:record` writes MDX into the docs content collection. `verify` records to a temporary directory and runs the secret scanner over the result.
