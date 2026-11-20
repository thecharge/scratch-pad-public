import {
  type BookState,
  CONFIG_ROW_ID,
  DEFAULT_BANNER_TEXT,
  DEFAULT_PAGE_SIZE,
  Separator,
  Text,
} from "@platform/constants";
import type { AppSettings, Book, BookRepository, SettingsRepository } from "@platform/types";
import { all } from "@platform/util";
import { and, eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema/index.ts";

async function toBook(row: typeof schema.books.$inferSelect): Promise<Book> {
  return {
    name: row.name,
    title: row.title,
    state: row.state as BookState,
    createTime: row.createTime,
    updateTime: row.updateTime,
    etag: row.etag,
    ...(row.author === null ? {} : { author: row.author }),
    ...(row.authorEmail === null ? {} : { authorEmail: row.authorEmail }),
    ...(row.deleteTime === null ? {} : { deleteTime: row.deleteTime }),
    ...(row.purgeTime === null ? {} : { purgeTime: row.purgeTime }),
  };
}

async function toRow(book: Book, parent: string): Promise<typeof schema.books.$inferSelect> {
  return {
    name: book.name,
    parent,
    title: book.title,
    author: book.author ?? null,
    authorEmail: book.authorEmail ?? null,
    state: book.state,
    createTime: book.createTime ?? new Date().toISOString(),
    updateTime: book.updateTime ?? new Date().toISOString(),
    deleteTime: book.deleteTime ?? null,
    purgeTime: book.purgeTime ?? null,
    etag: book.etag ?? Text.Empty,
  };
}

async function parentOf(name: string): Promise<string> {
  return name.split(Separator.Resource).slice(0, -2).join(Separator.Resource);
}

export class DrizzleBookRepository implements BookRepository {
  constructor(private readonly db: BunSQLiteDatabase<typeof schema>) {}

  async find(name: string): Promise<Book | undefined> {
    const rows = await this.db.select().from(schema.books).where(eq(schema.books.name, name));
    return rows[0] === undefined ? undefined : await toBook(rows[0]);
  }

  async list(parent: string): Promise<Book[]> {
    const rows = await this.db.select().from(schema.books).where(eq(schema.books.parent, parent));
    return all(rows.map((item) => async () => toBook(item)));
  }

  async insert(book: Book): Promise<void> {
    await this.db.insert(schema.books).values(await toRow(book, await parentOf(book.name)));
  }

  async save(book: Book, expectedEtag?: string): Promise<boolean> {
    const version = expectedEtag === undefined ? undefined : eq(schema.books.etag, expectedEtag);
    const changed = await this.db
      .update(schema.books)
      .set(await toRow(book, await parentOf(book.name)))
      .where(and(eq(schema.books.name, book.name), version))
      .returning({ name: schema.books.name });
    return changed.length > 0;
  }

  async remove(name: string): Promise<void> {
    await this.db.delete(schema.books).where(eq(schema.books.name, name));
  }
}

async function prepareSettingsRead(db: BunSQLiteDatabase<typeof schema>) {
  return db
    .select()
    .from(schema.appSettings)
    .where(eq(schema.appSettings.id, CONFIG_ROW_ID))
    .prepare();
}

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: BunSQLiteDatabase<typeof schema>) {}

  private statement?: Awaited<ReturnType<typeof prepareSettingsRead>>;

  async read(): Promise<AppSettings> {
    this.statement ??= await prepareSettingsRead(this.db);
    const rows = await this.statement.all();
    const row = rows[0];
    return {
      name: CONFIG_ROW_ID,
      bannerText: row?.bannerText ?? DEFAULT_BANNER_TEXT,
      pageSizeDefault: row?.pageSizeDefault ?? DEFAULT_PAGE_SIZE,
    };
  }

  async write(settings: AppSettings): Promise<void> {
    const values = {
      id: CONFIG_ROW_ID,
      bannerText: settings.bannerText,
      pageSizeDefault: settings.pageSizeDefault,
    };
    await this.db
      .insert(schema.appSettings)
      .values(values)
      .onConflictDoUpdate({ target: schema.appSettings.id, set: values });
  }
}
