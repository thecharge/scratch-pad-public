import { Database } from "bun:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PathSegment } from "@platform/constants";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema/index.ts";

export * from "./repositories.ts";
export { schema };

const MIGRATIONS_FOLDER = join(
  dirname(fileURLToPath(import.meta.url)),
  PathSegment.Parent,
  PathSegment.Migrations,
);

export async function createDatabase(path: string) {
  const sqlite = new Database(path);
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, sqlite };
}
