import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const books = sqliteTable(
  "books",
  {
    name: text("name").primaryKey(),
    parent: text("parent").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    authorEmail: text("author_email"),
    state: text("state").notNull(),
    createTime: text("create_time").notNull(),
    updateTime: text("update_time").notNull(),
    deleteTime: text("delete_time"),
    purgeTime: text("purge_time"),
    etag: text("etag").notNull(),
  },
  (table) => [index("books_parent_idx").on(table.parent)],
);

export const appSettings = sqliteTable("app_settings", {
  id: text("id").primaryKey(),
  bannerText: text("banner_text").notNull(),
  pageSizeDefault: integer("page_size_default").notNull(),
});
