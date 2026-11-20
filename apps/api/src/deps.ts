import { createPageTokenCodec, RequestIdStore } from "@platform/aip";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PAGE_SECRET_BYTES,
  PathSegment,
  REINDEX_DEFAULT_STEP_MS,
  REQUEST_ID_TTL_MS,
} from "@platform/constants";
import { lazy } from "@platform/store";
import type { ApiDeps, AppSettings, Book, ObservabilityReader } from "@platform/types";

export async function createDeps(
  observability: ObservabilityReader,
  databasePath: string = PathSegment.InMemoryDatabase,
  now: () => Promise<Date> = async () => new Date(),
  reindexStepMs: number = REINDEX_DEFAULT_STEP_MS,
): Promise<ApiDeps> {
  const repositories = lazy(async () => {
    const { createDatabase, DrizzleBookRepository, DrizzleSettingsRepository } = await import(
      "@platform/db"
    );
    const { db } = await createDatabase(databasePath);
    return { books: new DrizzleBookRepository(db), settings: new DrizzleSettingsRepository(db) };
  });
  const codec = lazy(() =>
    createPageTokenCodec(crypto.getRandomValues(new Uint8Array(PAGE_SECRET_BYTES))),
  );
  return {
    observability,
    requests: new RequestIdStore({ ttlMs: REQUEST_ID_TTL_MS }),
    limits: { defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE },
    now,
    reindexStepMs,
    codec: {
      encode: async (offset, query) => (await codec()).encode(offset, query),
      decode: async (token, query) => (await codec()).decode(token, query),
    },
    books: {
      find: async (name: string) => (await repositories()).books.find(name),
      list: async (parent: string) => (await repositories()).books.list(parent),
      insert: async (book: Book) => (await repositories()).books.insert(book),
      save: async (book: Book, expectedEtag?: string) =>
        (await repositories()).books.save(book, expectedEtag),
      remove: async (name: string) => (await repositories()).books.remove(name),
    },
    settings: {
      read: async () => (await repositories()).settings.read(),
      write: async (settings: AppSettings) => (await repositories()).settings.write(settings),
    },
  };
}
