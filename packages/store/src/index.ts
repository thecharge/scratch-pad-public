import type { KeyValueStore, StoreEntry, StoreOptions } from "@platform/types";

export class BoundedStore<V> implements KeyValueStore<V> {
  private readonly entries = new Map<string, StoreEntry<V>>();
  private readonly now: () => number;

  constructor(private readonly options: StoreOptions) {
    this.now = options.now ?? Date.now;
  }

  async get(key: string): Promise<V | undefined> {
    return this.read(key);
  }

  async set(key: string, value: V, ttlMs?: number): Promise<void> {
    this.write(key, value, ttlMs);
  }

  async update(
    key: string,
    change: (current: V | undefined) => V,
    ttlMs?: number | ((next: V) => number),
  ): Promise<V> {
    const next = change(this.read(key));
    this.write(key, next, ttlMs instanceof Function ? ttlMs(next) : ttlMs);
    return next;
  }

  async delete(key: string): Promise<boolean> {
    return this.entries.delete(key);
  }

  async keys(): Promise<string[]> {
    await this.sweep();
    return [...this.entries.keys()];
  }

  async size(): Promise<number> {
    await this.sweep();
    return this.entries.size;
  }

  async sweep(): Promise<void> {
    const now = this.now();
    const expired = [...this.entries].filter(([, entry]) => this.isExpired(entry, now));
    for (const [key] of expired) {
      this.entries.delete(key);
    }
  }

  private isExpired(entry: StoreEntry<V>, now: number): boolean {
    return entry.expiresAt !== undefined && entry.expiresAt <= now;
  }

  private read(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (this.isExpired(entry, this.now())) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  private write(key: string, value: V, ttlMs: number | undefined): void {
    const ttl = ttlMs ?? this.options.ttlMs;
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: ttl === undefined ? undefined : this.now() + ttl,
    });
    this.evict();
  }

  private evict(): void {
    while (this.entries.size > this.options.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) {
        return;
      }
      this.entries.delete(oldest.value);
    }
  }
}

export function lazy<T>(factory: () => Promise<T> | T): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return async () => {
    pending ??= Promise.resolve().then(factory);
    return pending;
  };
}
export * from "./async-array.ts";
