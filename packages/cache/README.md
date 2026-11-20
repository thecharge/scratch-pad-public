# @platform/cache

`MemoryResponseCache` implements the pipeline's `ResponseCache`: bounded, TTL-based, and values are cloned in and out. `cacheHintFor(block)` gives the MCP `ttlMs` and `cacheScope`; the default is "do not reuse, private".
