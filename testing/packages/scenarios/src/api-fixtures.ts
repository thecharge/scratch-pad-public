import {
  BookState,
  CONFIG_ROW_ID,
  DEFAULT_BANNER_TEXT,
  DEFAULT_PAGE_SIZE,
} from "@platform/constants";
import type { ApiDeps, AppSettings, Book } from "@platform/types";
import { createDeps } from "../../../../apps/api/src/deps.ts";
import { IDLE_OBSERVABILITY } from "../../../../apps/api/src/idle.ts";

export const FIXED_NOW = new Date("2026-01-02T03:04:05.000Z");
export const PUBLISHER_NAME = "publishers/p1";
export const OTHER_PUBLISHER_NAME = "publishers/p2";

export function bookName(id: string, publisher: string = PUBLISHER_NAME): string {
  return [publisher, "books", id].join("/");
}

export function sampleBook(id: string, changes: Partial<Book> = {}, publisher?: string): Book {
  return {
    name: bookName(id, publisher),
    title: `Title ${id}`,
    state: BookState.Active,
    createTime: FIXED_NOW.toISOString(),
    updateTime: FIXED_NOW.toISOString(),
    etag: `"etag-${id}"`,
    ...changes,
  };
}

export async function fakeDeps(
  seed: readonly Book[] = [],
  overrides: Partial<ApiDeps> = {},
): Promise<ApiDeps> {
  const rows = new Map(seed.map((book) => [book.name, book]));
  let settings: AppSettings = {
    name: CONFIG_ROW_ID,
    bannerText: DEFAULT_BANNER_TEXT,
    pageSizeDefault: DEFAULT_PAGE_SIZE,
  };
  return {
    ...(await createDeps(IDLE_OBSERVABILITY)),
    now: async () => FIXED_NOW,
    books: {
      find: async (name) => rows.get(name),
      list: async (parent) =>
        [...rows.values()].filter((book) => book.name.startsWith(`${parent}/`)),
      insert: async (book) => void rows.set(book.name, book),
      save: async (book, expectedEtag) => {
        if (expectedEtag !== undefined && rows.get(book.name)?.etag !== expectedEtag) {
          return false;
        }
        rows.set(book.name, book);
        return true;
      },
      remove: async (name) => void rows.delete(name),
    },
    settings: {
      read: async () => settings,
      write: async (next) => {
        settings = next;
      },
    },
    ...overrides,
  };
}
