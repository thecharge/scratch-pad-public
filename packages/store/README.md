# @platform/store

The only place in the codebase allowed to hold an in-process collection for the life of the process. Everything else that needs to remember something uses a `BoundedStore`, or builds a local collection inside the function that needs it. The `structure` check rejects `new Map`, `new Set`, `new WeakMap` and `new WeakSet` at module, class-field and constructor level anywhere else.

`BoundedStore` is asynchronous, has a mandatory `maxEntries` ceiling (least recently used entries are evicted first) and an optional time to live per entry. Expired entries are dropped on access, and `sweep()` drops them all at once. `update(key, change)` reads and writes in one step, so concurrent callers cannot interleave between the read and the write.

`filterAsync`, `flatMapAsync`, `someAsync`, `everyAsync`, `findAsync` and `reduceAsync` do what the array methods of the same name do when the callback is async. They run every callback at once and keep the order of the list; use them instead of passing an async callback to the array method, which treats every promise as true.

`lazy(factory)` runs a factory the first time it is needed and shares the result, for modules and resources that should not load at startup.
