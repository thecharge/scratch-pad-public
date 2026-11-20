import { CacheScope } from "@platform/constants";
import { BoundedStore } from "@platform/store";
import type { CacheBlock, CacheHint, MemoryCacheOptions, ResponseCache } from "@platform/types";

const DEFAULT_MAX_ENTRIES = 1000;

export class MemoryResponseCache implements ResponseCache {
  private readonly store: BoundedStore<unknown>;

  constructor(options: MemoryCacheOptions = {}) {
    this.store = new BoundedStore({
      maxEntries: options.maxEntries ?? DEFAULT_MAX_ENTRIES,
      ...(options.now === undefined ? {} : { now: options.now }),
    });
  }

  async get(key: string): Promise<unknown> {
    const value = await this.store.get(key);
    return value === undefined ? undefined : structuredClone(value);
  }

  async set(key: string, value: unknown, block: CacheBlock): Promise<void> {
    await this.store.set(key, structuredClone(value), block.ttlMs);
  }
}

export async function cacheHintFor(block: CacheBlock | undefined): Promise<CacheHint> {
  return block === undefined
    ? { ttlMs: 0, cacheScope: CacheScope.Private }
    : { ttlMs: block.ttlMs, cacheScope: block.scope };
}
