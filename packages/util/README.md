# @platform/util

Shared helpers for the whole repository. `all(tasks, limit?)` is the only way to run tasks in parallel: it replaces `Promise.all`, which the `promise-all` check forbids.

- `tasks` is a list of functions that return a promise, so nothing starts before the util decides it may.
- At most `limit` tasks run at the same time. Without `limit` the value comes from `concurrencyLimit`, which reads the `CONCURRENCY_LIMIT` variable (declared in the config schema of `@platform/types`), or 8 (`DEFAULT_CONCURRENCY_LIMIT` in `@platform/constants`) when it is not set.
- `@platform/util/browser` exports the same `all` without the variable: its limit is the argument or the default of 8. It has no `process.env` and no config import, so the console bundle and `@platform/config` use it. The packages `util` and `config` have no dependency cycle: `config` depends on `util`, `util` depends only on `constants` and `types` (`check-package-graph.ts` checks it).
- The results keep the order of `tasks`.
- When a task rejects, no further task starts and `all` rejects with the first error once the tasks already running have ended.

```ts
import { all } from "@platform/util";

const bodies = await all(urls.map((url) => async () => (await fetch(url)).text()), 4);
```
