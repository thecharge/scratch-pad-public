export interface Page<T> {
  items: T[];
  nextPageToken: string;
}

export interface PageTokenCodec {
  encode(offset: number, query: unknown): Promise<string>;
  decode(token: string, query: unknown): Promise<number>;
}

export interface RequestIdStoreOptions {
  ttlMs: number;
  now?: () => number;
}

export interface StoredRequest {
  result: Promise<unknown>;
}

export interface MemoryCacheOptions {
  maxEntries?: number;
  now?: () => number;
}

export interface StoreOptions {
  maxEntries: number;
  ttlMs?: number;
  now?: () => number;
}

export interface StoreEntry<V> {
  value: V;
  expiresAt: number | undefined;
}

export interface KeyValueStore<V> {
  get(key: string): Promise<V | undefined>;
  set(key: string, value: V, ttlMs?: number): Promise<void>;
  update(
    key: string,
    change: (current: V | undefined) => V,
    ttlMs?: number | ((next: V) => number),
  ): Promise<V>;
  delete(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
  sweep(): Promise<void>;
}
