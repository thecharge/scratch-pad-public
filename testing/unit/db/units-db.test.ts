import { afterAll } from "bun:test";
import { join } from "node:path";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll } from "@platform/test-scenarios";
import { createDatabase } from "../../../packages/db/src/index.ts";

afterAll(removeAll);

const count = (table: string) => async (opened: Awaited<ReturnType<typeof createDatabase>>) =>
  opened.sqlite.query(`select count(*) as n from ${table}`).get();
const tables = async (opened: Awaited<ReturnType<typeof createDatabase>>) =>
  opened.sqlite
    .query("select name from sqlite_master where type = 'table' and name = 'books'")
    .all();
const EMPTY_TABLE = { n: 0 };
const BOOKS_TABLE = [{ name: "books" }];
const directory = await makeDir();
const FILE = join(directory, "app.sqlite");
const MISSING_FOLDER = join(directory, "absent", "app.sqlite");
const IN_MEMORY = ":memory:";

unit(createDatabase, {
  positive: [
    positive(
      "an in-memory database has the books table, empty",
      [IN_MEMORY],
      seen(count("books"), EMPTY_TABLE),
    ),
    positive("the migrations create the books table", [IN_MEMORY], seen(tables, BOOKS_TABLE)),
    positive(
      "a file database has the settings table, empty",
      [FILE],
      seen(count("app_settings"), EMPTY_TABLE),
    ),
  ],
  negative: [
    negative("a path in a folder that does not exist cannot be opened", [MISSING_FOLDER], {
      name: "SQLiteError",
    }),
    negative("a folder is not a database file", [directory], { name: "SQLiteError" }),
  ],
});
