import type { PageLimits } from "../aip/page.ts";
import type { AppSettings, Book } from "../domain/book.ts";
import type { ObservabilityReader } from "../observability.ts";
import type { PageTokenCodec } from "./stores.ts";

export interface BookRepository {
  find(name: string): Promise<Book | undefined>;
  list(parent: string): Promise<Book[]>;
  insert(book: Book): Promise<void>;
  save(book: Book, expectedEtag?: string): Promise<boolean>;
  remove(name: string): Promise<void>;
}

export interface SettingsRepository {
  read(): Promise<AppSettings>;
  write(settings: AppSettings): Promise<void>;
}

export interface IdempotencyRunner {
  run<T>(scope: string, requestId: string | undefined, execute: () => Promise<T>): Promise<T>;
}

export interface ApiDeps {
  observability: ObservabilityReader;
  requests: IdempotencyRunner;
  books: BookRepository;
  settings: SettingsRepository;
  codec: PageTokenCodec;
  limits: PageLimits;
  now: () => Promise<Date>;
  reindexStepMs: number;
}
