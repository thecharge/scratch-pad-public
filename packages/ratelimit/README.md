# @platform/ratelimit

`FixedWindowRateLimiter` implements the pipeline's `RateLimiter`. Exceeding the limit raises `RESOURCE_EXHAUSTED` with `retryAfterSeconds` in the `ErrorInfo` metadata; `retryAfterSeconds(error)` reads it for the `Retry-After` header. Expired windows are pruned.
