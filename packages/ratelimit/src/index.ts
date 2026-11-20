import {
  CanonicalCode,
  DEFAULT_STORE_MAX_ENTRIES,
  ErrorMetadataKey,
  ErrorReason,
  MessageId,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { BoundedStore } from "@platform/store";
import type { RateLimitBlock, RateLimiter, RateWindow } from "@platform/types";

const MS_PER_SECOND = 1000;

function exhausted(window: RateWindow, block: RateLimitBlock, now: number): ApiError {
  const seconds = Math.max(1, Math.ceil((window.startedAt + block.windowMs - now) / MS_PER_SECOND));
  return new ApiError(
    CanonicalCode.ResourceExhausted,
    ErrorReason.RateLimited,
    MessageId.RateLimited,
    { seconds },
    { [ErrorMetadataKey.RetryAfterSeconds]: String(seconds) },
  );
}

export class FixedWindowRateLimiter implements RateLimiter {
  private readonly windows: BoundedStore<RateWindow>;

  constructor(private readonly now: () => number = Date.now) {
    this.windows = new BoundedStore({ maxEntries: DEFAULT_STORE_MAX_ENTRIES, now: this.now });
  }

  async consume(key: string, block: RateLimitBlock): Promise<void> {
    const now = this.now();
    await this.windows.update(
      key,
      (current) => this.advance(current, block, now),
      (next) => next.startedAt + block.windowMs - now,
    );
  }

  private advance(current: RateWindow | undefined, block: RateLimitBlock, now: number): RateWindow {
    if (current === undefined) {
      return { startedAt: now, count: 1 };
    }
    if (current.count >= block.limit) {
      throw exhausted(current, block, now);
    }
    return { ...current, count: current.count + 1 };
  }
}

export async function retryAfterSeconds(error: ApiError): Promise<number | undefined> {
  const value = error.metadata[ErrorMetadataKey.RetryAfterSeconds];
  return value === undefined ? undefined : Number(value);
}
