import { afterAll, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { migrationsMatchSchema } from "../../../tooling/scripts/check-migrations.ts";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

const PROBE = join(REPO_ROOT, "packages/db/src/schema/drift-probe.ts");
const PROBE_SOURCE = `export * from "./index.ts";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const probe = sqliteTable("probe", { id: text("id").primaryKey() });
`;

afterAll(async () => {
  await rm(PROBE, { force: true });
});

describe("migration drift gate", () => {
  test("the committed migrations match the schema", async () => {
    expect(await migrationsMatchSchema()).toBe(true);
  });

  test("a schema change without a migration is detected", async () => {
    await Bun.write(PROBE, PROBE_SOURCE);
    expect(await migrationsMatchSchema(PROBE)).toBe(false);
  });
});
